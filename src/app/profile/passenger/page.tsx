'use client';

import React, { useState } from 'react';
import { ArrowLeft, Bell, Shield, CreditCard } from 'lucide-react';
import PassengerInfo from '@/components/profile/PassengerInfo';
import PaymentMethods from '@/components/profile/PaymentMethods';
import { logger } from '@/lib/security/productionLogger';

// Mock data - replace with actual API calls in production
const mockPassengerData = {
  id: 'PSG-201922',
  name: 'Maria Santos',
  email: 'maria.santos1922@gmail.com',
  phone: '+639069780294',
  photo: undefined,
  location: 'Metro Manila',
  timezone: 'Asia/Manila',
  emergencyContact: 'Juan Santos',
  emergencyPhone: '+639171234567',
  joinDate: 'Jan 15, 2023',
  status: 'active'
};

const mockPaymentMethods = [
  {
    id: 'pm_001',
    type: 'credit_card' as const,
    lastFour: '4242',
    expiryMonth: '12',
    expiryYear: '26',
    holderName: 'Maria Santos',
    isDefault: true,
    isVerified: true,
    addedDate: 'Jan 15, 2024'
  },
  {
    id: 'pm_002',
    type: 'gcash' as const,
    lastFour: '0294',
    holderName: 'Maria Santos',
    isDefault: false,
    isVerified: true,
    addedDate: 'Feb 10, 2024'
  }
];

export default function PassengerProfilePage() {
  const [activeSection, setActiveSection] = useState<'profile' | 'payments' | 'notifications' | 'security'>('profile');
  const [passengerData, setPassengerData] = useState(mockPassengerData);
  const [paymentMethods, setPaymentMethods] = useState(mockPaymentMethods);

  const handleProfileUpdate = async (data: any) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPassengerData(prev => ({ ...prev, ...data }));
    logger.info('Passenger profile updated', undefined, {
      component: 'PassengerProfilePage',
      passengerId: passengerData.id
    });
  };

  const handlePhotoUpdate = async (photoUrl: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPassengerData(prev => ({ ...prev, photo: photoUrl }));
    logger.info('Profile photo updated', undefined, {
      component: 'PassengerProfilePage',
      passengerId: passengerData.id
    });
  };

  const handleAddPaymentMethod = () => {
    logger.info('Add payment method clicked', undefined, {
      component: 'PassengerProfilePage'
    });
    alert('Add payment method modal would open here');
  };

  const handleRemovePaymentMethod = async (methodId: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setPaymentMethods(prev => prev.filter(m => m.id !== methodId));
    logger.info('Payment method removed', undefined, {
      component: 'PassengerProfilePage',
      methodId
    });
  };

  const handleSetDefaultPayment = async (methodId: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setPaymentMethods(prev =>
      prev.map(m => ({ ...m, isDefault: m.id === methodId }))
    );
    logger.info('Default payment method changed', undefined, {
      component: 'PassengerProfilePage',
      methodId
    });
  };

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: ArrowLeft },
    { id: 'payments' as const, label: 'Payment Methods', icon: CreditCard },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-6 w-px bg-gray-300 hidden sm:block" aria-hidden="true"></div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Passenger Profile Settings
            </h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Profile sections">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    activeSection === section.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  aria-current={activeSection === section.id ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          {activeSection === 'profile' && (
            <PassengerInfo
              initialData={passengerData}
              onUpdate={handleProfileUpdate}
              onPhotoUpdate={handlePhotoUpdate}
            />
          )}

          {activeSection === 'payments' && (
            <PaymentMethods
              methods={paymentMethods}
              onAddMethod={handleAddPaymentMethod}
              onRemoveMethod={handleRemovePaymentMethod}
              onSetDefault={handleSetDefaultPayment}
            />
          )}

          {activeSection === 'notifications' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-600" aria-hidden="true" />
                Notification Preferences
              </h2>
              <p className="text-gray-600">Notification settings will be implemented here.</p>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-600" aria-hidden="true" />
                Security Settings
              </h2>
              <p className="text-gray-600">Security settings will be implemented here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
