/**
 * Standardized Loading States for OpsTower
 * Issue #7: UI/UX General Fixes - Loading state consistency
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

/**
 * Standard Loading Spinner
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  label = 'Loading...'
}) => {
  return (
    <div className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <Loader2
        className={cn('animate-spin text-blue-600', sizeClasses[size], className)}
        aria-hidden="true"
      />
      {label && <span className="text-sm text-gray-600">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
};

/**
 * Full Page Loading Overlay
 */
export const LoadingOverlay: React.FC<{
  message?: string;
  transparent?: boolean;
}> = ({ message = 'Loading...', transparent = false }) => {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        transparent ? 'bg-white/80 backdrop-blur-sm' : 'bg-gray-50'
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-600 font-medium">{message}</p>
        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Cards
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6 animate-pulse', className)}>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
};

/**
 * Skeleton Loader for Tables
 */
export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className="h-3 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b border-gray-200 p-4 last:border-b-0">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <div key={colIndex} className="h-3 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton Loader for Text
 */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className
}) => {
  return (
    <div className={cn('space-y-2 animate-pulse', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-3 bg-gray-200 rounded',
            i === lines - 1 ? 'w-4/5' : 'w-full'
          )}
        ></div>
      ))}
    </div>
  );
};

/**
 * Loading Button State
 */
export const LoadingButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}> = ({ loading, children, loadingText, className, disabled, onClick, type = 'button' }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {loading ? loadingText || 'Loading...' : children}
    </button>
  );
};

/**
 * Progress Bar
 */
export const ProgressBar: React.FC<{
  value: number;
  max?: number;
  className?: string;
  label?: string;
  showPercentage?: boolean;
}> = ({ value, max = 100, className, label, showPercentage = false }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-600">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-in-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Inline Loading State for Sections
 */
export const InlineLoader: React.FC<{
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ message = 'Loading...', size = 'md' }) => {
  const sizeMap = {
    sm: { spinner: 'w-4 h-4', text: 'text-sm' },
    md: { spinner: 'w-6 h-6', text: 'text-base' },
    lg: { spinner: 'w-8 h-8', text: 'text-lg' }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8" role="status" aria-live="polite">
      <Loader2 className={cn('animate-spin text-blue-600 mb-3', sizeMap[size].spinner)} aria-hidden="true" />
      <p className={cn('text-gray-600', sizeMap[size].text)}>{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
};

/**
 * Dots Loading Indicator
 */
export const DotsLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex items-center gap-1', className)} role="status" aria-live="polite">
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
      <span className="sr-only">Loading</span>
    </div>
  );
};
