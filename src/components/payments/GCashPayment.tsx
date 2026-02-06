'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/xpress/card';
import { Button } from '@/components/xpress/button';
import { Loader2, Smartphone, ExternalLink, Shield, QrCode as QrCodeIcon } from 'lucide-react';
import QRCode from 'qrcode.react';

interface GCashPaymentProps {
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

interface CheckoutData {
  redirectUrl: string;
  qrCodeUrl?: string;
  checkoutId: string;
  expiresAt?: string;
}

export default function GCashPayment({
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
}: GCashPaymentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const initiatePayment = async () => {
    setLoading(true);
    setError(null);

    // Detect mobile device
    const userAgent = window.navigator.userAgent;
    const mobileDevice = /iPhone|iPad|iPod|Android/i.test(userAgent);
    setIsMobile(mobileDevice);

    try {
      const response = await fetch('/api/payments/gcash/initiate', {
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
          successUrl: `${window.location.origin}/payments/callback?status=success&provider=gcash`,
          failureUrl: `${window.location.origin}/payments/callback?status=failed&provider=gcash`,
          cancelUrl: `${window.location.origin}/payments/callback?status=cancelled&provider=gcash`,
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

      // Extract checkout data from response
      const checkout: CheckoutData = {
        redirectUrl: data.data?.redirectUrl || '',
        qrCodeUrl: data.data?.qrCodeUrl,
        checkoutId: data.data?.checkoutId || data.data?.id || '',
        expiresAt: data.data?.expiresAt
      };

      setCheckoutData(checkout);

      // For mobile: deep link to GCash app
      if (mobileDevice && checkout.redirectUrl) {
        // Small delay to show the loading state
        setTimeout(() => {
          window.location.href = checkout.redirectUrl;
        }, 500);
      }
      // For web: show QR code (handled in render)

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

  const checkPaymentStatus = () => {
    if (checkoutData?.checkoutId) {
      router.push(`/payments/callback?transactionId=${checkoutData.checkoutId}&provider=gcash`);
    }
  };

  return (
    <Card variant="outlined" className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle>Pay with GCash</CardTitle>
            <p className="text-sm text-neutral-600 mt-1">
              Secure payment powered by GCash & EBANX
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
                <span className="text-2xl font-bold text-blue-600">
                  {formatAmount(amount)}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code Display (GCash-specific for web) */}
          {checkoutData && !isMobile && checkoutData.qrCodeUrl && (
            <div className="bg-white border-2 border-blue-200 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <QrCodeIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold mb-4 text-neutral-900">Scan QR Code with GCash App</h4>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white rounded-lg shadow-sm border-2 border-blue-300">
                  <QRCode
                    value={checkoutData.qrCodeUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                    fgColor="#0066CC"
                  />
                </div>
              </div>
              <p className="text-sm text-neutral-600 mb-2">
                Open your GCash app and scan this QR code to complete payment
              </p>
              {checkoutData.expiresAt && (
                <div className="mt-4 text-xs text-neutral-500">
                  Payment expires in 30 minutes
                </div>
              )}
            </div>
          )}

          {/* Mobile Redirect Message */}
          {checkoutData && isMobile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <Smartphone className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-800 font-medium mb-2">
                Redirecting to GCash App...
              </p>
              <p className="text-xs text-blue-600 mb-3">
                If you are not redirected automatically, please click the button below
              </p>
              <Button
                fullWidth
                onClick={() => window.location.href = checkoutData.redirectUrl}
                className="bg-blue-600 hover:bg-blue-700 border-blue-600"
                leftIcon={<ExternalLink className="h-4 w-4" />}
              >
                Open GCash App
              </Button>
            </div>
          )}

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
          {!error && !checkoutData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                You will be redirected to GCash to complete your payment securely.
                Your payment will expire in 30 minutes.
              </p>
            </div>
          )}

          {/* Payment Button or Status Check */}
          {!checkoutData ? (
            <>
              <Button
                fullWidth
                onClick={initiatePayment}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 border-blue-600"
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
            </>
          ) : (
            <div className="space-y-3">
              <Button
                fullWidth
                onClick={checkPaymentStatus}
                variant="secondary"
              >
                Check Payment Status
              </Button>
              {onCancel && (
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          {/* Security Badge */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <Shield className="w-4 h-4" />
            <span>Secure payment powered by GCash & EBANX</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
