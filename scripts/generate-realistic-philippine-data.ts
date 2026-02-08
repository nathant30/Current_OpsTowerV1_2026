#!/usr/bin/env ts-node
/**
 * Realistic Philippine Data Generator
 * Generates production-ready mock data for OpsTower
 *
 * Usage:
 *   ts-node scripts/generate-realistic-philippine-data.ts --type=drivers --count=50
 *   ts-node scripts/generate-realistic-philippine-data.ts --type=bookings --count=200
 *   ts-node scripts/generate-realistic-philippine-data.ts --type=passengers --count=50
 */

// Filipino Names (Most Common)
export const FILIPINO_FIRST_NAMES = {
  male: [
    'Juan', 'Jose', 'Pedro', 'Miguel', 'Carlos', 'Roberto', 'Antonio', 'Francisco',
    'Ricardo', 'Ramon', 'Fernando', 'Eduardo', 'Manuel', 'Rafael', 'Gabriel',
    'Daniel', 'Luis', 'Jorge', 'Mario', 'Alberto', 'Javier', 'Diego', 'Andres',
    'Felipe', 'Enrique', 'Raul', 'Sergio', 'Pablo', 'Oscar', 'Victor'
  ],
  female: [
    'Maria', 'Ana', 'Rosa', 'Carmen', 'Luz', 'Elena', 'Sofia', 'Isabel',
    'Patricia', 'Cristina', 'Angela', 'Teresa', 'Josefina', 'Lucia', 'Beatriz',
    'Margarita', 'Catalina', 'Gloria', 'Adriana', 'Monica', 'Silvia', 'Diana',
    'Veronica', 'Laura', 'Sandra', 'Alicia', 'Natalia', 'Victoria', 'Gabriela', 'Claudia'
  ]
};

export const FILIPINO_LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Gonzales', 'Flores', 'Mendoza',
  'Torres', 'Ramos', 'Lopez', 'Perez', 'Dela Cruz', 'Rivera', 'Fernandez', 'Villanueva',
  'Morales', 'Herrera', 'Jimenez', 'Alvarez', 'Romero', 'Navarro', 'Ruiz', 'Gutierrez',
  'Vargas', 'Aquino', 'Castro', 'Ortiz', 'Gomez', 'Diaz', 'Marquez', 'Sanchez'
];

// Metro Manila Locations
export const METRO_MANILA_LOCATIONS = {
  'Quezon City': {
    barangays: [
      'Diliman', 'Commonwealth', 'Fairview', 'Novaliches', 'Project 4', 'Project 6',
      'Project 8', 'Cubao', 'Araneta Center', 'Balintawak', 'Kamuning', 'South Triangle',
      'Batasan Hills', 'Holy Spirit', 'North Fairview', 'Payatas', 'Bagong Silangan',
      'Tandang Sora', 'Veterans Village', 'Quirino District'
    ],
    streets: [
      'Commonwealth Avenue', 'Quezon Avenue', 'España Boulevard', 'Aurora Boulevard',
      'Katipunan Avenue', 'Timog Avenue', 'Tomas Morato', 'Scout Area', 'Kamias Road'
    ],
    landmarks: [
      'SM North EDSA', 'Trinoma', 'Gateway Mall', 'Araneta Coliseum', 'UP Diliman',
      'Quezon Memorial Circle', 'Eastwood City', 'Ateneo de Manila', 'La Mesa Dam'
    ],
    postalCodes: ['1100', '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109']
  },
  'Manila': {
    barangays: [
      'Ermita', 'Malate', 'Sampaloc', 'Tondo', 'Binondo', 'Quiapo', 'Intramuros',
      'Sta. Cruz', 'Paco', 'San Miguel', 'Pandacan', 'Sta. Ana', 'Port Area'
    ],
    streets: [
      'Taft Avenue', 'Roxas Boulevard', 'Rizal Avenue', 'España Boulevard',
      'Quirino Avenue', 'Pedro Gil', 'Del Pilar', 'Mabini Street'
    ],
    landmarks: [
      'Rizal Park', 'Manila Ocean Park', 'Intramuros', 'Binondo Chinatown',
      'SM Manila', 'Robinson Place Manila', 'Manila City Hall', 'Manila Cathedral'
    ],
    postalCodes: ['1000', '1001', '1002', '1003', '1004', '1005', '1006']
  },
  'Makati': {
    barangays: [
      'Poblacion', 'Bel-Air', 'Urdaneta', 'San Lorenzo', 'Salcedo Village',
      'Legaspi Village', 'Magallanes Village', 'Forbes Park', 'Dasmariñas Village',
      'Pio del Pilar', 'San Antonio', 'Guadalupe Nuevo', 'Guadalupe Viejo'
    ],
    streets: [
      'Ayala Avenue', 'Makati Avenue', 'Gil Puyat Avenue', 'EDSA', 'Chino Roces Avenue',
      'Paseo de Roxas', 'Jupiter Street', 'Polaris Street', 'Kalayaan Avenue'
    ],
    landmarks: [
      'Greenbelt', 'Glorietta', 'Ayala Triangle', 'Power Plant Mall', 'The Fort',
      'Makati Cinema Square', 'Landmark Makati', 'Rockwell Center'
    ],
    postalCodes: ['1200', '1209', '1210', '1211', '1226', '1227', '1229']
  },
  'Taguig': {
    barangays: [
      'Fort Bonifacio', 'BGC', 'Upper Bicutan', 'Lower Bicutan', 'Western Bicutan',
      'Signal Village', 'Hagonoy', 'Wawa', 'Tuktukan', 'Ususan', 'Napindan'
    ],
    streets: [
      '5th Avenue', '7th Avenue', 'McKinley Road', 'Lawton Avenue', 'C5 Road',
      'Market Market Drive', 'Bayani Road', 'General Santos Avenue'
    ],
    landmarks: [
      'BGC (Bonifacio Global City)', 'Market! Market!', 'SM Aura', 'Venice Grand Canal',
      'Manila American Cemetery', 'Mind Museum', 'Bonifacio High Street', 'Serendra'
    ],
    postalCodes: ['1630', '1631', '1632', '1633', '1634', '1635']
  },
  'Pasig': {
    barangays: [
      'Kapitolyo', 'Ortigas Center', 'Rosario', 'Ugong', 'Caniogan', 'Maybunga',
      'San Joaquin', 'Santolan', 'Manggahan', 'Pinagbuhatan', 'Sagad', 'Malinao'
    ],
    streets: [
      'Ortigas Avenue', 'Shaw Boulevard', 'Meralco Avenue', 'C5 Road', 'Julia Vargas Avenue',
      'ADB Avenue', 'EDSA', 'Caruncho Avenue', 'Marcos Highway'
    ],
    landmarks: [
      'SM Megamall', 'The Podium', 'Shangri-La Plaza', 'Estancia Mall', 'Tiendesitas',
      'Ortigas Center', 'Capitol Commons', 'Greenfield District'
    ],
    postalCodes: ['1600', '1601', '1602', '1603', '1604', '1605']
  }
};

// Common Manila Routes (Pickup → Dropoff)
export const COMMON_ROUTES = [
  {
    from: { name: 'SM North EDSA', city: 'Quezon City', coords: [121.0295, 14.6566] },
    to: { name: 'Ayala Triangle', city: 'Makati', coords: [121.0170, 14.6537] },
    distance: 15.2,
    duration: 35,
    baseFare: 285
  },
  {
    from: { name: 'NAIA Terminal 3', city: 'Pasay', coords: [121.0196, 14.5086] },
    to: { name: 'Makati CBD', city: 'Makati', coords: [121.0244, 14.5547] },
    distance: 9.8,
    duration: 25,
    baseFare: 220
  },
  {
    from: { name: 'Quezon City Circle', city: 'Quezon City', coords: [121.0505, 14.6546] },
    to: { name: 'BGC', city: 'Taguig', coords: [121.0484, 14.5517] },
    distance: 17.5,
    duration: 40,
    baseFare: 350
  },
  {
    from: { name: 'Mall of Asia', city: 'Pasay', coords: [120.9822, 14.5361] },
    to: { name: 'EDSA Shangri-La', city: 'Mandaluyong', coords: [121.0564, 14.5794] },
    distance: 21.3,
    duration: 50,
    baseFare: 450
  },
  {
    from: { name: 'Trinoma', city: 'Quezon City', coords: [121.0330, 14.6558] },
    to: { name: 'Greenbelt', city: 'Makati', coords: [121.0210, 14.5524] },
    distance: 13.7,
    duration: 32,
    baseFare: 270
  },
  {
    from: { name: 'UP Diliman', city: 'Quezon City', coords: [121.0645, 14.6537] },
    to: { name: 'SM Mall of Asia', city: 'Pasay', coords: [120.9822, 14.5361] },
    distance: 19.2,
    duration: 45,
    baseFare: 390
  },
  {
    from: { name: 'Eastwood City', city: 'Quezon City', coords: [121.0778, 14.6090] },
    to: { name: 'Ortigas Center', city: 'Pasig', coords: [121.0567, 14.5866] },
    distance: 6.5,
    duration: 18,
    baseFare: 140
  },
  {
    from: { name: 'Manila Ocean Park', city: 'Manila', coords: [120.9736, 14.5797] },
    to: { name: 'Intramuros', city: 'Manila', coords: [120.9736, 14.5920] },
    distance: 2.1,
    duration: 8,
    baseFare: 65
  },
  {
    from: { name: 'Bonifacio High Street', city: 'Taguig', coords: [121.0477, 14.5506] },
    to: { name: 'Market! Market!', city: 'Taguig', coords: [121.0555, 14.5485] },
    distance: 1.8,
    duration: 7,
    baseFare: 55
  },
  {
    from: { name: 'SM Megamall', city: 'Mandaluyong', coords: [121.0567, 14.5847] },
    to: { name: 'Rockwell Center', city: 'Makati', coords: [121.0363, 14.5655] },
    distance: 4.2,
    duration: 15,
    baseFare: 95
  }
];

// Philippine Vehicles (Most Common)
export const PHILIPPINE_VEHICLES = {
  cars: [
    { make: 'Toyota', model: 'Vios', years: [2018, 2019, 2020, 2021, 2022, 2023], colors: ['White', 'Silver', 'Black', 'Gray'] },
    { make: 'Toyota', model: 'Wigo', years: [2019, 2020, 2021, 2022, 2023], colors: ['Red', 'White', 'Silver', 'Blue'] },
    { make: 'Honda', model: 'City', years: [2018, 2019, 2020, 2021, 2022, 2023], colors: ['White', 'Black', 'Silver', 'Blue'] },
    { make: 'Mitsubishi', model: 'Mirage', years: [2018, 2019, 2020, 2021, 2022], colors: ['White', 'Red', 'Blue', 'Black'] },
    { make: 'Toyota', model: 'Innova', years: [2018, 2019, 2020, 2021, 2022], colors: ['White', 'Silver', 'Gray', 'Black'] },
    { make: 'Suzuki', model: 'Ertiga', years: [2019, 2020, 2021, 2022, 2023], colors: ['White', 'Silver', 'Blue', 'Black'] },
    { make: 'Hyundai', model: 'Accent', years: [2018, 2019, 2020, 2021], colors: ['White', 'Red', 'Blue', 'Silver'] },
    { make: 'Mazda', model: '2', years: [2019, 2020, 2021, 2022], colors: ['Red', 'White', 'Blue', 'Gray'] }
  ],
  motorcycles: [
    { make: 'Honda', model: 'Click 160', years: [2018, 2019, 2020, 2021, 2022, 2023], colors: ['Black', 'Red', 'White', 'Blue'] },
    { make: 'Yamaha', model: 'NMAX', years: [2018, 2019, 2020, 2021, 2022, 2023], colors: ['Gray', 'Blue', 'Black', 'White'] },
    { make: 'Suzuki', model: 'Raider R150', years: [2018, 2019, 2020, 2021, 2022], colors: ['Black', 'Red', 'Blue'] },
    { make: 'Honda', model: 'TMX 155', years: [2019, 2020, 2021, 2022, 2023], colors: ['Black', 'Red', 'White'] },
    { make: 'Yamaha', model: 'Mio i125', years: [2019, 2020, 2021, 2022, 2023], colors: ['Pink', 'White', 'Blue', 'Black'] },
    { make: 'Suzuki', model: 'Smash 115', years: [2018, 2019, 2020, 2021, 2022], colors: ['Black', 'Blue', 'Red'] }
  ]
};

// Utility Functions
export function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function generatePhilippinePhoneNumber(): string {
  const prefixes = ['917', '918', '919', '920', '921', '922', '923', '924', '925', '926', '927', '928', '929', '930'];
  const prefix = randomFromArray(prefixes);
  const number = randomInt(1000000, 9999999);
  return `+639${prefix.slice(2)}${number}`;
}

export function generatePlateNumber(type: 'car' | 'motorcycle'): string {
  if (type === 'car') {
    const letters = ['ABC', 'XYZ', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU', 'VWX', 'NCR'];
    return `${randomFromArray(letters)}-${randomInt(1000, 9999)}`;
  } else {
    return `${randomInt(1000, 9999)}-${randomFromArray(['AB', 'XY', 'CD', 'EF', 'GH', 'NC'])}`;
  }
}

export function generateRealisticDriver(id: number, regionCode: string = 'MMD') {
  const gender = Math.random() > 0.7 ? 'female' : 'male'; // 70% male drivers (realistic)
  const firstName = randomFromArray(FILIPINO_FIRST_NAMES[gender]);
  const lastName = randomFromArray(FILIPINO_LAST_NAMES);

  const cities = Object.keys(METRO_MANILA_LOCATIONS);
  const city = randomFromArray(cities);
  const location = METRO_MANILA_LOCATIONS[city];
  const barangay = randomFromArray(location.barangays);
  const street = randomFromArray(location.streets);
  const postalCode = randomFromArray(location.postalCodes);

  const vehicleType = Math.random() > 0.4 ? 'car' : 'motorcycle'; // 60% cars
  const vehicle = vehicleType === 'car'
    ? randomFromArray(PHILIPPINE_VEHICLES.cars)
    : randomFromArray(PHILIPPINE_VEHICLES.motorcycles);

  const services = vehicleType === 'car'
    ? ['ride_4w', 'send_delivery']
    : ['ride_2w', 'eats_delivery'];

  return {
    id: `drv-${String(id).padStart(4, '0')}`,
    driverCode: `XPR${String(id).padStart(4, '0')}`,
    firstName,
    lastName,
    middleName: randomFromArray(FILIPINO_LAST_NAMES),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@xpress.ph`,
    phone: generatePhilippinePhoneNumber(),
    dateOfBirth: new Date(1975 + randomInt(0, 25), randomInt(0, 11), randomInt(1, 28)),
    address: {
      street: `${randomInt(1, 999)} ${street}`,
      barangay,
      city,
      province: 'Metro Manila',
      postalCode,
      coordinates: {
        type: 'Point',
        coordinates: [
          120.9822 + randomFloat(-0.1, 0.1, 4),
          14.6042 + randomFloat(-0.1, 0.1, 4)
        ]
      }
    },
    regionId: regionCode,
    services,
    primaryService: services[0],
    status: randomFromArray(['active', 'active', 'active', 'busy', 'offline']), // 60% active
    verificationLevel: randomInt(3, 5),
    isVerified: true,
    backgroundCheckDate: new Date(2024, randomInt(0, 11), randomInt(1, 28)),
    rating: randomFloat(4.2, 5.0, 1),
    totalTrips: randomInt(50, 3000),
    completedTrips: function() { return Math.floor(this.totalTrips * randomFloat(0.92, 0.98, 2)); },
    cancelledTrips: function() { return this.totalTrips - this.completedTrips(); },
    walletBalance: randomFloat(500, 25000, 2),
    earningsToday: randomFloat(200, 2500, 2),
    earningsWeek: randomFloat(1500, 12000, 2),
    earningsMonth: randomFloat(8000, 50000, 2),
    vehicleInfo: {
      make: vehicle.make,
      model: vehicle.model,
      year: randomFromArray(vehicle.years),
      plateNumber: generatePlateNumber(vehicleType),
      color: randomFromArray(vehicle.colors),
      type: vehicleType,
      registrationNumber: `REG-${randomInt(10000, 99999)}`,
      insuranceDetails: {
        provider: randomFromArray([
          'Philippine AXA Life', 'BPI MS Insurance', 'Manulife Philippines',
          'Prudential Life', 'Sun Life', 'Philam Life'
        ]),
        policyNumber: `POL-${randomInt(100000, 999999)}`,
        expiryDate: new Date(2025, randomInt(6, 11), randomInt(1, 28))
      }
    },
    licenseInfo: {
      licenseNumber: `N${String(randomInt(10, 99))}-${String(randomInt(10, 99))}-${randomInt(100000, 999999)}`,
      licenseType: 'Professional',
      expiryDate: new Date(2026 + randomInt(0, 3), randomInt(0, 11), randomInt(1, 28)),
      restrictions: randomInt(0, 5) === 0 ? ['1', '2'] : []
    },
    documents: {
      profilePhoto: {
        id: `doc-${id}`,
        filename: `driver-${id}-profile.jpg`,
        url: `/uploads/drivers/${id}/profile.jpg`,
        uploadedAt: new Date(2024, randomInt(0, 11), randomInt(1, 28)),
        verifiedAt: new Date(2024, randomInt(0, 11), randomInt(1, 28)),
        status: 'verified'
      }
    },
    certifications: [],
    lastLogin: new Date(),
    isActive: true,
    createdAt: new Date(2023, randomInt(6, 11), randomInt(1, 28)),
    updatedAt: new Date()
  };
}

export function generateRealisticBooking(id: number, driverId?: string, customerId?: string) {
  const route = randomFromArray(COMMON_ROUTES);
  const serviceType = Math.random() > 0.3 ? 'ride_4w' :
                     Math.random() > 0.5 ? 'ride_2w' : 'send_delivery';

  const surgeMultiplier = Math.random() > 0.7 ? randomFloat(1.2, 2.0, 1) : 1.0;
  const totalFare = route.baseFare * surgeMultiplier;

  const statuses = ['completed', 'completed', 'completed', 'in_progress', 'pending', 'cancelled'];
  const status = randomFromArray(statuses);

  const requestedAt = new Date(Date.now() - randomInt(1, 48) * 60 * 60 * 1000);

  return {
    id: `bkg-${String(id).padStart(5, '0')}`,
    bookingReference: `XPR-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(id).padStart(3, '0')}`,
    serviceType,
    status,
    customerId: customerId || `cust-${randomInt(1000, 9999)}`,
    customerInfo: {
      name: `${randomFromArray(FILIPINO_FIRST_NAMES.male)} ${randomFromArray(FILIPINO_LAST_NAMES)}`,
      phone: generatePhilippinePhoneNumber(),
      email: `customer${id}@example.com`,
      rating: randomFloat(4.0, 5.0, 1)
    },
    driverId: driverId || `drv-${String(randomInt(1, 50)).padStart(4, '0')}`,
    assignedAt: status !== 'pending' ? new Date(requestedAt.getTime() + randomInt(30, 180) * 1000) : undefined,
    acceptedAt: status !== 'pending' ? new Date(requestedAt.getTime() + randomInt(45, 240) * 1000) : undefined,
    pickupLocation: {
      type: 'Point',
      coordinates: route.from.coords
    },
    pickupAddress: `${route.from.name}, ${route.from.city}`,
    dropoffLocation: {
      type: 'Point',
      coordinates: route.to.coords
    },
    dropoffAddress: `${route.to.name}, ${route.to.city}`,
    regionId: 'reg-001',
    serviceDetails: {
      passengerCount: randomInt(1, 4),
      vehiclePreference: serviceType === 'ride_4w' ? randomFromArray(['sedan', 'suv', 'any']) : undefined,
      packageSize: serviceType === 'send_delivery' ? randomFromArray(['small', 'medium', 'large']) : undefined
    },
    baseFare: route.baseFare,
    surgeMultiplier,
    totalFare: parseFloat(totalFare.toFixed(2)),
    paymentStatus: status === 'completed' ? 'completed' :
                   status === 'in_progress' ? 'processing' : 'pending',
    paymentMethod: randomFromArray(['gcash', 'gcash', 'cash', 'credit_card', 'maya']),
    requestedAt,
    estimatedPickupTime: new Date(requestedAt.getTime() + randomInt(5, 15) * 60 * 1000),
    actualPickupTime: status !== 'pending' ? new Date(requestedAt.getTime() + randomInt(6, 20) * 60 * 1000) : undefined,
    estimatedCompletionTime: new Date(requestedAt.getTime() + (route.duration + 10) * 60 * 1000),
    completedAt: status === 'completed' ? new Date(requestedAt.getTime() + route.duration * 60 * 1000) : undefined,
    customerRating: status === 'completed' ? randomInt(4, 5) : undefined,
    driverRating: status === 'completed' ? randomInt(4, 5) : undefined,
    createdAt: requestedAt,
    updatedAt: new Date()
  };
}

export function generateRealisticPassenger(id: number) {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const firstName = randomFromArray(FILIPINO_FIRST_NAMES[gender]);
  const lastName = randomFromArray(FILIPINO_LAST_NAMES);

  const cities = Object.keys(METRO_MANILA_LOCATIONS);
  const city = randomFromArray(cities);
  const location = METRO_MANILA_LOCATIONS[city];
  const barangay = randomFromArray(location.barangays);
  const street = randomFromArray(location.streets);
  const postalCode = randomFromArray(location.postalCodes);

  return {
    id: `pass-${String(id).padStart(4, '0')}`,
    passengerId: `PSG-${String(id).padStart(4, '0')}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@example.com`,
    phoneNumber: generatePhilippinePhoneNumber(),
    address: {
      street: `${randomInt(1, 999)} ${street}`,
      barangay,
      city,
      province: 'Metro Manila',
      postalCode
    },
    totalBookings: randomInt(5, 500),
    totalSpent: randomFloat(1000, 50000, 2),
    averageRating: randomFloat(4.0, 5.0, 1),
    cancellationRate: randomFloat(0, 15, 1),
    accountStatus: 'active',
    tier: randomFromArray(['Regular', 'Regular', 'Regular', 'Premium', 'VIP']),
    paymentMethods: [
      { type: 'gcash', primary: true, verified: true },
      { type: 'cash', primary: false, verified: true }
    ],
    preferences: {
      preferredVehicleType: randomFromArray(['car', 'motorcycle', 'any']),
      preferredPaymentMethod: 'gcash',
      receivePromotions: Math.random() > 0.3
    },
    createdAt: new Date(2023, randomInt(0, 11), randomInt(1, 28)),
    updatedAt: new Date(),
    lastActivityAt: new Date()
  };
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const type = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'drivers';
  const count = parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1] || '10');

  console.log(`Generating ${count} realistic Philippine ${type}...\n`);

  switch (type) {
    case 'drivers':
      for (let i = 1; i <= count; i++) {
        const driver = generateRealisticDriver(i);
        console.log(JSON.stringify(driver, null, 2));
        if (i < count) {console.log(',');}
      }
      break;

    case 'bookings':
      for (let i = 1; i <= count; i++) {
        const booking = generateRealisticBooking(i);
        console.log(JSON.stringify(booking, null, 2));
        if (i < count) {console.log(',');}
      }
      break;

    case 'passengers':
      for (let i = 1; i <= count; i++) {
        const passenger = generateRealisticPassenger(i);
        console.log(JSON.stringify(passenger, null, 2));
        if (i < count) {console.log(',');}
      }
      break;

    default:
      console.error(`Unknown type: ${type}. Use --type=drivers|bookings|passengers`);
      process.exit(1);
  }

  console.log(`\n\n✅ Generated ${count} realistic Philippine ${type}`);
}
