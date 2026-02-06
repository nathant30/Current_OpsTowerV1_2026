/**
 * E2E Test Location Fixtures
 * Common locations in Metro Manila for testing ride bookings
 */

export interface TestLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'pickup' | 'dropoff' | 'both';
  region: string;
}

// Popular pickup/dropoff locations in Metro Manila
export const testLocations: TestLocation[] = [
  // Makati CBD
  {
    name: 'Glorietta Mall',
    address: 'Ayala Center, Makati City',
    latitude: 14.5496,
    longitude: 121.0195,
    type: 'both',
    region: 'ncr-manila'
  },
  {
    name: 'Greenbelt',
    address: 'Ayala Center, Makati City',
    latitude: 14.5531,
    longitude: 121.0217,
    type: 'both',
    region: 'ncr-manila'
  },

  // BGC (Bonifacio Global City)
  {
    name: 'BGC High Street',
    address: 'Bonifacio Global City, Taguig',
    latitude: 14.5513,
    longitude: 121.0490,
    type: 'both',
    region: 'ncr-manila'
  },
  {
    name: 'Market! Market!',
    address: 'Bonifacio Global City, Taguig',
    latitude: 14.5476,
    longitude: 121.0539,
    type: 'both',
    region: 'ncr-manila'
  },

  // Pasay/MOA Area
  {
    name: 'SM Mall of Asia',
    address: 'Seaside Boulevard, Pasay City',
    latitude: 14.5353,
    longitude: 120.9823,
    type: 'both',
    region: 'ncr-manila'
  },
  {
    name: 'NAIA Terminal 3',
    address: 'Ninoy Aquino International Airport, Pasay City',
    latitude: 14.5086,
    longitude: 121.0198,
    type: 'both',
    region: 'ncr-manila'
  },

  // Quezon City
  {
    name: 'SM North EDSA',
    address: 'North Avenue, Quezon City',
    latitude: 14.6560,
    longitude: 121.0294,
    type: 'both',
    region: 'ncr-manila'
  },
  {
    name: 'UP Diliman',
    address: 'University of the Philippines, Quezon City',
    latitude: 14.6540,
    longitude: 121.0676,
    type: 'both',
    region: 'ncr-manila'
  },
  {
    name: 'Trinoma Mall',
    address: 'North Avenue, Quezon City',
    latitude: 14.6553,
    longitude: 121.0323,
    type: 'both',
    region: 'ncr-manila'
  },

  // Manila
  {
    name: 'Intramuros',
    address: 'Intramuros, Manila',
    latitude: 14.5896,
    longitude: 120.9752,
    type: 'both',
    region: 'ncr-manila'
  },
  {
    name: 'Rizal Park',
    address: 'Ermita, Manila',
    latitude: 14.5831,
    longitude: 120.9794,
    type: 'both',
    region: 'ncr-manila'
  },

  // Mandaluyong
  {
    name: 'SM Megamall',
    address: 'EDSA, Mandaluyong City',
    latitude: 14.5852,
    longitude: 121.0560,
    type: 'both',
    region: 'ncr-manila'
  },
  {
    name: 'Shangri-La Plaza',
    address: 'EDSA, Mandaluyong City',
    latitude: 14.5814,
    longitude: 121.0528,
    type: 'both',
    region: 'ncr-manila'
  },

  // Pasig
  {
    name: 'Ortigas Center',
    address: 'Ortigas Center, Pasig City',
    latitude: 14.5860,
    longitude: 121.0577,
    type: 'both',
    region: 'ncr-manila'
  },
  {
    name: 'Capitol Commons',
    address: 'Kapitolyo, Pasig City',
    latitude: 14.5691,
    longitude: 121.0625,
    type: 'both',
    region: 'ncr-manila'
  },

  // Residential areas (typical pickup points)
  {
    name: 'Poblacion, Makati',
    address: 'Poblacion, Makati City',
    latitude: 14.5615,
    longitude: 121.0304,
    type: 'pickup',
    region: 'ncr-manila'
  },
  {
    name: 'Rockwell Center',
    address: 'Rockwell, Makati City',
    latitude: 14.5628,
    longitude: 121.0371,
    type: 'both',
    region: 'ncr-manila'
  }
];

// Route scenarios for testing
export interface RouteScenario {
  name: string;
  description: string;
  pickup: TestLocation;
  dropoff: TestLocation;
  estimatedDistance: number; // in km
  estimatedDuration: number; // in minutes
  estimatedFare: number; // in PHP
  trafficLevel: 'light' | 'moderate' | 'heavy';
}

export const testRoutes: RouteScenario[] = [
  {
    name: 'Short city ride',
    description: 'Makati CBD to BGC',
    pickup: testLocations[0], // Glorietta
    dropoff: testLocations[2], // BGC High Street
    estimatedDistance: 5.2,
    estimatedDuration: 15,
    estimatedFare: 120,
    trafficLevel: 'moderate'
  },
  {
    name: 'Medium city ride',
    description: 'Quezon City to Makati',
    pickup: testLocations[6], // SM North EDSA
    dropoff: testLocations[1], // Greenbelt
    estimatedDistance: 12.5,
    estimatedDuration: 35,
    estimatedFare: 250,
    trafficLevel: 'heavy'
  },
  {
    name: 'Airport transfer',
    description: 'BGC to NAIA Terminal 3',
    pickup: testLocations[2], // BGC High Street
    dropoff: testLocations[5], // NAIA T3
    estimatedDistance: 8.3,
    estimatedDuration: 25,
    estimatedFare: 180,
    trafficLevel: 'moderate'
  },
  {
    name: 'Mall to mall',
    description: 'SM Mall of Asia to SM Megamall',
    pickup: testLocations[4], // SM MOA
    dropoff: testLocations[11], // SM Megamall
    estimatedDistance: 10.7,
    estimatedDuration: 30,
    estimatedFare: 220,
    trafficLevel: 'heavy'
  },
  {
    name: 'Short neighborhood ride',
    description: 'Poblacion to Rockwell',
    pickup: testLocations[15], // Poblacion
    dropoff: testLocations[16], // Rockwell
    estimatedDistance: 2.1,
    estimatedDuration: 8,
    estimatedFare: 80,
    trafficLevel: 'light'
  },
  {
    name: 'Long cross-city ride',
    description: 'UP Diliman to SM Mall of Asia',
    pickup: testLocations[7], // UP Diliman
    dropoff: testLocations[4], // SM MOA
    estimatedDistance: 18.5,
    estimatedDuration: 50,
    estimatedFare: 380,
    trafficLevel: 'heavy'
  },
  {
    name: 'Tourist route',
    description: 'Intramuros to Rizal Park',
    pickup: testLocations[9], // Intramuros
    dropoff: testLocations[10], // Rizal Park
    estimatedDistance: 1.2,
    estimatedDuration: 5,
    estimatedFare: 60,
    trafficLevel: 'light'
  },
  {
    name: 'Business district transfer',
    description: 'Makati to Ortigas',
    pickup: testLocations[0], // Glorietta
    dropoff: testLocations[13], // Ortigas Center
    estimatedDistance: 7.8,
    estimatedDuration: 22,
    estimatedFare: 160,
    trafficLevel: 'moderate'
  }
];

// Helper functions
export function getRandomLocation(type?: 'pickup' | 'dropoff' | 'both'): TestLocation {
  const filtered = type
    ? testLocations.filter(loc => loc.type === type || loc.type === 'both')
    : testLocations;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function getRandomRoute(): RouteScenario {
  return testRoutes[Math.floor(Math.random() * testRoutes.length)];
}

export function findLocation(name: string): TestLocation | undefined {
  return testLocations.find(loc => loc.name.toLowerCase().includes(name.toLowerCase()));
}

export function getLocationsNearby(lat: number, lng: number, radiusKm: number = 5): TestLocation[] {
  return testLocations.filter(loc => {
    const distance = calculateDistance(lat, lng, loc.latitude, loc.longitude);
    return distance <= radiusKm;
  });
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
