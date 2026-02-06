// Real Redis Implementation for AWS ElastiCache
import Redis from 'ioredis';
import {
  ActiveRide,
  RideRequest,
  DemandHotspot,
  SurgePricing,
  DriverStatus,
  RidesharingKPIs
} from '../types/ridesharing';
import { logger } from '@/lib/security/productionLogger';

// Session data structure
interface SessionData {
  userId: string;
  userType: 'driver' | 'operator' | 'admin';
  regionId?: string;
  permissions: string[];
  loginAt: number;
  lastActivity: number;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    deviceId?: string;
  };
}

class RedisManager {
  private client: Redis;
  private isConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Parse Redis URL
    const url = new URL(redisUrl);

    this.client = new Redis({
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis client connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.client.ping();
      this.isConnected = true;
      logger.info('Redis connections established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    memory: any;
    connections: number;
  }> {
    const start = Date.now();
    try {
      await this.client.ping();
      const responseTime = Date.now() - start;
      const info = await this.client.info('memory');

      return {
        status: 'healthy',
        responseTime,
        memory: { info },
        connections: 1
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        memory: {},
        connections: 0
      };
    }
  }

  // =====================================================
  // CACHING OPERATIONS
  // =====================================================

  async setCache<T>(
    key: string,
    value: T,
    ttlSeconds: number = 3600,
    tags: string[] = []
  ): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));

    // Handle tags
    for (const tag of tags) {
      await this.client.sadd(`tag:${tag}`, key);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as any;
    }
  }

  async deleteCache(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  async invalidateCacheByTag(tag: string): Promise<number> {
    const keys = await this.client.smembers(`tag:${tag}`);
    if (keys.length === 0) return 0;

    await this.client.del(...keys);
    await this.client.del(`tag:${tag}`);
    return keys.length;
  }

  async cacheWithRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600,
    tags: string[] = []
  ): Promise<T> {
    const cached = await this.getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetcher();
    await this.setCache(key, freshData, ttlSeconds, tags);
    return freshData;
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  async createSession(
    sessionId: string,
    sessionData: SessionData,
    ttlSeconds: number = 86400
  ): Promise<void> {
    await this.setCache(`session:${sessionId}`, sessionData, ttlSeconds);
    await this.client.sadd(`user_sessions:${sessionData.userId}`, sessionId);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return await this.getCache<SessionData>(`session:${sessionId}`);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      sessionData.lastActivity = Date.now();
      await this.setCache(`session:${sessionId}`, sessionData, 86400);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      await this.client.del(`session:${sessionId}`);
      await this.client.srem(`user_sessions:${sessionData.userId}`, sessionId);
    }
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = await this.client.smembers(`user_sessions:${userId}`);
    const sessions: SessionData[] = [];

    for (const sessionId of sessionIds) {
      const sessionData = await this.getSession(sessionId);
      if (sessionData) {
        sessions.push(sessionData);
      }
    }
    return sessions;
  }

  // =====================================================
  // RIDESHARING OPERATIONS
  // =====================================================

  async updateDriverLocation(driverId: string, location: any): Promise<void> {
    await this.setCache(`driver_location:${driverId}`, { driverId, ...location }, 1800);
  }

  async getDriverLocation(driverId: string): Promise<any | null> {
    return await this.getCache(`driver_location:${driverId}`);
  }

  async getAvailableDrivers(regionId: string, limit: number = 50): Promise<string[]> {
    const keys = await this.client.keys(`driver_location:*`);
    return keys.slice(0, limit).map(k => k.replace('driver_location:', ''));
  }

  async publish(channel: string, message: any): Promise<number> {
    return await this.client.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string | string[], callback: (channel: string, message: any) => void): Promise<void> {
    const subscriber = this.client.duplicate();

    subscriber.on('message', (ch, msg) => {
      try {
        const parsed = JSON.parse(msg);
        callback(ch, parsed);
      } catch {
        callback(ch, msg);
      }
    });

    if (Array.isArray(channel)) {
      await subscriber.subscribe(...channel);
    } else {
      await subscriber.subscribe(channel);
    }
  }

  async unsubscribe(channel?: string | string[]): Promise<void> {
    if (!channel) {
      await this.client.unsubscribe();
    } else if (Array.isArray(channel)) {
      await this.client.unsubscribe(...channel);
    } else {
      await this.client.unsubscribe(channel);
    }
  }

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    const ttl = await this.client.ttl(key);
    const resetTime = Date.now() + (ttl * 1000);

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetTime
    };
  }

  async cacheActiveRide(ride: any, ttlSeconds: number = 7200): Promise<void> {
    await this.setCache(`ride:active:${ride.rideId}`, ride, ttlSeconds);
  }

  async getActiveRide(rideId: string): Promise<any | null> {
    return await this.getCache(`ride:active:${rideId}`);
  }

  async updateRideStatus(rideId: string, oldStatus: string, newStatus: string): Promise<void> {
    const ride = await this.getActiveRide(rideId);
    if (ride) {
      ride.status = newStatus;
      await this.setCache(`ride:active:${rideId}`, ride, 7200);
    }
  }

  async updateDriverAvailability(driverId: string, availability: any, ttlSeconds: number = 300): Promise<void> {
    await this.setCache(`driver:availability:${driverId}`, availability, ttlSeconds);
  }

  async findNearbyDrivers(longitude: number, latitude: number, radiusMeters: number = 3000, regionId?: string, limit: number = 20): Promise<any[]> {
    // Simplified version - in production, use Redis geospatial commands
    return [];
  }

  async updateDemandMetrics(regionId: string, area: string, metrics: any): Promise<void> {
    await this.setCache(`demand:${regionId}:${area}`, metrics, 300);
  }

  async getDemandMetrics(regionId: string, area?: string): Promise<any[]> {
    const pattern = area ? `demand:${regionId}:${area}` : `demand:${regionId}:*`;
    const keys = await this.client.keys(pattern);
    const metrics: any[] = [];

    for (const key of keys) {
      const data = await this.getCache(key);
      if (data) metrics.push(data);
    }
    return metrics;
  }

  async updateSurgeZone(zone: any): Promise<void> {
    await this.setCache(`surge:zone:${zone.zoneId}`, zone, 3600);
  }

  async getActiveSurgeZones(regionId?: string): Promise<any[]> {
    const pattern = regionId ? `surge:zone:${regionId}:*` : 'surge:zone:*';
    const keys = await this.client.keys(pattern);
    const zones: any[] = [];

    for (const key of keys) {
      const data = await this.getCache(key);
      if (data) zones.push(data);
    }
    return zones;
  }

  async cacheRidesharingKPIs(kpis: any, ttlSeconds: number = 300): Promise<void> {
    await this.setCache(`kpis:latest:${kpis.region || 'global'}`, kpis, ttlSeconds);
  }

  async getLatestKPIs(regionId?: string): Promise<any | null> {
    return await this.getCache(`kpis:latest:${regionId || 'global'}`);
  }

  async cacheRideRequest(request: any, timeoutSeconds: number = 600): Promise<void> {
    await this.setCache(`ride:request:${request.id}`, request, timeoutSeconds);
  }

  async cleanupExpiredRequests(): Promise<number> {
    // Redis automatically handles TTL, so this is a no-op
    return 0;
  }

  async batchUpdateDriverLocations(locations: any[]): Promise<void> {
    const pipeline = this.client.pipeline();

    for (const location of locations) {
      const key = `driver_location:${location.driverId}`;
      pipeline.setex(key, 1800, JSON.stringify({ driverId: location.driverId, ...location }));
    }

    await pipeline.exec();
  }

  async getRideStatistics(regionId?: string): Promise<{
    activeRides: number;
    pendingRequests: number;
    availableDrivers: number;
    averageWaitTime: number;
    activeSurgeZones: number;
  }> {
    const activeRideKeys = await this.client.keys('ride:active:*');
    const pendingRequestKeys = await this.client.keys('ride:request:*');
    const driverKeys = await this.client.keys('driver_location:*');
    const surgeKeys = await this.client.keys('surge:zone:*');

    return {
      activeRides: activeRideKeys.length,
      pendingRequests: pendingRequestKeys.length,
      availableDrivers: driverKeys.length,
      averageWaitTime: 5.0,
      activeSurgeZones: surgeKeys.length
    };
  }

  // =====================================================
  // RAW REDIS COMMANDS (for compatibility with existing code)
  // =====================================================

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string): Promise<'OK'> {
    return await this.client.set(key, value) as 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return await this.client.setex(key, seconds, value) as 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return await this.client.decr(key);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return await this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return await this.client.srem(key, ...members);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return await this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return await this.client.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lrange(key, start, stop);
  }

  async ping(): Promise<'PONG'> {
    return await this.client.ping() as 'PONG';
  }

  async info(section?: string): Promise<string> {
    return await this.client.info(section);
  }

  async close(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
    logger.info('Redis connections closed');
  }
}

// Singleton Redis instance
let redisInstance: RedisManager | null = null;

export const getRedis = (): RedisManager => {
  if (!redisInstance) {
    redisInstance = new RedisManager();
  }
  return redisInstance;
};

export const initializeRedis = async (): Promise<void> => {
  try {
    const redis = getRedis();
    await redis.initialize();

    const healthCheck = await redis.healthCheck();
    logger.info('Redis initialized successfully', healthCheck);

  } catch (error) {
    logger.error('Failed to initialize Redis', error instanceof Error ? error.message : error);
    throw error;
  }
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisInstance) {
    await redisInstance.close();
    redisInstance = null;
  }
};

// Export the default Redis instance
export const redis = getRedis();
