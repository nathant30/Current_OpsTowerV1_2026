/**
 * Standardized Button Styles for OpsTower
 * Issue #7: UI/UX General Fixes - Button alignment and consistency
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Base button variants using CVA (Class Variance Authority)
 * Ensures consistent button styling across the entire application
 */
export const buttonVariants = cva(
  // Base styles applied to all buttons
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow',
        warning: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500 shadow-sm hover:shadow',
        outline: 'bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
        link: 'bg-transparent text-blue-600 hover:text-blue-800 hover:underline focus:ring-blue-500 p-0'
      },
      size: {
        xs: 'px-2.5 py-1.5 text-xs',
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg',
        icon: 'p-2'
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false
    }
  }
);

/**
 * Loading spinner component for buttons
 */
export const ButtonSpinner = ({ className }: { className?: string }) => (
  <svg
    className={cn('animate-spin h-4 w-4', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Icon button alignment helper
 */
export const iconButtonClasses = {
  left: 'flex-row',
  right: 'flex-row-reverse',
  iconOnly: 'p-2'
};

/**
 * Button group styles for grouped buttons
 */
export const buttonGroupClasses = {
  horizontal: 'inline-flex rounded-lg shadow-sm',
  vertical: 'inline-flex flex-col rounded-lg shadow-sm',
  child: 'first:rounded-l-lg last:rounded-r-lg',
  childVertical: 'first:rounded-t-lg last:rounded-b-lg'
};

export type ButtonVariants = VariantProps<typeof buttonVariants>;
