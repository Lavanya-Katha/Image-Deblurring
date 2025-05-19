"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, MoveLeft, Camera, Sparkles, ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; data: string } | null>(null);

  const checkImageContent = (imageElement: HTMLImageElement): Promise<boolean> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
      
      if (ctx) {
        ctx.drawImage(imageElement, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Calculate histogram for each channel
        const histR = new Array(256).fill(0);
        const histG = new Array(256).fill(0);
        const histB = new Array(256).fill(0);
        let totalPixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          histR[data[i]]++;
          histG[data[i + 1]]++;
          histB[data[i + 2]]++;
          totalPixels++;
        }
        
        // Calculate entropy for each channel
        const calculateEntropy = (hist: number[]) => {
          return hist.reduce((entropy, count) => {
            if (count === 0) return entropy;
            const p = count / totalPixels;
            return entropy - (p * Math.log2(p));
          }, 0);
        };
        
        const entropyR = calculateEntropy(histR);
        const entropyG = calculateEntropy(histG);
        const entropyB = calculateEntropy(histB);
        
        // Average entropy across channels
        const avgEntropy = (entropyR + entropyG + entropyB) / 3;
        
        // Calculate standard deviation
        let sum = 0;
        let sumSq = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          sum += gray;
          sumSq += gray * gray;
        }
        
        const mean = sum / totalPixels;
        const variance = (sumSq / totalPixels) - (mean * mean);
        const stdDev = Math.sqrt(variance);
        
        // Check for uniform regions
        let uniformRegionCount = 0;
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (Math.abs(gray - mean) < 15) {
            uniformRegionCount++;
          }
        }
        
        const uniformRatio = uniformRegionCount / totalPixels;
        
        // Image is considered empty or noisy if:
        // 1. Low entropy (little information)
        // 2. High uniform ratio (too many similar pixels)
        // 3. Low standard deviation (little variation)
        const isEmpty = avgEntropy < 3 || uniformRatio > 0.9 || stdDev < 20;
        resolve(!isEmpty);
      } else {
        resolve(false);
      }
    });
  };

  const validateImage = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const hasContent = await checkImageContent(img);
          
          // Only check if image has content
          if (!hasContent) {
            reject(new Error('The image appears to be empty or lacks meaningful content. Please upload a valid image.'));
            return;
          }
          
          resolve();
        } catch (error) {
          console.warn('Validation warning:', error);
          reject(new Error('Failed to validate image. Please try a different image.'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for validation'));
      img.src = URL.createObjectURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    // Check file format
    const allowedFormats = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedFormats.includes(file.type)) {
      alert('Only PNG and JPEG/JPG images are allowed.');
      return;
    }

    // Check file size (50MB = 50 * 1024 * 1024 bytes)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image size should not exceed 50MB.');
      return;
    }

    try {
      await validateImage(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        setUploadedFile({ name: file.name, data: base64String });
        localStorage.setItem('originalImage', base64String);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to validate image');
    }
  }, []);

  const handleProcess = () => {
    if (uploadedFile) {
      router.push('/process');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const file = rejectedFiles[0];
        if (file.errors[0]?.code === 'file-invalid-type') {
          alert('Only PNG and JPEG/JPG images are allowed.');
        } else if (file.errors[0]?.code === 'file-too-large') {
          alert('Image size should not exceed 50MB.');
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      try {
        await validateImage(file);
        
        const reader = new FileReader();
        reader.onload = () => {
          const imageData = reader.result as string;
          setUploadedFile({ name: file.name, data: imageData });
          localStorage.setItem('originalImage', imageData);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to validate image');
      }
    },
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false)
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file format
    const allowedFormats = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedFormats.includes(file.type)) {
      alert('Only PNG and JPEG/JPG images are allowed.');
      e.target.value = ''; // Reset input
      return;
    }

    // Check file size
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image size should not exceed 50MB.');
      e.target.value = ''; // Reset input
      return;
    }

    try {
      await validateImage(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setUploadedFile({ name: file.name, data: imageData });
        localStorage.setItem('originalImage', imageData);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to validate image');
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'url(/demo/bg.gif)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          width: '100vw',
          height: '100vh'
        }}
      />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <a href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
              <MoveLeft className="h-5 w-5" />
              Back to Home
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold mb-4">Upload Your Image</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a blurry image to enhance using our deep learning technology
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-12 transition-colors text-center relative overflow-hidden
                ${isDragActive ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10' : 'border-gray-300 dark:border-gray-700'}
                hover:border-purple-500 dark:hover:border-purple-500`}
            >
              <input {...getInputProps()} onChange={handleFileChange} />
              
              <motion.div
                initial={false}
                animate={{ scale: isDragActive ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
                className="relative z-10"
              >
                <div className="mb-4">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                </div>
                <p className="text-lg mb-2">
                  {isDragActive ? 'Drop your image here' : 'Drag & drop your image here'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  or click to browse
                </p>
                {uploadedFile && (
                  <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Uploaded: {uploadedFile.name}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>

            {uploadedFile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-6 text-center"
              >
                <button
                  onClick={handleProcess}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-all transform hover:scale-105"
                >
                  <Sparkles className="h-5 w-5" />
                  Process Image
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
} 