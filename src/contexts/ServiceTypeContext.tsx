'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ServiceType = 'ALL' | '2W' | '4W_CAR' | '4W_SUV' | '4W_TAXI';

interface ServiceTypeOption {
  id: string;
  name: string;
  icon: string;
}

interface ServiceTypeContextType {
  serviceType: ServiceType;
  setServiceType: (type: ServiceType) => void;
  selectedServiceType: string;
  setSelectedServiceType: (type: string) => void;
  serviceTypes: ServiceTypeOption[];
}

const SERVICE_TYPE_OPTIONS: ServiceTypeOption[] = [
  { id: 'ALL', name: 'All Services', icon: '🚗' },
  { id: '2W', name: '2-Wheeler', icon: '🏍️' },
  { id: '4W_CAR', name: '4W Car', icon: '🚙' },
  { id: '4W_SUV', name: '4W SUV', icon: '🚐' },
  { id: '4W_TAXI', name: '4W Taxi', icon: '🚕' },
];

const ServiceTypeContext = createContext<ServiceTypeContextType | undefined>(undefined);

export function ServiceTypeProvider({ children }: { children: ReactNode }) {
  const [serviceType, setServiceType] = useState<ServiceType>('ALL');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('ALL');

  return (
    <ServiceTypeContext.Provider value={{
      serviceType,
      setServiceType,
      selectedServiceType,
      setSelectedServiceType,
      serviceTypes: SERVICE_TYPE_OPTIONS
    }}>
      {children}
    </ServiceTypeContext.Provider>
  );
}

export function useServiceType() {
  const context = useContext(ServiceTypeContext);
  if (context === undefined) {
    throw new Error('useServiceType must be used within a ServiceTypeProvider');
  }
  return context;
}
