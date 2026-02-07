import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

    const variants = {
      default: 'border-transparent bg-blue-600 text-white',
      secondary: 'border-transparent bg-gray-200 text-gray-900',
      destructive: 'border-transparent bg-red-600 text-white',
      outline: 'text-gray-900',
      success: 'border-transparent bg-green-600 text-white',
      warning: 'border-transparent bg-yellow-600 text-white'
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
