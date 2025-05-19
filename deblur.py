import sys 
import os
import numpy as np
import cv2
import tensorflow as tf
load_model = tf.keras.models.load_model
Layer = tf.keras.layers.Layer
Lambda = tf.keras.layers.Lambda
K = tf.keras.backend
get_custom_objects = tf.keras.utils.get_custom_objects
import keras


# Enable unsafe deserialization

keras.config.enable_unsafe_deserialization()

# Constants for image processing
IMG_HEIGHT = 256
IMG_WIDTH = 256
AUTOTUNE = tf.data.AUTOTUNE

@tf.keras.utils.register_keras_serializable()
class ReflectionPadding2D(tf.keras.layers.Layer):
    def __init__(self, padding=(1, 1), **kwargs):
        self.padding = tuple(padding)
        self.input_spec = [tf.keras.layers.InputSpec(ndim=4)]
        super(ReflectionPadding2D, self).__init__(**kwargs)

    def compute_output_shape(self, s):
        return (s[0], s[1] + 2 * self.padding[0], s[2] + 2 * self.padding[1], s[3])

    def call(self, x, mask=None):
        w_pad, h_pad = self.padding
        return tf.pad(x, [[0, 0], [h_pad, h_pad], [w_pad, w_pad], [0, 0]], 'REFLECT')

    def get_config(self):
        config = {'padding': self.padding}
        base_config = super(ReflectionPadding2D, self).get_config()
        return dict(list(base_config.items()) + list(config.items()))

# Register custom layer
get_custom_objects().update({"ReflectionPadding2D": ReflectionPadding2D})

# Define all necessary loss functions
def perceptual_loss(y_true, y_pred):
    return K.mean(K.square(y_pred - y_true))

def wasserstein_loss(y_true, y_pred):
    return K.mean(y_true * y_pred)

def edge_loss(y_true, y_pred):
    return K.mean(K.abs(y_pred - y_true))

def generator_loss(y_true, y_pred):
    return K.mean(K.square(y_pred - y_true))

def discriminator_loss(y_true, y_pred):
    return K.mean(y_true * y_pred)

def gradient_penalty(y_true, y_pred):
    return K.mean(K.square(y_pred - y_true))

# Dummy function for Lambda layers
def custom_lambda(x):
    return x / 2

@tf.function
def load_and_preprocess_image(image_path):
    """
    Load and preprocess image using TensorFlow operations to match training pipeline.
    """
    # Read the image file
    image = tf.io.read_file(image_path)
    
    # Decode PNG/JPEG
    image = tf.image.decode_png(image, channels=3)
    
    # Convert to float32
    image = tf.cast(image, tf.float32)
    
    # Resize using TensorFlow ops
    image = tf.image.resize(image, [IMG_HEIGHT, IMG_WIDTH], method=tf.image.ResizeMethod.AREA)
    
    # Normalize to [-1, 1]
    image = (image / 127.5) - 1
    
    return image

def preprocess_image(image_path):
    """
    Preprocess image following the exact same steps as training:
    1. Load and decode image using TensorFlow ops
    2. Resize using TF resize with AREA method
    3. Normalize to [-1, 1]
    4. Create TF dataset
    """
    # Get original size first
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image from {image_path}")
    original_size = img.shape[:2]
    
    # Convert to RGB (ensure consistency with training)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Create a TensorFlow dataset
    ds = tf.data.Dataset.from_tensor_slices([image_path])
    ds = ds.map(load_and_preprocess_image, num_parallel_calls=AUTOTUNE)
    ds = ds.batch(1).prefetch(AUTOTUNE)
    
    # Get the preprocessed image tensor
    for img_tensor in ds:
        return img_tensor, original_size

def postprocess_image(img, original_size=None):
    """
    Postprocess the model output:
    1. Convert from [-1, 1] range back to [0, 255]
    2. Resize to original dimensions if provided
    3. Convert back to RGB before saving
    """
    # Ensure we're working with numpy array
    if tf.is_tensor(img):
        img = img.numpy()
    
    # Remove batch dimension
    img = np.squeeze(img)
    
    # Convert from [-1, 1] range back to [0, 255]
    img = (img + 1) * 127.5
    
    # Clip values to valid range
    img = np.clip(img, 0, 255).astype(np.uint8)
    
    # Resize back to original size if provided
    if original_size is not None:
        img = tf.image.resize(
            tf.convert_to_tensor(img)[tf.newaxis, ...],
            [original_size[0], original_size[1]],
            method=tf.image.ResizeMethod.LANCZOS3
        )[0].numpy()
    
    # Convert back to RGB before saving
    img = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2BGR)
    return img

def main():
    if len(sys.argv) != 3:
        print("Usage: python deblur.py <input_path> <output_path>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        # Load the model with custom objects
        model_path = os.path.join(os.path.dirname(__file__), 'generator_model_270.keras')
        
        # Print debug information
        print(f"Loading model from: {model_path}")
        print(f"Model file exists: {os.path.exists(model_path)}")

        # Define all custom objects
        custom_objects = {
            "ReflectionPadding2D": ReflectionPadding2D,
            "perceptual_loss": perceptual_loss,
            "wasserstein_loss": wasserstein_loss,
            "edge_loss": edge_loss,
            "generator_loss": generator_loss,
            "discriminator_loss": discriminator_loss,
            "gradient_penalty": gradient_penalty,
            "Lambda": Lambda,
            "custom_lambda": custom_lambda
        }

        # Load the model
        model = load_model(model_path, custom_objects=custom_objects, compile=False)
        print("Model loaded successfully")

        # Preprocess input image
        input_img, original_size = preprocess_image(input_path)

        # Run inference
        output_img = model(input_img, training=False)

        # Postprocess and save result
        final_img = postprocess_image(output_img[0], original_size)
        cv2.imwrite(output_path, final_img)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
