"use client";

import { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface ImageUploaderProps {
  maxImages: number;
  onImagesChange: (files: File[]) => void;
  existingImages?: string[];
  onRemoveExisting?: (url: string) => void;
}

export default function ImageUploader({
  maxImages,
  onImagesChange,
  existingImages = [],
  onRemoveExisting
}: ImageUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, and WebP are allowed.';
    }

    // Check file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size exceeds 5MB limit.';
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newErrors: string[] = [];
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    // Check total count
    const totalCount = files.length + existingImages.length + selectedFiles.length;
    if (totalCount > maxImages) {
      setErrors([`Maximum ${maxImages} images allowed`]);
      return;
    }

    selectedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === validFiles.length) {
            setPreviews([...previews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    } else {
      setErrors([]);
    }

    const updatedFiles = [...files, ...validFiles];
    setFiles(updatedFiles);
    onImagesChange(updatedFiles);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    setFiles(newFiles);
    setPreviews(newPreviews);
    onImagesChange(newFiles);
    setErrors([]);
  };

  const removeExisting = (url: string) => {
    if (onRemoveExisting) {
      onRemoveExisting(url);
    }
  };

  const totalImages = existingImages.length + files.length;
  const canAddMore = totalImages < maxImages;

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {canAddMore && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors flex flex-col items-center gap-2 text-gray-600"
          >
            <Upload size={24} />
            <span className="text-sm font-medium">
              Upload Images ({totalImages}/{maxImages})
            </span>
            <span className="text-xs text-gray-500">
              JPEG, PNG, WebP • Max 5MB each
            </span>
          </button>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          {errors.map((error, index) => (
            <p key={index} className="text-red-600 text-xs">{error}</p>
          ))}
        </div>
      )}

      {/* Image Previews */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Existing Images */}
        {existingImages.map((url, index) => (
          <div key={`existing-${index}`} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
              <Image
                src={url}
                alt={`Existing ${index + 1}`}
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => removeExisting(url)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
            <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Existing
            </span>
          </div>
        ))}

        {/* New Images */}
        {previews.map((preview, index) => (
          <div key={`new-${index}`} className="relative group">
            <div className="aspect-square rounded-lg overflow-hidden border-2 border-green-200 bg-gray-50">
              <Image
                src={preview}
                alt={`Preview ${index + 1}`}
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => removeFile(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
            <span className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
              New
            </span>
          </div>
        ))}
      </div>

      {totalImages === 0 && (
        <div className="text-center py-8 text-gray-400">
          <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images uploaded yet</p>
        </div>
      )}
    </div>
  );
}
