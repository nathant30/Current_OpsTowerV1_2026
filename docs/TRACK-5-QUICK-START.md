# TRACK 5: Quick Start Guide for Developers

**Last Updated**: February 7, 2026
**Track**: Features & User Experience

---

## What Was Completed

3 out of 5 issues completed (60%):
- ✅ Issue #25: Passenger Profile UX Fixes
- ✅ Issue #7: UI/UX General Fixes
- ✅ Issue #29: WebSocket Edge Cases

2 issues documented for future implementation:
- 📋 Issue #12: Emergency System Enhancement
- 📋 Issue #8: Advanced Analytics & Reporting

---

## Quick Integration Guide

### 1. Using the New Passenger Profile Components

```tsx
// Import the components
import PassengerInfo from '@/components/profile/PassengerInfo';
import PaymentMethods from '@/components/profile/PaymentMethods';

// In your page
export default function ProfilePage() {
  const handleProfileUpdate = async (data) => {
    const response = await fetch('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return response.json();
  };

  const handlePhotoUpdate = async (photoUrl) => {
    // Upload to your storage service
    const formData = new FormData();
    formData.append('photo', photoUrl);
    await fetch('/api/upload/profile-photo', {
      method: 'POST',
      body: formData
    });
  };

  return (
    <PassengerInfo
      initialData={passengerData}
      onUpdate={handleProfileUpdate}
      onPhotoUpdate={handlePhotoUpdate}
    />
  );
}
```

### 2. Using Standardized Button Styles

```tsx
import { buttonVariants } from '@/lib/ui/buttonStyles';
import { cn } from '@/lib/utils';

// Primary button
<button className={buttonVariants({ variant: 'primary', size: 'md' })}>
  Save Changes
</button>

// Danger button (small)
<button className={buttonVariants({ variant: 'danger', size: 'sm' })}>
  Delete
</button>

// Full width button
<button className={buttonVariants({ variant: 'primary', fullWidth: true })}>
  Submit
</button>

// With custom classes
<button className={cn(buttonVariants({ variant: 'outline' }), 'custom-class')}>
  Custom Button
</button>
```

### 3. Using Spacing Constants

```tsx
import { spacing } from '@/lib/ui/spacingConstants';

// Card with responsive padding
<div className={`${spacing.cardPadding.mobile} ${spacing.cardPadding.tablet} ${spacing.cardPadding.desktop}`}>
  <h2 className={spacing.formField.labelMargin}>Title</h2>
  <div className={spacing.stack.md}>
    <p>Content 1</p>
    <p>Content 2</p>
    <p>Content 3</p>
  </div>
</div>

// Container with standard padding
<div className={`${spacing.container} max-w-7xl mx-auto`}>
  Content
</div>
```

### 4. Using Loading States

```tsx
import {
  LoadingSpinner,
  LoadingOverlay,
  SkeletonCard,
  LoadingButton
} from '@/components/ui/LoadingStates';

// Inline spinner
{isLoading && <LoadingSpinner size="md" label="Loading..." />}

// Full page overlay
{isLoading && <LoadingOverlay message="Processing..." />}

// Skeleton placeholder
{isLoading ? <SkeletonCard /> : <DataCard data={data} />}

// Loading button
<LoadingButton
  loading={isSaving}
  loadingText="Saving..."
  onClick={handleSave}
  className="bg-blue-600 text-white"
>
  Save Changes
</LoadingButton>
```

### 5. Using WebSocket Connection Manager

```tsx
import { useWebSocket } from '@/hooks/useWebSocket';
import { ConnectionStatusIndicator } from '@/components/websocket/ConnectionStatusIndicator';

function MyComponent() {
  const { status, send, isConnected, queuedMessages } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
    autoConnect: true,
    onMessage: (message) => {
      console.log('Received:', message);
    },
    onStatusChange: (status) => {
      console.log('Status changed:', status);
    }
  });

  const handleSendMessage = () => {
    send('chat', { text: 'Hello!' });
  };

  return (
    <div>
      <ConnectionStatusIndicator
        status={status}
        queuedMessages={queuedMessages}
        showDetails
      />
      {isConnected ? (
        <button onClick={handleSendMessage}>Send Message</button>
      ) : (
        <p>Connecting...</p>
      )}
    </div>
  );
}
```

### 6. Using Accessible Colors

```tsx
import { accessibleColors, focusRing } from '@/lib/ui/colorContrast';

// Success alert
<div className={`
  ${accessibleColors.status.success.bg}
  ${accessibleColors.status.success.border}
  ${accessibleColors.status.success.text}
  border rounded-lg p-4
`}>
  <AlertCircle className={accessibleColors.status.success.icon} />
  <p>Success message</p>
</div>

// Button with focus ring
<button className={`bg-blue-600 text-white ${focusRing.default}`}>
  Accessible Button
</button>
```

---

## API Endpoints to Implement

### Required for Passenger Profile

```typescript
// GET /api/auth/profile
// Fetch current user profile
// Response: { id, name, email, phone, photo, ... }

// PATCH /api/auth/profile
// Update user profile
// Body: { name?, email?, phone?, ... }
// Response: { success, data }

// POST /api/upload/profile-photo
// Upload profile photo
// Body: FormData with 'photo' field
// Response: { photoUrl }

// GET /api/payments/methods
// Fetch payment methods
// Response: { methods: PaymentMethod[] }

// POST /api/payments/methods
// Add payment method
// Body: { type, details }
// Response: { success, method }

// DELETE /api/payments/methods/:id
// Remove payment method
// Response: { success }

// PUT /api/payments/methods/:id/default
// Set default payment method
// Response: { success }
```

---

## Environment Variables to Add

```env
# WebSocket
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.xpress.ops/ws
WEBSOCKET_RECONNECT_DELAY=1000
WEBSOCKET_MAX_ATTEMPTS=10

# File Upload
NEXT_PUBLIC_UPLOAD_ENDPOINT=/api/upload
MAX_FILE_SIZE_MB=5
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Feature Flags
ENABLE_PASSENGER_PROFILE_V2=true
ENABLE_WEBSOCKET_MANAGER=true
ENABLE_DEBUG_LOGGING=false
```

---

## Common Patterns

### 1. Form with Validation

```tsx
import { useForm } from 'react-hook-form';

const { register, handleSubmit, formState: { errors } } = useForm();

<form onSubmit={handleSubmit(onSubmit)}>
  <div>
    <label htmlFor="email">Email</label>
    <input
      id="email"
      type="email"
      {...register('email', {
        required: 'Email is required',
        pattern: {
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Invalid email format'
        }
      })}
      className={errors.email ? 'border-red-300' : 'border-gray-300'}
      aria-invalid={errors.email ? 'true' : 'false'}
      aria-describedby={errors.email ? 'email-error' : undefined}
    />
    {errors.email && (
      <p id="email-error" className="text-red-600 text-sm" role="alert">
        {errors.email.message}
      </p>
    )}
  </div>
</form>
```

### 2. Accessible Modal

```tsx
import { Modal } from '@/components/ui/Modal';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={
    <>
      <button onClick={() => setIsOpen(false)}>Cancel</button>
      <button onClick={handleConfirm}>Confirm</button>
    </>
  }
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

### 3. WebSocket Real-time Updates

```tsx
import { useWebSocketSubscribe } from '@/hooks/useWebSocket';

useWebSocketSubscribe('trip_update', (message) => {
  // Handle trip update
  setTrip(message.payload);
});

useWebSocketSubscribe('notification', (message) => {
  // Show notification
  toast.success(message.payload.text);
});
```

---

## Testing Examples

### Unit Test

```typescript
import { render, screen } from '@testing-library/react';
import PassengerInfo from '@/components/profile/PassengerInfo';

describe('PassengerInfo', () => {
  it('should render form fields', () => {
    render(<PassengerInfo initialData={mockData} />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const { user } = render(<PassengerInfo initialData={mockData} />);

    const nameInput = screen.getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.tab();

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });
});
```

### E2E Test

```typescript
import { test, expect } from '@playwright/test';

test('Update passenger profile', async ({ page }) => {
  await page.goto('/profile/passenger');

  // Click edit button
  await page.click('button:has-text("Edit Profile")');

  // Update name
  await page.fill('input[name="name"]', 'New Name');

  // Save changes
  await page.click('button:has-text("Save Changes")');

  // Verify success message
  await expect(page.locator('text=Profile updated successfully')).toBeVisible();
});
```

---

## Troubleshooting

### Issue: WebSocket not connecting

**Solution**:
```typescript
// Check environment variable
console.log('WebSocket URL:', process.env.NEXT_PUBLIC_WEBSOCKET_URL);

// Verify connection status
const { status, connect } = useWebSocket({ url: '...' });
console.log('Status:', status);

// Manually retry
connect();
```

### Issue: Form validation not working

**Solution**:
```typescript
// Check react-hook-form registration
const { register, formState: { errors } } = useForm();

// Verify field is registered
<input {...register('fieldName', { required: true })} />

// Check error object
console.log('Errors:', errors);
```

### Issue: Loading states not showing

**Solution**:
```typescript
// Verify state is managed correctly
const [isLoading, setIsLoading] = useState(false);

// Set loading before async operation
setIsLoading(true);
try {
  await someAsyncOperation();
} finally {
  setIsLoading(false); // Always reset in finally
}
```

---

## Performance Tips

### 1. Memoize Expensive Components

```tsx
import React, { memo } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  // Component logic
});
```

### 2. Use useCallback for Event Handlers

```tsx
import { useCallback } from 'react';

const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### 3. Lazy Load Heavy Components

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

---

## Accessibility Checklist

When creating new components, ensure:

- [ ] All interactive elements have keyboard support
- [ ] Focus indicators are visible (use `focusRing` from colorContrast)
- [ ] ARIA labels on icons and icon buttons
- [ ] Form inputs have associated labels
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Live regions for dynamic content (`aria-live`)
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)
- [ ] Touch targets are at least 44x44px
- [ ] Text is readable at 200% zoom

---

## Next Steps

1. **Test the components** in your local environment
2. **Connect to real APIs** (replace mock data)
3. **Run accessibility audit** using Lighthouse or axe
4. **Add unit tests** for new features
5. **Deploy to staging** for UAT
6. **Review Issues #12 and #8** implementation guides

---

## Need Help?

**Documentation**:
- Full implementation guide: `docs/TRACK-5-IMPLEMENTATION-SUMMARY.md`
- Completion report: `docs/coordination/TRACK-5-FEATURES-UX-COMPLETION.md`

**Code Examples**:
- All components in `src/components/profile/`
- WebSocket utilities in `src/lib/websocket/`
- UI utilities in `src/lib/ui/`

**Testing**:
- Run tests: `npm test`
- E2E tests: `npm run test:e2e`
- Accessibility: `npm run test:a11y`

---

**Happy coding!**

*Generated by Claude Sonnet 4.5 - February 7, 2026*
