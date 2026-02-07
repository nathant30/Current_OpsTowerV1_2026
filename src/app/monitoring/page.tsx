'use client';

/**
 * Production Monitoring Dashboard
 *
 * Real-time system health and performance monitoring
 * Displays payment gateways, database, Redis, WebSocket status
 * Shows active users, bookings, error rates
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Database,
  CreditCard,
  Users,
  Car,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Server,
  Wifi,
} from 'lucide-react';

interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  services: ServiceHealth[];
  timestamp: Date;
}

interface ServiceHealth {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
  metrics: Record<string, number>;
}

interface PaymentGatewayHealth {
  provider: string;
  available: boolean;
  successRate: number;
  avgResponseTime: number;
  totalTransactions: number;
  failedTransactions: number;
}

export default function MonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [paymentHealth, setPaymentHealth] = useState<{ gateways: PaymentGatewayHealth[] } | null>(null);
  const [databaseHealth, setDatabaseHealth] = useState<any>(null);
  const [redisHealth, setRedisHealth] = useState<any>(null);
  const [websocketHealth, setWebsocketHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch health data
  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all health endpoints in parallel
      const [systemRes, paymentRes, dbRes, redisRes, wsRes] = await Promise.allSettled([
        fetch('/api/monitoring/health?detailed=true'),
        fetch('/api/health/payments'),
        fetch('/api/health/database'),
        fetch('/api/health/redis'),
        fetch('/api/health/websockets'),
      ]);

      // Process system health
      if (systemRes.status === 'fulfilled' && systemRes.value.ok) {
        const data = await systemRes.value.json();
        setSystemHealth(data.data);
      }

      // Process payment health
      if (paymentRes.status === 'fulfilled' && paymentRes.value.ok) {
        const data = await paymentRes.value.json();
        setPaymentHealth(data.data);
      }

      // Process database health
      if (dbRes.status === 'fulfilled' && dbRes.value.ok) {
        const data = await dbRes.value.json();
        setDatabaseHealth(data.data);
      }

      // Process Redis health
      if (redisRes.status === 'fulfilled' && redisRes.value.ok) {
        const data = await redisRes.value.json();
        setRedisHealth(data.data);
      }

      // Process WebSocket health
      if (wsRes.status === 'fulfilled' && wsRes.value.ok) {
        const data = await wsRes.value.json();
        setWebsocketHealth(data.data);
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch health data:', err);
      setError('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY':
        return 'text-green-600 bg-green-100';
      case 'DEGRADED':
        return 'text-yellow-600 bg-yellow-100';
      case 'UNHEALTHY':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'HEALTHY':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'DEGRADED':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'UNHEALTHY':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading && !systemHealth) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading monitoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
          <button
            onClick={fetchHealthData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overall System Health */}
      {systemHealth && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(systemHealth.overall)}
                <div>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Overall system status</CardDescription>
                </div>
              </div>
              <Badge className={getStatusColor(systemHealth.overall)}>
                {systemHealth.overall}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {systemHealth.services.map((service) => (
                <div
                  key={service.name}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize">{service.name.replace('_', ' ')}</span>
                    {getStatusIcon(service.status)}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Response: {service.responseTime}ms</div>
                    <div>Uptime: {Math.round(service.uptime / 60)}m</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Gateways Status */}
      {paymentHealth && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Payment Gateways</CardTitle>
                <CardDescription>Maya and GCash availability</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentHealth.gateways.map((gateway) => (
                <div
                  key={gateway.provider}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold capitalize">{gateway.provider}</h3>
                      {gateway.available ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <Badge className={gateway.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {gateway.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="font-semibold">{gateway.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Response:</span>
                      <span className="font-semibold">{gateway.avgResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Transactions:</span>
                      <span className="font-semibold">{gateway.totalTransactions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Failed Transactions:</span>
                      <span className="font-semibold text-red-600">{gateway.failedTransactions}</span>
                    </div>
                  </div>

                  {/* Success rate progress bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${gateway.successRate >= 95 ? 'bg-green-500' : gateway.successRate >= 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${gateway.successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Infrastructure Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database */}
        {databaseHealth && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-purple-600" />
                <div>
                  <CardTitle>Database</CardTitle>
                  <CardDescription>PostgreSQL</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge className={getStatusColor(databaseHealth.status)}>
                    {databaseHealth.status}
                  </Badge>
                </div>
                {databaseHealth.metrics && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Response Time:</span>
                      <span className="font-semibold">{databaseHealth.metrics.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Connections:</span>
                      <span className="font-semibold">{databaseHealth.metrics.total || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Idle Connections:</span>
                      <span className="font-semibold">{databaseHealth.metrics.idle || 0}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Redis */}
        {redisHealth && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Server className="h-6 w-6 text-red-600" />
                <div>
                  <CardTitle>Redis</CardTitle>
                  <CardDescription>Cache Server</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge className={getStatusColor(redisHealth.status)}>
                    {redisHealth.status === 'not_configured' ? 'Optional' : redisHealth.status}
                  </Badge>
                </div>
                {redisHealth.metrics && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Response Time:</span>
                    <span className="font-semibold">{redisHealth.metrics.responseTime}ms</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* WebSocket */}
        {websocketHealth && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Wifi className="h-6 w-6 text-green-600" />
                <div>
                  <CardTitle>WebSocket</CardTitle>
                  <CardDescription>Real-time Server</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge className={getStatusColor(websocketHealth.status)}>
                    {websocketHealth.status}
                  </Badge>
                </div>
                {websocketHealth.metrics && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active Connections:</span>
                      <span className="font-semibold">{websocketHealth.metrics.activeConnections}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Connections:</span>
                      <span className="font-semibold">{websocketHealth.metrics.totalConnections}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common monitoring tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left">
              <TrendingUp className="h-6 w-6 text-blue-600 mb-2" />
              <div className="font-semibold">View Analytics</div>
              <div className="text-xs text-gray-600">Payment statistics</div>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mb-2" />
              <div className="font-semibold">View Alerts</div>
              <div className="text-xs text-gray-600">Active incidents</div>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Users className="h-6 w-6 text-green-600 mb-2" />
              <div className="font-semibold">Active Users</div>
              <div className="text-xs text-gray-600">Live sessions</div>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Car className="h-6 w-6 text-purple-600 mb-2" />
              <div className="font-semibold">Active Drivers</div>
              <div className="text-xs text-gray-600">Online drivers</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
