'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

interface ProfilePhotoUploadProps {
  currentPhoto?: string;
  onPhotoUpdate: (photoUrl: string) => Promise<void>;
  userName: string;
  maxSizeKB?: number;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhoto,
  onPhotoUpdate,
  userName,
  maxSizeKB = 5120 // 5MB default
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPG, PNG, or WebP)';
    }

    // Check file size
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB > maxSizeKB) {
      return `File size must be less than ${maxSizeKB / 1024}MB`;
    }

    return null;
  };

  const processFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);
    setSuccess(false);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Simulate upload with compression
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, this would upload to storage service
      const photoUrl = URL.createObjectURL(file);
      await onPhotoUpdate(photoUrl);

      setSuccess(true);
      logger.info('Profile photo updated successfully', undefined, {
        component: 'ProfilePhotoUpload',
        fileName: file.name
      });

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload photo';
      setError(errorMsg);
      setPreview(null);
      logger.error('Photo upload failed', { error: err });
    } finally {
      setIsUploading(false);
      setDragActive(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const displayPhoto = preview || currentPhoto || '';
  const hasPhoto = Boolean(displayPhoto);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Photo Preview */}
      <div className="relative">
        <div
          className={`relative w-32 h-32 rounded-full overflow-hidden border-4 transition-all ${
            dragActive ? 'border-blue-500 scale-105' : 'border-gray-200'
          } ${hasPhoto ? '' : 'bg-gray-100'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {hasPhoto ? (
            <img
              src={displayPhoto}
              alt={`${userName}'s profile photo`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNDAiIHI9IjE4IiBmaWxsPSIjOUI5QkE1Ii8+CjxwYXRoIGQ9Ik0zMCA5MEM0MCA3NCA1MCA3NCA2MCA3NEg2MEM3MCA3NCA4MCA3NCA5MCA5MEgzMFoiIGZpbGw9IiM5QjlCQTUiLz4KPC9zdmc+';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-400" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Upload Button Overlay */}
        <button
          onClick={handleClick}
          onKeyDown={handleKeyPress}
          disabled={isUploading}
          className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Upload profile photo"
          title="Upload profile photo"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Profile photo file input"
        />
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Click or drag to upload
        </p>
        <p className="text-xs text-gray-500 mt-1">
          JPG, PNG, or WebP (max {maxSizeKB / 1024}MB)
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div
          className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200"
          role="alert"
          aria-live="polite"
        >
          <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">Photo updated successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-700 hover:text-red-800 underline mt-1"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Accessibility: Loading State Announcement */}
      {isUploading && (
        <div className="sr-only" role="status" aria-live="polite">
          Uploading profile photo, please wait...
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoUpload;
