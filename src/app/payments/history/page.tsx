'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/xpress/card';
import { Button } from '@/components/xpress/button';
import { Badge } from '@/components/xpress/badge';
import {
  Loader2,
  Download,
  X,
  FileText,
  Calendar,
  DollarSign,
  CreditCard
} from 'lucide-react';

interface Payment {
  id: string;
  transactionId: string;
  referenceNumber: string;
  provider: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded' | 'expired' | 'cancelled';
  description: string;
  paymentMethod: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  bookingId?: string;
}

export default function PaymentHistoryPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // TODO: Get actual user ID from auth session
  const userId = 'user-123'; // Placeholder

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/payments/history?userId=${userId}&filter=${filter}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const result = await response.json();
      setPayments(result.data?.payments || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'secondary'> = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
      refunded: 'secondary',
      expired: 'warning',
      cancelled: 'secondary'
    };

    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getProviderLogo = (provider: string) => {
    // For now, just return a placeholder div
    return (
      <div className="w-10 h-10 bg-neutral-200 rounded flex items-center justify-center text-xs font-semibold text-neutral-600">
        {provider[0].toUpperCase()}
      </div>
    );
  };

  const formatAmount = (amount: number, currency: string = 'PHP') => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadReceipt = (payment: Payment) => {
    // TODO: Implement receipt download
    console.log('Downloading receipt for:', payment.transactionId);
    alert('Receipt download feature coming soon!');
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Payment History
          </h1>
          <p className="text-neutral-600">
            View and manage your payment transactions
          </p>
        </div>

        {/* Filters */}
        <Card variant="outlined" className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {['all', 'completed', 'pending', 'failed', 'refunded'].map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'primary' : 'secondary'}
                  onClick={() => setFilter(f)}
                  className="capitalize"
                >
                  {f}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-10 w-10 text-xpress-600 mx-auto animate-spin mb-4" />
            <p className="text-neutral-600">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <Card variant="outlined">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 mb-4">No payments found</p>
              <Button onClick={() => router.push('/bookings/new')}>
                Make a Booking
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card
                key={payment.id}
                variant="outlined"
                hover
                className="cursor-pointer"
                onClick={() => setSelectedPayment(payment)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getProviderLogo(payment.provider)}
                      <div>
                        <div className="font-semibold text-neutral-900">
                          {payment.description}
                        </div>
                        <div className="text-sm text-neutral-600">
                          {formatDate(payment.createdAt)}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                    <div className="text-sm text-neutral-600">
                      <span className="font-mono">{payment.transactionId}</span>
                    </div>
                    <div className="text-xl font-bold text-xpress-600">
                      {formatAmount(payment.amount, payment.currency)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPayment(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-neutral-200 p-4 flex justify-between items-start">
              <h3 className="text-xl font-bold text-neutral-900">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Amount */}
              <div className="text-center py-4 bg-xpress-50 rounded-lg">
                <div className="text-sm text-neutral-600 mb-1">Amount</div>
                <div className="text-3xl font-bold text-xpress-600">
                  {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                </div>
              </div>

              {/* Status */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Status</span>
                {getStatusBadge(selectedPayment.status)}
              </div>

              {/* Description */}
              <div>
                <div className="text-sm text-neutral-600 mb-1">Description</div>
                <div className="font-medium text-neutral-900">
                  {selectedPayment.description}
                </div>
              </div>

              {/* Transaction ID */}
              <div>
                <div className="text-sm text-neutral-600 mb-1">Transaction ID</div>
                <div className="font-mono text-sm text-neutral-900 break-all">
                  {selectedPayment.transactionId}
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <div className="text-sm text-neutral-600 mb-1">Reference Number</div>
                <div className="font-mono text-sm text-neutral-900">
                  {selectedPayment.referenceNumber}
                </div>
              </div>

              {/* Provider */}
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Payment Method</span>
                <span className="text-sm font-medium text-neutral-900 capitalize">
                  {selectedPayment.provider}
                </span>
              </div>

              {/* Booking ID */}
              {selectedPayment.bookingId && (
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Booking ID</span>
                  <span className="text-sm font-medium text-neutral-900">
                    {selectedPayment.bookingId}
                  </span>
                </div>
              )}

              {/* Date */}
              <div className="flex justify-between">
                <span className="text-sm text-neutral-600">Created</span>
                <span className="text-sm text-neutral-900">
                  {formatDate(selectedPayment.createdAt)}
                </span>
              </div>

              {/* Completed Date */}
              {selectedPayment.completedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600">Completed</span>
                  <span className="text-sm text-neutral-900">
                    {formatDate(selectedPayment.completedAt)}
                  </span>
                </div>
              )}

              {/* Failure Reason */}
              {selectedPayment.failureReason && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-danger-800 mb-1">
                    Failure Reason
                  </div>
                  <div className="text-sm text-danger-700">
                    {selectedPayment.failureReason}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-neutral-200 p-4 space-y-2">
              {selectedPayment.status === 'completed' && (
                <Button
                  fullWidth
                  onClick={() => downloadReceipt(selectedPayment)}
                  leftIcon={<Download className="h-5 w-5" />}
                >
                  Download Receipt
                </Button>
              )}
              <Button
                fullWidth
                variant="secondary"
                onClick={() => setSelectedPayment(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
