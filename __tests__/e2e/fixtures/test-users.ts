/**
 * E2E Test User Fixtures
 * Comprehensive test user data for all user roles in the OpsTower system
 */

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'passenger' | 'driver' | 'admin' | 'operator' | 'dispatcher' | 'analyst' | 'safety_monitor' | 'regional_manager';
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    [key: string]: any;
  };
}

export interface TestDriver extends TestUser {
  role: 'driver';
  vehicle: {
    plateNumber: string;
    type: string;
    make: string;
    model: string;
    year: number;
    color: string;
  };
  license: {
    number: string;
    expiryDate: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface TestPassenger extends TestUser {
  role: 'passenger';
  paymentMethods: Array<{
    type: 'gcash' | 'maya' | 'cash' | 'card';
    details: any;
  }>;
}

// Passenger Test Users
export const testPassengers: TestPassenger[] = [
  {
    id: 'passenger-test-001',
    email: 'juan.passenger@test.com',
    password: 'TestPass123!',
    role: 'passenger',
    profile: {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      phone: '+639171234567',
      address: 'Makati City, Metro Manila'
    },
    paymentMethods: [
      { type: 'gcash', details: { number: '09171234567' } },
      { type: 'maya', details: { number: '09171234567' } },
      { type: 'cash', details: {} }
    ]
  },
  {
    id: 'passenger-test-002',
    email: 'maria.passenger@test.com',
    password: 'TestPass123!',
    role: 'passenger',
    profile: {
      firstName: 'Maria',
      lastName: 'Santos',
      phone: '+639181234567',
      address: 'Quezon City, Metro Manila'
    },
    paymentMethods: [
      { type: 'maya', details: { number: '09181234567' } },
      { type: 'cash', details: {} }
    ]
  },
  {
    id: 'passenger-test-003',
    email: 'pedro.passenger@test.com',
    password: 'TestPass123!',
    role: 'passenger',
    profile: {
      firstName: 'Pedro',
      lastName: 'Reyes',
      phone: '+639191234567',
      address: 'Pasig City, Metro Manila'
    },
    paymentMethods: [
      { type: 'cash', details: {} }
    ]
  }
];

// Driver Test Users
export const testDrivers: TestDriver[] = [
  {
    id: 'driver-test-001',
    email: 'carlo.driver@test.com',
    password: 'TestPass123!',
    role: 'driver',
    profile: {
      firstName: 'Carlo',
      lastName: 'Garcia',
      phone: '+639201234567',
      address: 'Manila, Metro Manila'
    },
    vehicle: {
      plateNumber: 'ABC1234',
      type: 'sedan',
      make: 'Toyota',
      model: 'Vios',
      year: 2020,
      color: 'White'
    },
    license: {
      number: 'N01-12-345678',
      expiryDate: '2026-12-31'
    },
    location: {
      latitude: 14.5995,
      longitude: 120.9842
    }
  },
  {
    id: 'driver-test-002',
    email: 'anna.driver@test.com',
    password: 'TestPass123!',
    role: 'driver',
    profile: {
      firstName: 'Anna',
      lastName: 'Mendoza',
      phone: '+639211234567',
      address: 'Mandaluyong, Metro Manila'
    },
    vehicle: {
      plateNumber: 'XYZ5678',
      type: 'suv',
      make: 'Honda',
      model: 'CR-V',
      year: 2021,
      color: 'Silver'
    },
    license: {
      number: 'N01-13-456789',
      expiryDate: '2027-06-30'
    },
    location: {
      latitude: 14.5794,
      longitude: 121.0359
    }
  },
  {
    id: 'driver-test-003',
    email: 'ramon.driver@test.com',
    password: 'TestPass123!',
    role: 'driver',
    profile: {
      firstName: 'Ramon',
      lastName: 'Bautista',
      phone: '+639221234567',
      address: 'Taguig, Metro Manila'
    },
    vehicle: {
      plateNumber: 'DEF9012',
      type: 'sedan',
      make: 'Nissan',
      model: 'Almera',
      year: 2019,
      color: 'Black'
    },
    license: {
      number: 'N01-14-567890',
      expiryDate: '2026-09-15'
    },
    location: {
      latitude: 14.5176,
      longitude: 121.0509
    }
  }
];

// Admin Test Users
export const testAdmins: TestUser[] = [
  {
    id: 'admin-test-001',
    email: 'admin@test.com',
    password: 'AdminPass123!',
    role: 'admin',
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      phone: '+639301234567'
    }
  },
  {
    id: 'admin-test-002',
    email: 'superadmin@test.com',
    password: 'SuperAdminPass123!',
    role: 'admin',
    profile: {
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+639311234567'
    }
  }
];

// Operator Test Users
export const testOperators: TestUser[] = [
  {
    id: 'operator-test-001',
    email: 'operator@test.com',
    password: 'OperatorPass123!',
    role: 'operator',
    profile: {
      firstName: 'Operator',
      lastName: 'Staff',
      phone: '+639321234567',
      regionId: 'ncr-manila'
    }
  },
  {
    id: 'dispatcher-test-001',
    email: 'dispatcher@test.com',
    password: 'DispatcherPass123!',
    role: 'dispatcher',
    profile: {
      firstName: 'Dispatcher',
      lastName: 'Staff',
      phone: '+639331234567',
      regionId: 'ncr-manila'
    }
  }
];

// Safety Monitor Test Users
export const testSafetyMonitors: TestUser[] = [
  {
    id: 'safety-test-001',
    email: 'safety@test.com',
    password: 'SafetyPass123!',
    role: 'safety_monitor',
    profile: {
      firstName: 'Safety',
      lastName: 'Monitor',
      phone: '+639341234567',
      regionId: 'ncr-manila'
    }
  }
];

// Regional Manager Test Users
export const testRegionalManagers: TestUser[] = [
  {
    id: 'regional-test-001',
    email: 'regional@test.com',
    password: 'RegionalPass123!',
    role: 'regional_manager',
    profile: {
      firstName: 'Regional',
      lastName: 'Manager',
      phone: '+639351234567',
      regionId: 'ncr-manila'
    }
  }
];

// Analyst Test Users
export const testAnalysts: TestUser[] = [
  {
    id: 'analyst-test-001',
    email: 'analyst@test.com',
    password: 'AnalystPass123!',
    role: 'analyst',
    profile: {
      firstName: 'Data',
      lastName: 'Analyst',
      phone: '+639361234567'
    }
  }
];

// Combined test users export
export const testUsers = {
  passengers: testPassengers,
  drivers: testDrivers,
  admins: testAdmins,
  operators: testOperators,
  safetyMonitors: testSafetyMonitors,
  regionalManagers: testRegionalManagers,
  analysts: testAnalysts
};

// Helper functions
export function getTestUser(email: string): TestUser | TestDriver | TestPassenger | undefined {
  const allUsers = [
    ...testPassengers,
    ...testDrivers,
    ...testAdmins,
    ...testOperators,
    ...testSafetyMonitors,
    ...testRegionalManagers,
    ...testAnalysts
  ];
  return allUsers.find(user => user.email === email);
}

export function getRandomPassenger(): TestPassenger {
  return testPassengers[Math.floor(Math.random() * testPassengers.length)];
}

export function getRandomDriver(): TestDriver {
  return testDrivers[Math.floor(Math.random() * testDrivers.length)];
}

export function getTestUserByRole(role: string): TestUser | TestDriver | TestPassenger {
  switch (role) {
    case 'passenger':
      return testPassengers[0];
    case 'driver':
      return testDrivers[0];
    case 'admin':
      return testAdmins[0];
    case 'operator':
      return testOperators[0];
    case 'dispatcher':
      return testOperators[1];
    case 'safety_monitor':
      return testSafetyMonitors[0];
    case 'regional_manager':
      return testRegionalManagers[0];
    case 'analyst':
      return testAnalysts[0];
    default:
      return testPassengers[0];
  }
}
