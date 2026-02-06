'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/xpress/card';
import { Button } from '@/components/xpress/button';
import { Loader2, Smartphone, ExternalLink, Shield } from 'lucide-react';

interface MayaPaymentProps {
  amount: number;
  description: string;
  bookingId?: string;
  userId: string;
  userType?: 'passenger' | 'driver' | 'operator';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export default function MayaPayment({
  amount,
  description,
  bookingId,
  userId,
  userType = 'passenger',
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onError,
  onCancel
}: MayaPaymentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/maya/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'PHP',
          description,
          userId,
          userType,
          customerName,
          customerEmail,
          customerPhone,
          bookingId,
          successUrl: `${window.location.origin}/payments/callback?status=success&provider=maya`,
          failureUrl: `${window.location.origin}/payments/callback?status=failed&provider=maya`,
          cancelUrl: `${window.location.origin}/payments/callback?status=cancelled&provider=maya`,
          metadata: {
            source: 'web',
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment initiation failed');
      }

      const data = await response.json();

      // Redirect to Maya checkout page
      if (data.data?.redirectUrl) {
        window.location.href = data.data.redirectUrl;
      } else {
        throw new Error('No redirect URL received');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <Card variant="outlined" className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Smartphone className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle>Pay with Maya</CardTitle>
            <p className="text-sm text-neutral-600 mt-1">
              Secure payment powered by PayMaya
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Payment Details */}
          <div className="bg-neutral-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Description:</span>
                <span className="font-medium text-sm text-neutral-900">{description}</span>
              </div>
              {bookingId && (
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Booking ID:</span>
                  <span className="font-mono text-sm text-neutral-900">{bookingId}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                <span className="text-lg font-semibold text-neutral-900">Total Amount:</span>
                <span className="text-2xl font-bold text-xpress-600">
                  {formatAmount(amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-danger-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-danger-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          {!error && (
            <div className="bg-xpress-50 border border-xpress-200 rounded-lg p-3">
              <p className="text-sm text-xpress-800">
                You will be redirected to Maya to complete your payment securely.
                Your payment will expire in 15 minutes.
              </p>
            </div>
          )}

          {/* Payment Button */}
          <Button
            fullWidth
            onClick={initiatePayment}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 border-green-600"
            leftIcon={loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Smartphone className="h-5 w-5" />}
            rightIcon={!loading && <ExternalLink className="h-4 w-4" />}
          >
            {loading ? 'Processing...' : `Pay ${formatAmount(amount)}`}
          </Button>

          {onCancel && (
            <Button
              fullWidth
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}

          {/* Security Badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <Shield className="w-4 h-4" />
            <span>Secure payment powered by Maya</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
