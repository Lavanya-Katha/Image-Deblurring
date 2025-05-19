"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Image as ImageIcon, Camera } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section with Demo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12">
            {/* Text Content */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Deep Learning based
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                  Image Deblurring
                </span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Restore sharpness to blurry images using our Deep Learning Based deblurring model. Designed to reduce motion blur and enhance image clarity effectively.
              </p>
              <div className="flex gap-4">
                <Link 
                  href="/upload" 
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-full text-lg font-medium transition-all hover:scale-105"
                >
                  Deblur an Image
                  <Sparkles className="h-5 w-5" />
                </Link>
              </div>
            </motion.div>

            {/* Demo Image Section */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10"></div>
                <div className="relative h-full">
                  {/* Split View Container */}
                  <div className="absolute inset-0 flex">
                    {/* Blurred Side */}
                    <div className="w-1/2 h-full relative overflow-hidden">
                      <Image
                        src="/demo/blurred-demo.jpg"
                        alt="Blurred Image"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        Before
                      </div>
          </div>
                    {/* Deblurred Side */}
                    <div className="w-1/2 h-full relative overflow-hidden">
            <Image
                        src="/demo/deblurred-demo.jpg"
                        alt="Deblurred Image"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        After
                      </div>
                    </div>
                    {/* Divider Line */}
                    <div className="absolute inset-y-0 left-1/2 w-1 bg-white/80 transform -translate-x-1/2">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                          <ArrowRight className="h-5 w-5 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                className="absolute -top-4 -right-4 w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 360]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </motion.div>
              <motion.div
                className="absolute -bottom-4 -left-4 w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -360]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
