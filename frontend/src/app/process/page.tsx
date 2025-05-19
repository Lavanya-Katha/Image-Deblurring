"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Download, RefreshCw, ZoomIn, ZoomOut, Share2, MoveLeft, ArrowLeft, RotateCcw, Camera, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

export default function ProcessPage() {
  const router = useRouter();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportFormat, setExportFormat] = useState<'PNG' | 'JPEG'>('PNG');
  const [customFilename, setCustomFilename] = useState('');
  
  // Separate zoom and position for each image
  const [blurredPosition, setBlurredPosition] = useState<ImagePosition>({ x: 0, y: 0, scale: 1 });
  const [deblurredPosition, setDeblurredPosition] = useState<ImagePosition>({ x: 0, y: 0, scale: 1 });
  
  // Refs for drag functionality
  const blurredDragRef = useRef<{ isDragging: boolean; startX: number; startY: number }>({ isDragging: false, startX: 0, startY: 0 });
  const deblurredDragRef = useRef<{ isDragging: boolean; startX: number; startY: number }>({ isDragging: false, startX: 0, startY: 0 });

  useEffect(() => {
    const storedImage = localStorage.getItem('originalImage');
    if (!storedImage) {
      router.push('/upload');
      return;
    }
    setOriginalImage(storedImage);
    processImage(storedImage);
  }, [router]);

  const processImage = async (imageData: string) => {
    try {
      setIsProcessing(true);
      
      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('image', blob);

      const apiResponse = await fetch('/api/deblur', {
        method: 'POST',
        body: formData,
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.error + (data.details ? `\n\nDetails: ${data.details}` : ''));
      }

      if (!data.processedImage) {
        throw new Error('No processed image received from the model');
      }

      setProcessedImage(`data:image/jpeg;base64,${data.processedImage}`);
    } catch (error) {
      console.error('Error processing image:', error);
      alert(error instanceof Error ? error.message : 'Failed to process image. Please try again.');
      router.push('/upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleZoom = (
    e: React.WheelEvent<HTMLDivElement>,
    setPosition: React.Dispatch<React.SetStateAction<ImagePosition>>,
    currentPosition: ImagePosition
  ) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY;
      const zoomFactor = 0.1;
      const newScale = delta > 0 ? 
        Math.max(0.1, currentPosition.scale - zoomFactor) : 
        Math.min(3, currentPosition.scale + zoomFactor);
      
      setPosition(prev => ({
        ...prev,
        scale: newScale
      }));
    }
  };

  const handleImageWheel = (e: WheelEvent, isBlurred: boolean) => {
    e.preventDefault();
    
    const target = e.currentTarget as HTMLElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const deltaY = e.deltaY;
    const scaleChange = deltaY > 0 ? 0.9 : 1.1;

    if (isBlurred) {
      const newScale = Math.min(Math.max(blurredPosition.scale * scaleChange, 0.5), 3);
      setBlurredPosition({ ...blurredPosition, scale: newScale });
    } else {
      const newScale = Math.min(Math.max(deblurredPosition.scale * scaleChange, 0.5), 3);
      setDeblurredPosition({ ...deblurredPosition, scale: newScale });
    }
  };

  const handleMouseDown = (e: React.MouseEvent, isBlurred: boolean) => {
    const dragRef = isBlurred ? blurredDragRef : deblurredDragRef;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX - (isBlurred ? blurredPosition.x : deblurredPosition.x),
      startY: e.clientY - (isBlurred ? blurredPosition.y : deblurredPosition.y),
    };
  };

  const handleMouseMove = (e: React.MouseEvent, isBlurred: boolean) => {
    const dragRef = isBlurred ? blurredDragRef : deblurredDragRef;
    if (!dragRef.current.isDragging) return;

    const newX = e.clientX - dragRef.current.startX;
    const newY = e.clientY - dragRef.current.startY;
    
    requestAnimationFrame(() => {
      if (isBlurred) {
        setBlurredPosition(prev => ({ ...prev, x: newX, y: newY }));
      } else {
        setDeblurredPosition(prev => ({ ...prev, x: newX, y: newY }));
      }
    });
  };

  const handleMouseUp = (isBlurred: boolean) => {
    const dragRef = isBlurred ? blurredDragRef : deblurredDragRef;
    dragRef.current.isDragging = false;
  };

  const resetPositions = () => {
    setBlurredPosition({ x: 0, y: 0, scale: 1 });
    setDeblurredPosition({ x: 0, y: 0, scale: 1 });
  };

  const handleDownload = async () => {
    if (!processedImage) return;
    
    if (showExportOptions) {
      const link = document.createElement('a');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const filename = customFilename || `deblurred_${Date.now()}`;
        const mimeType = exportFormat === 'PNG' ? 'image/png' : 'image/jpeg';
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = `${filename}.${exportFormat.toLowerCase()}`;
            link.click();
            URL.revokeObjectURL(url);
          }
        }, mimeType);
      };
      
      img.src = processedImage;
    } else {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = `deblurred_${Date.now()}.png`;
      link.click();
    }
  };

  const handleShare = async () => {
    if (!processedImage) return;
    
    try {
      if (navigator.share) {
        const blob = await fetch(processedImage).then(r => r.blob());
        const file = new File([blob], 'deblurred-image.jpg', { type: 'image/jpeg' });
        await navigator.share({
          title: 'Deblurred Image',
          files: [file]
        });
      } else {
        alert('Sharing is not supported on this device/browser');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Prevent default zoom behavior on the page
  useEffect(() => {
    const preventDefault = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('wheel', preventDefault, { passive: false });
    return () => document.removeEventListener('wheel', preventDefault);
  }, []);

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
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link 
                href="/upload"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Upload
              </Link>
            </motion.div>
            <motion.button
              onClick={resetPositions}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw className="h-5 w-5" />
              Reset View
            </motion.button>
          </div>
        </div>

        {/* Image Processing Area */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Blurred Image */}
          <div className="space-y-2 relative">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium">Blurred Image</h2>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => {
                    const newScale = Math.min(blurredPosition.scale * 1.2, 3);
                    setBlurredPosition({ ...blurredPosition, scale: newScale });
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ZoomIn className="h-5 w-5" />
                </motion.button>
                <motion.button
                  onClick={() => {
                    const newScale = Math.max(blurredPosition.scale * 0.8, 0.5);
                    setBlurredPosition({ ...blurredPosition, scale: newScale });
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ZoomOut className="h-5 w-5" />
                </motion.button>
                <span className="text-sm text-gray-500">{Math.round(blurredPosition.scale * 100)}%</span>
              </div>
            </div>
            <motion.div 
              className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 cursor-move shadow-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              onMouseDown={(e) => handleMouseDown(e, true)}
              onMouseMove={(e) => handleMouseMove(e, true)}
              onMouseUp={() => handleMouseUp(true)}
              onMouseLeave={() => handleMouseUp(true)}
              onWheel={(e) => handleZoom(e, setBlurredPosition, blurredPosition)}
              style={{ touchAction: 'none' }}
            >
              {originalImage && (
                <div 
                  className="absolute inset-0"
                  style={{
                    transform: `translate(${blurredPosition.x}px, ${blurredPosition.y}px) scale(${blurredPosition.scale})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <Image
                    src={originalImage}
                    alt="Original"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* Deblurred Image */}
          <div className="space-y-2 relative">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium">Deblurred Image</h2>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => {
                    const newScale = Math.min(deblurredPosition.scale * 1.2, 3);
                    setDeblurredPosition({ ...deblurredPosition, scale: newScale });
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ZoomIn className="h-5 w-5" />
                </motion.button>
                <motion.button
                  onClick={() => {
                    const newScale = Math.max(deblurredPosition.scale * 0.8, 0.5);
                    setDeblurredPosition({ ...deblurredPosition, scale: newScale });
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ZoomOut className="h-5 w-5" />
                </motion.button>
                <span className="text-sm text-gray-500">{Math.round(deblurredPosition.scale * 100)}%</span>
              </div>
            </div>
            <motion.div 
              className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 cursor-move shadow-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onMouseDown={(e) => handleMouseDown(e, false)}
              onMouseMove={(e) => handleMouseMove(e, false)}
              onMouseUp={() => handleMouseUp(false)}
              onMouseLeave={() => handleMouseUp(false)}
              onWheel={(e) => handleZoom(e, setDeblurredPosition, deblurredPosition)}
              style={{ touchAction: 'none' }}
            >
              {processedImage && (
                <div 
                  className="absolute inset-0"
                  style={{
                    transform: `translate(${deblurredPosition.x}px, ${deblurredPosition.y}px) scale(${deblurredPosition.scale})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.1s ease-out'
                  }}
                >
                  <Image
                    src={processedImage}
                    alt="Enhanced"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                  />
                </div>
              )}
              
              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-primary font-medium">Processing...</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          className="flex justify-end gap-4 mt-8 max-w-6xl mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.button
            onClick={() => setShowExportOptions(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-full text-lg font-medium transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="h-5 w-5" />
            Download
          </motion.button>
          <motion.button
            onClick={handleShare}
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-3 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Share2 className="h-5 w-5" />
            Share
          </motion.button>
        </motion.div>

        {/* Export Options Modal */}
        {showExportOptions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Export Options</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'PNG' | 'JPEG')}
                    className="w-full p-2 border rounded dark:bg-gray-700"
                  >
                    <option value="PNG">PNG</option>
                    <option value="JPEG">JPEG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Filename</label>
                  <input
                    type="text"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder="Enter filename"
                    className="w-full p-2 border rounded dark:bg-gray-700"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowExportOptions(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleDownload();
                      setShowExportOptions(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                  >
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 