'use client';

import React, { useState } from 'react';
import {
  CreditCard, Plus, Trash2, Check, AlertCircle,
  Loader2, Shield, Clock, Star
} from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'gcash' | 'paymaya';
  lastFour: string;
  expiryMonth?: string;
  expiryYear?: string;
  holderName?: string;
  isDefault: boolean;
  isVerified: boolean;
  addedDate: string;
}

interface PaymentMethodsProps {
  methods: PaymentMethod[];
  onAddMethod: () => void;
  onRemoveMethod: (methodId: string) => Promise<void>;
  onSetDefault: (methodId: string) => Promise<void>;
}

const PaymentMethods: React.FC<PaymentMethodsProps> = ({
  methods,
  onAddMethod,
  onRemoveMethod,
  onSetDefault
}) => {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getCardIcon = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="w-6 h-6" aria-hidden="true" />;
      case 'gcash':
        return <div className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold">G</div>;
      case 'paymaya':
        return <div className="w-6 h-6 bg-green-600 text-white rounded flex items-center justify-center text-xs font-bold">M</div>;
      default:
        return <CreditCard className="w-6 h-6" aria-hidden="true" />;
    }
  };

  const getTypeName = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'credit_card':
        return 'Credit Card';
      case 'debit_card':
        return 'Debit Card';
      case 'gcash':
        return 'GCash';
      case 'paymaya':
        return 'PayMaya';
      default:
        return type;
    }
  };

  const handleRemove = async (methodId: string) => {
    const method = methods.find(m => m.id === methodId);
    if (!method) return;

    if (method.isDefault) {
      setError('Cannot remove default payment method. Please set another method as default first.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (!confirm(`Are you sure you want to remove this ${getTypeName(method.type)} ending in ${method.lastFour}?`)) {
      return;
    }

    setRemovingId(methodId);
    setError(null);

    try {
      await onRemoveMethod(methodId);
      setSuccess('Payment method removed successfully');
      logger.info('Payment method removed', undefined, {
        component: 'PaymentMethods',
        methodId
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove payment method';
      setError(errorMsg);
      logger.error('Failed to remove payment method', { error: err });
    } finally {
      setRemovingId(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    setSettingDefaultId(methodId);
    setError(null);

    try {
      await onSetDefault(methodId);
      setSuccess('Default payment method updated');
      logger.info('Default payment method changed', undefined, {
        component: 'PaymentMethods',
        methodId
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to set default payment method';
      setError(errorMsg);
      logger.error('Failed to set default payment method', { error: err });
    } finally {
      setSettingDefaultId(null);
    }
  };

  const isExpiringSoon = (method: PaymentMethod) => {
    if (!method.expiryMonth || !method.expiryYear) return false;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear() % 100;

    const expiryMonth = parseInt(method.expiryMonth);
    const expiryYear = parseInt(method.expiryYear);

    // Check if expires in next 2 months
    if (expiryYear === currentYear) {
      return expiryMonth - currentMonth <= 2 && expiryMonth >= currentMonth;
    }

    return false;
  };

  const isExpired = (method: PaymentMethod) => {
    if (!method.expiryMonth || !method.expiryYear) return false;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear() % 100;

    const expiryMonth = parseInt(method.expiryMonth);
    const expiryYear = parseInt(method.expiryYear);

    if (expiryYear < currentYear) return true;
    if (expiryYear === currentYear && expiryMonth < currentMonth) return true;

    return false;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-600" aria-hidden="true" />
              Payment Methods
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your payment methods and billing preferences
            </p>
          </div>

          <button
            onClick={onAddMethod}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Add new payment method"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Payment Method
          </button>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div
          className="mx-4 sm:mx-6 mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg border border-green-200"
          role="alert"
          aria-live="polite"
        >
          <Check className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="mx-4 sm:mx-6 mt-4 flex items-start gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-700 hover:text-red-800 underline mt-1"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Payment Methods List */}
      <div className="p-4 sm:p-6">
        {methods.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
            <p className="text-gray-600 mb-4">No payment methods added yet</p>
            <button
              onClick={onAddMethod}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Your First Payment Method
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method) => {
              const expired = isExpired(method);
              const expiringSoon = !expired && isExpiringSoon(method);

              return (
                <div
                  key={method.id}
                  className={`p-4 border rounded-lg transition-all ${
                    method.isDefault
                      ? 'border-blue-300 bg-blue-50'
                      : expired
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Card Icon */}
                    <div className={`flex-shrink-0 p-3 rounded-lg ${
                      method.isDefault
                        ? 'bg-blue-100'
                        : expired
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                    }`}>
                      {getCardIcon(method.type)}
                    </div>

                    {/* Card Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-gray-900">
                              {getTypeName(method.type)} •••• {method.lastFour}
                            </h3>
                            {method.isDefault && (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                                role="status"
                                aria-label="Default payment method"
                              >
                                <Star className="w-3 h-3 mr-1 fill-current" aria-hidden="true" />
                                Default
                              </span>
                            )}
                            {method.isVerified && (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
                                role="status"
                                aria-label="Verified payment method"
                              >
                                <Shield className="w-3 h-3 mr-1" aria-hidden="true" />
                                Verified
                              </span>
                            )}
                          </div>

                          {method.holderName && (
                            <p className="text-sm text-gray-600 mt-1">
                              {method.holderName}
                            </p>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
                            {method.expiryMonth && method.expiryYear && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                <span>
                                  Expires {method.expiryMonth}/{method.expiryYear}
                                </span>
                                {expiringSoon && (
                                  <span className="ml-2 text-orange-600 font-medium" role="alert">
                                    (Expiring Soon)
                                  </span>
                                )}
                                {expired && (
                                  <span className="ml-2 text-red-600 font-medium" role="alert">
                                    (Expired)
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <span>Added {method.addedDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {!method.isDefault && (
                            <button
                              onClick={() => handleSetDefault(method.id)}
                              disabled={settingDefaultId === method.id}
                              className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              aria-label="Set as default payment method"
                            >
                              {settingDefaultId === method.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                              ) : (
                                'Set as Default'
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => handleRemove(method.id)}
                            disabled={removingId === method.id || method.isDefault}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label="Remove payment method"
                            title={method.isDefault ? 'Cannot remove default payment method' : 'Remove payment method'}
                          >
                            {removingId === method.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Your payment information is secure
              </h4>
              <p className="text-xs text-blue-700">
                All payment data is encrypted and stored securely. We never share your payment information with third parties.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility: Status Announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {removingId && 'Removing payment method...'}
        {settingDefaultId && 'Setting default payment method...'}
      </div>
    </div>
  );
};

export default PaymentMethods;
