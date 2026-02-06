'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/xpress/card';
import { Button } from '@/components/xpress/button';
import { Badge } from '@/components/xpress/badge';
import { CheckCircle, XCircle, Loader2, Download } from 'lucide-react';

interface PaymentConfirmationProps {
  transactionId: string;
  amount: number;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  timestamp: string;
  provider?: string;
  onClose?: () => void;
}

export default function PaymentConfirmation({
  transactionId,
  amount,
  status,
  timestamp,
  provider = 'maya',
  onClose
}: PaymentConfirmationProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (status === 'success') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [status]);

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle className="w-16 h-16 text-success-600" />,
          title: 'Payment Successful!',
          message: 'Your payment has been processed successfully.',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
          badge: <Badge variant="success">Completed</Badge>
        };
      case 'failed':
        return {
          icon: <XCircle className="w-16 h-16 text-danger-600" />,
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          bgColor: 'bg-danger-50',
          borderColor: 'border-danger-200',
          badge: <Badge variant="danger">Failed</Badge>
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-16 h-16 text-warning-600" />,
          title: 'Payment Cancelled',
          message: 'You have cancelled the payment.',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          badge: <Badge variant="warning">Cancelled</Badge>
        };
      default:
        return {
          icon: <Loader2 className="w-16 h-16 text-info-600 animate-spin" />,
          title: 'Payment Pending',
          message: 'Your payment is being processed. Please wait...',
          bgColor: 'bg-info-50',
          borderColor: 'border-info-200',
          badge: <Badge variant="warning">Pending</Badge>
        };
    }
  };

  const config = getStatusConfig();

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const downloadReceipt = async () => {
    // TODO: Implement receipt download
    console.log('Downloading receipt for:', transactionId);
    alert('Receipt download feature coming soon!');
  };

  return (
    <div className="max-w-md mx-auto">
      <Card variant="elevated" className={`border-2 ${config.borderColor}`}>
        <CardContent className="p-8">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {config.icon}
          </div>

          {/* Status Title */}
          <h2 className="text-2xl font-bold text-center mb-2 text-neutral-900">
            {config.title}
          </h2>
          <p className="text-center text-neutral-600 mb-6">{config.message}</p>

          {/* Transaction Details */}
          <div className={`${config.bgColor} rounded-lg p-4 mb-6 space-y-3`}>
            <div className="flex justify-between">
              <span className="text-sm text-neutral-600">Transaction ID:</span>
              <span className="font-mono text-sm font-medium text-neutral-900">
                {transactionId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-neutral-600">Amount:</span>
              <span className="font-bold text-lg text-neutral-900">
                {formatAmount(amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-neutral-600">Date:</span>
              <span className="text-sm text-neutral-900">
                {new Date(timestamp).toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>
            {provider && (
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Payment Method:</span>
                <span className="text-sm font-medium text-neutral-900 capitalize">
                  {provider}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
              <span className="text-sm text-neutral-600">Status:</span>
              {config.badge}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {status === 'success' && (
              <Button
                fullWidth
                onClick={downloadReceipt}
                leftIcon={<Download className="h-5 w-5" />}
              >
                Download Receipt
              </Button>
            )}

            {status === 'failed' && (
              <Button
                fullWidth
                onClick={() => router.back()}
              >
                Try Again
              </Button>
            )}

            <Button
              fullWidth
              variant={status === 'success' ? 'secondary' : 'primary'}
              onClick={() => router.push('/dashboard')}
            >
              {status === 'success' ? 'Back to Dashboard' : 'Go to Dashboard'}
            </Button>

            {onClose && (
              <button
                onClick={onClose}
                className="w-full text-center text-neutral-600 hover:text-neutral-800 py-2 text-sm"
              >
                Close
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
