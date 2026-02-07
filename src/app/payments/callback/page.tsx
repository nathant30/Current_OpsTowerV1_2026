'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PaymentConfirmation from '@/components/payments/PaymentConfirmation';
import { Loader2 } from 'lucide-react';

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'success' | 'failed' | 'pending' | 'cancelled'>('pending');
  const [transactionId, setTransactionId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [provider, setProvider] = useState<string>('maya');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const transactionIdParam = searchParams.get('transactionId');
    const providerParam = searchParams.get('provider') || 'maya';

    setProvider(providerParam);

    // Map status from URL
    if (statusParam === 'success') {
      setStatus('success');
    } else if (statusParam === 'failed') {
      setStatus('failed');
    } else if (statusParam === 'cancelled') {
      setStatus('cancelled');
    } else {
      setStatus('pending');
    }

    // If we have a transaction ID, fetch the payment details
    if (transactionIdParam) {
      setTransactionId(transactionIdParam);
      fetchPaymentDetails(transactionIdParam);
    } else {
      // No transaction ID, just show the status
      setLoading(false);
    }
  }, [searchParams]);

  const fetchPaymentDetails = async (txnId: string) => {
    try {
      // Use provider-specific endpoint
      const endpoint = provider === 'gcash'
        ? `/api/payments/gcash/status/${txnId}`
        : `/api/payments/maya/status/${txnId}`;

      const response = await fetch(endpoint);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAmount(data.data.amount);
          // Update status from server if available
          if (data.data.status) {
            const serverStatus = data.data.status.toLowerCase();
            if (['completed', 'success', 'paid'].includes(serverStatus)) {
              setStatus('success');
            } else if (['failed', 'declined', 'error'].includes(serverStatus)) {
              setStatus('failed');
            } else if (['cancelled', 'voided', 'canceled'].includes(serverStatus)) {
              setStatus('cancelled');
            } else if (['pending', 'processing', 'waiting'].includes(serverStatus)) {
              setStatus('pending');
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-xpress-600 mx-auto animate-spin mb-4" />
          <p className="text-neutral-600">
            Verifying your {provider === 'gcash' ? 'GCash' : 'Maya'} payment...
          </p>
          <p className="text-sm text-neutral-500 mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <PaymentConfirmation
        transactionId={transactionId || 'N/A'}
        amount={amount}
        status={status}
        timestamp={new Date().toISOString()}
        provider={provider}
        onClose={() => router.push('/command-center')}
      />
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-xpress-600 animate-spin" />
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
