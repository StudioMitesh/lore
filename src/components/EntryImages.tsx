'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  Download,
  Share,
  ImageIcon,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EntryImagesProps {
  images: string[];
  title?: string;
  className?: string;
  showCount?: boolean;
  maxDisplayImages?: number;
  aspectRatio?: 'square' | 'video' | 'auto';
  enableLightbox?: boolean;
  enableDownload?: boolean;
  enableShare?: boolean;
  onImageClick?: (imageUrl: string, index: number) => void;
}

export function EntryImages({
  images,
  title = 'Entry Photos',
  className,
  showCount = true,
  maxDisplayImages = 6,
  aspectRatio = 'auto',
  enableLightbox = true,
  enableDownload = false,
  enableShare = false,
  onImageClick,
}: EntryImagesProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  if (!images || images.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 border-2 border-dashed border-gold/30 rounded-lg bg-parchment/50',
          className
        )}
      >
        <ImageIcon className="h-12 w-12 text-gold/50 mb-4" />
        <p className="text-deepbrown/70 text-center mb-2">No photos available</p>
        <p className="text-sm text-deepbrown/50 text-center">
          Photos will appear here when added to this entry
        </p>
      </div>
    );
  }

  const displayImages = images.slice(0, maxDisplayImages);
  const remainingCount = images.length - maxDisplayImages;

  const handleImageLoad = (index: number) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleImageError = (index: number) => {
    setFailedImages((prev) => new Set(prev).add(index));
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleImageClick = (imageUrl: string, index: number) => {
    if (onImageClick) {
      onImageClick(imageUrl, index);
    } else if (enableLightbox) {
      setCurrentImageIndex(index);
      setIsLightboxOpen(true);
    }
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    } else {
      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
  };

  const downloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const shareImage = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: imageUrl,
        });
      } catch (error) {
        console.error('Failed to share image:', error);
      }
    } else {
      navigator.clipboard.writeText(imageUrl);
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'video':
        return 'aspect-video';
      default:
        return 'aspect-[4/3]';
    }
  };

  if (images.length === 1) {
    return (
      <div className={cn('relative group', className)}>
        <div
          className={cn(
            'relative overflow-hidden rounded-lg border border-gold/20',
            getAspectRatioClass()
          )}
        >
          {loadingImages.has(0) && (
            <div className="absolute inset-0 flex items-center justify-center bg-parchment/80">
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
            </div>
          )}

          {failedImages.has(0) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-parchment/80">
              <ImageIcon className="h-8 w-8 text-gold/50 mb-2" />
              <p className="text-sm text-deepbrown/70">Failed to load image</p>
            </div>
          ) : (
            <img
              src={images[0]}
              alt={`${title} - Image 1`}
              className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
              onLoad={() => handleImageLoad(0)}
              onError={() => handleImageError(0)}
              onClick={() => handleImageClick(images[0], 0)}
            />
          )}

          {showCount && (
            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
              1 photo
            </div>
          )}
        </div>
      </div>
    );
  }

  const gridClass =
    images.length === 2 ? 'grid-cols-2' : images.length === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <>
      <div className={cn('relative', className)}>
        <div className={cn('grid gap-2', gridClass)}>
          {displayImages.map((imageUrl, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                'relative group overflow-hidden rounded-lg border border-gold/20 cursor-pointer',
                getAspectRatioClass(),
                index === 0 && images.length > 2 ? 'col-span-2 row-span-2' : ''
              )}
              onClick={() => handleImageClick(imageUrl, index)}
            >
              {loadingImages.has(index) && (
                <div className="absolute inset-0 flex items-center justify-center bg-parchment/80 z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-gold" />
                </div>
              )}

              {failedImages.has(index) ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-parchment/80">
                  <ImageIcon className="h-6 w-6 text-gold/50 mb-1" />
                  <p className="text-xs text-deepbrown/70">Failed to load</p>
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt={`${title} - Image ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                />
              )}

              {index === maxDisplayImages - 1 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Plus className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">+{remainingCount} more</p>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ZoomIn className="h-6 w-6 text-white" />
              </div>

              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                {index + 1}
              </div>
            </motion.div>
          ))}
        </div>

        {showCount && images.length > 1 && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 bg-black/50 text-white border-none"
          >
            {images.length} photos
          </Badge>
        )}
      </div>

      {enableLightbox && (
        <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
          <DialogContent className="max-w-7xl w-full h-full max-h-screen p-0 bg-black/95 border-none">
            <div className="relative w-full h-full flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-20 text-white hover:bg-white/20"
                onClick={() => setIsLightboxOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>

              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
                    onClick={() => navigateImage('prev')}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
                    onClick={() => navigateImage('next')}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              <div className="absolute top-4 left-4 z-20 flex gap-2">
                {enableDownload && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => downloadImage(images[currentImageIndex])}
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                )}
                {enableShare && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => shareImage(images[currentImageIndex])}
                  >
                    <Share className="h-5 w-5" />
                  </Button>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={images[currentImageIndex]}
                  alt={`${title} - Image ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/50 text-white px-4 py-2 rounded-full">
                {currentImageIndex + 1} / {images.length}
              </div>

              {images.length > 1 && images.length <= 10 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 max-w-full overflow-x-auto">
                  {images.map((imageUrl, index) => (
                    <button
                      key={index}
                      className={cn(
                        'w-12 h-12 rounded border-2 overflow-hidden flex-shrink-0 transition-all',
                        index === currentImageIndex
                          ? 'border-white'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      )}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img
                        src={imageUrl}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {images.length > 1 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 text-white/70 text-sm">
                  Use arrow keys to navigate
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
