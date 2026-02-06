'use client';

import { Card, CardContent } from '@/components/xpress/card';
import { Button } from '@/components/xpress/button';
import { AlertCircle, RotateCcw, Mail } from 'lucide-react';

interface PaymentErrorProps {
  error: string;
  errorCode?: string;
  onRetry?: () => void;
  onCancel?: () => void;
}

export default function PaymentError({
  error,
  errorCode,
  onRetry,
  onCancel
}: PaymentErrorProps) {
  return (
    <div className="max-w-md mx-auto">
      <Card variant="elevated">
        <CardContent className="p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-danger-50 rounded-full">
              <AlertCircle className="w-12 h-12 text-danger-600" />
            </div>
          </div>

          {/* Error Title */}
          <h2 className="text-2xl font-bold text-center mb-2 text-neutral-900">
            Payment Failed
          </h2>
          <p className="text-center text-neutral-600 mb-6">
            We could not process your payment
          </p>

          {/* Error Message */}
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-danger-800 text-center font-medium">{error}</p>
            {errorCode && (
              <p className="text-xs text-danger-600 text-center mt-2">
                Error Code: {errorCode}
              </p>
            )}
          </div>

          {/* Common Issues */}
          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-sm text-neutral-900 mb-2">
              Common issues:
            </h3>
            <ul className="text-sm text-neutral-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-neutral-400 mt-0.5">•</span>
                <span>Insufficient funds in your Maya wallet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-400 mt-0.5">•</span>
                <span>Payment timeout (15 minutes expired)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-400 mt-0.5">•</span>
                <span>Network connectivity issues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-400 mt-0.5">•</span>
                <span>Card or account verification required</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-400 mt-0.5">•</span>
                <span>Payment declined by bank or provider</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {onRetry && (
              <Button
                fullWidth
                onClick={onRetry}
                leftIcon={<RotateCcw className="h-5 w-5" />}
              >
                Try Again
              </Button>
            )}

            {onCancel && (
              <Button
                fullWidth
                variant="secondary"
                onClick={onCancel}
              >
                Choose Different Method
              </Button>
            )}

            {/* Support Link */}
            <div className="pt-4 border-t border-neutral-200">
              <a
                href="mailto:support@opstower.com"
                className="flex items-center justify-center gap-2 text-sm text-xpress-600 hover:text-xpress-700 font-medium"
              >
                <Mail className="h-4 w-4" />
                Contact Support
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
