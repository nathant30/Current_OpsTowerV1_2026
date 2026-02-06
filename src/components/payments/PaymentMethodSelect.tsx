'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/xpress/card';
import { Badge } from '@/components/xpress/badge';
import { CheckCircle2 } from 'lucide-react';

interface PaymentMethod {
  id: 'maya' | 'gcash' | 'cash';
  name: string;
  description: string;
  logo: string;
  available: boolean;
}

interface PaymentMethodSelectProps {
  onSelect: (method: string) => void;
  selectedMethod?: string;
}

export default function PaymentMethodSelect({
  onSelect,
  selectedMethod = 'maya'
}: PaymentMethodSelectProps) {
  const [selected, setSelected] = useState<string>(selectedMethod);

  const methods: PaymentMethod[] = [
    {
      id: 'maya',
      name: 'Maya',
      description: 'Pay securely with Maya (formerly PayMaya)',
      logo: '/images/maya-logo.svg',
      available: true
    },
    {
      id: 'gcash',
      name: 'GCash',
      description: 'Pay with GCash wallet',
      logo: '/images/gcash-logo.svg',
      available: true
    },
    {
      id: 'cash',
      name: 'Cash',
      description: 'Pay with cash upon delivery',
      logo: '/images/cash-icon.svg',
      available: true
    }
  ];

  const handleSelect = (methodId: string, available: boolean) => {
    if (!available) {
      return;
    }
    setSelected(methodId);
    onSelect(methodId);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-neutral-900">Select Payment Method</h3>

      <div className="space-y-3">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => handleSelect(method.id, method.available)}
            disabled={!method.available}
            className={`
              w-full text-left transition-all duration-200
              ${!method.available && 'cursor-not-allowed'}
            `}
          >
            <Card
              variant={selected === method.id ? 'elevated' : 'outlined'}
              className={`
                border-2 hover:shadow-md
                ${selected === method.id
                  ? 'border-xpress-600 bg-xpress-50'
                  : 'border-neutral-200 hover:border-neutral-300'}
                ${!method.available && 'opacity-50'}
              `}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 relative flex-shrink-0 bg-white rounded-lg p-2">
                    <div className="w-full h-full relative">
                      {method.logo.startsWith('http') ? (
                        <img
                          src={method.logo}
                          alt={method.name}
                          className="object-contain w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-200 rounded flex items-center justify-center text-xs font-semibold text-neutral-600">
                          {method.name[0]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-neutral-900">{method.name}</div>
                      {!method.available && (
                        <Badge variant="warning" className="text-xs">Coming Soon</Badge>
                      )}
                    </div>
                    <div className="text-sm text-neutral-600 mt-0.5">{method.description}</div>
                  </div>
                  {selected === method.id && method.available && (
                    <div className="text-xpress-600 flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Security Badge */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-500">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <span>All payment methods are secure and encrypted</span>
      </div>
    </div>
  );
}
