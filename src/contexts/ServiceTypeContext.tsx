'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ServiceType = 'ALL' | '2W' | '4W_CAR' | '4W_SUV' | '4W_TAXI';

interface ServiceTypeContextType {
  serviceType: ServiceType;
  setServiceType: (type: ServiceType) => void;
}

const ServiceTypeContext = createContext<ServiceTypeContextType | undefined>(undefined);

export function ServiceTypeProvider({ children }: { children: ReactNode }) {
  const [serviceType, setServiceType] = useState<ServiceType>('ALL');

  return (
    <ServiceTypeContext.Provider value={{ serviceType, setServiceType }}>
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
