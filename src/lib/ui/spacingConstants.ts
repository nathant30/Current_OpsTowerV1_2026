/**
 * Standardized Spacing Constants for OpsTower
 * Issue #7: UI/UX General Fixes - Consistent spacing throughout
 *
 * Use these constants instead of arbitrary Tailwind spacing values
 * to ensure consistency across the application.
 */

export const spacing = {
  // Component Padding
  componentPadding: {
    xs: 'p-2',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12'
  },

  // Card/Section Spacing
  cardPadding: {
    mobile: 'p-4',
    tablet: 'sm:p-6',
    desktop: 'lg:p-8'
  },

  // Gap Between Elements
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  },

  // Stack Spacing (vertical)
  stack: {
    xs: 'space-y-1',
    sm: 'space-y-2',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8'
  },

  // Inline Spacing (horizontal)
  inline: {
    xs: 'space-x-1',
    sm: 'space-x-2',
    md: 'space-x-4',
    lg: 'space-x-6',
    xl: 'space-x-8'
  },

  // Section Margins
  section: {
    top: 'mt-6 sm:mt-8 lg:mt-12',
    bottom: 'mb-6 sm:mb-8 lg:mb-12',
    both: 'my-6 sm:my-8 lg:my-12'
  },

  // Container Padding (responsive)
  container: 'px-4 sm:px-6 lg:px-8',

  // Form Field Spacing
  formField: {
    gap: 'space-y-4',
    labelMargin: 'mb-2'
  }
} as const;

/**
 * Border Radius Constants
 */
export const borderRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
  card: 'rounded-lg',
  button: 'rounded-lg',
  input: 'rounded-lg',
  modal: 'rounded-xl'
} as const;

/**
 * Container Max Widths
 */
export const containerWidth = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
  screen: 'max-w-screen-2xl'
} as const;

/**
 * Z-Index Layers
 */
export const zIndex = {
  base: 'z-0',
  dropdown: 'z-10',
  sticky: 'z-20',
  fixed: 'z-30',
  modalBackdrop: 'z-40',
  modal: 'z-50',
  popover: 'z-60',
  tooltip: 'z-70'
} as const;
