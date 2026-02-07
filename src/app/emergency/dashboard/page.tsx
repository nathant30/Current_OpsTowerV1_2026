'use client';

/**
 * Emergency Response Dashboard
 * Real-time emergency management interface for operators
 * Auto-refreshes every 5 seconds, displays active alerts on map
 * Issue #12 - Emergency System Enhancement
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Filter,
  Search,
  RefreshCw,
  Download
} from 'lucide-react';
import EmergencyAlertCard from '@/components/emergency/EmergencyAlertCard';
import EmergencyMap from '@/components/emergency/EmergencyMap';
import EmergencyDetailsModal from '@/components/emergency/EmergencyDetailsModal';
import EmergencyFilters from '@/components/emergency/EmergencyFilters';
import EmergencyHistoryTable from '@/components/emergency/EmergencyHistoryTable';

interface EmergencyAlert {
  id: string;
  sosCode: string;
  triggeredAt: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  reporterId: string;
  reporterType: 'driver' | 'passenger';
  reporterName?: string;
  reporterPhone?: string;
  driverId?: string;
  bookingId?: string;
  emergencyType: string;
  severity: number;
  description?: string;
  status: 'triggered' | 'processing' | 'dispatched' | 'acknowledged' | 'responding' | 'resolved' | 'false_alarm';
  processingTime?: number;
  responseTime?: number;
  emergencyServicesNotified?: string[];
  notificationCount: number;
  locationTrailCount: number;
  latestLocation?: {
    latitude: number;
    longitude: number;
    recordedAt: string;
  };
}

interface Statistics {
  triggered: number;
  processing: number;
  dispatched: number;
  acknowledged: number;
  responding: number;
  resolved: number;
  falseAlarm: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

interface Filters {
  status: string;
  emergencyType: string;
  reporterType: string;
  timeRange: string;
  search: string;
}

export default function EmergencyDashboard() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previousAlertCount, setPreviousAlertCount] = useState(0);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    emergencyType: '',
    reporterType: '',
    timeRange: '24hours',
    search: ''
  });

  // Fetch emergency alerts
  const fetchAlerts = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.emergencyType) {
        params.append('emergencyType', filters.emergencyType);
      }
      if (filters.reporterType) {
        params.append('reporterType', filters.reporterType);
      }
      if (filters.timeRange) {
        params.append('timeRange', filters.timeRange);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/emergency/alerts?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch emergency alerts');
      }

      const data = await response.json();

      if (data.success) {
        const newAlerts = data.data.alerts;

        // Check for new alerts (play sound)
        if (soundEnabled && previousAlertCount > 0 && newAlerts.length > previousAlertCount) {
          const newAlertCount = newAlerts.length - previousAlertCount;
          playAlertSound();
          showNotification(`${newAlertCount} new emergency alert(s)!`);
        }

        setAlerts(newAlerts);
        setStatistics(data.data.statistics);
        setPreviousAlertCount(newAlerts.length);
        setLastUpdate(new Date());
      } else {
        throw new Error(data.error || 'Failed to load alerts');
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load emergency alerts');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchAlerts();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAlerts(false); // Silent refresh
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [filters, autoRefresh]);

  // Play alert sound
  const playAlertSound = () => {
    if (typeof Audio !== 'undefined') {
      const audio = new Audio('/sounds/emergency-alert.mp3');
      audio.play().catch(err => console.error('Failed to play sound:', err));
    }
  };

  // Show browser notification
  const showNotification = (message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Emergency Alert', {
        body: message,
        icon: '/icons/emergency.png',
        tag: 'emergency-alert',
        requireInteraction: true
      });
    }
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Apply filters
  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // View alert details
  const handleViewDetails = (alert: EmergencyAlert) => {
    setSelectedAlert(alert);
    setShowDetailsModal(true);
  };

  // Get active alerts (not resolved or false alarm)
  const activeAlerts = alerts.filter(
    alert => !['resolved', 'false_alarm'].includes(alert.status)
  );

  // Get priority level for badge color
  const getPriorityColor = (status: string): string => {
    switch (status) {
      case 'triggered':
      case 'processing':
        return 'bg-red-600 text-white animate-pulse';
      case 'dispatched':
      case 'acknowledged':
        return 'bg-yellow-600 text-white';
      case 'responding':
        return 'bg-blue-600 text-white';
      case 'resolved':
        return 'bg-green-600 text-white';
      case 'false_alarm':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Format time elapsed
  const getTimeElapsed = (triggeredAt: string): string => {
    const now = new Date();
    const triggered = new Date(triggeredAt);
    const diffMs = now.getTime() - triggered.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m ago`;
    } else if (diffMins > 0) {
      return `${diffMins} min ago`;
    } else {
      return 'Just now';
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    const headers = ['SOS Code', 'Time', 'Type', 'Location', 'Status', 'Reporter', 'Response Time'];
    const rows = alerts.map(alert => [
      alert.sosCode,
      new Date(alert.triggeredAt).toLocaleString(),
      alert.emergencyType,
      alert.location.address || `${alert.location.latitude}, ${alert.location.longitude}`,
      alert.status,
      `${alert.reporterName || 'Unknown'} (${alert.reporterType})`,
      alert.responseTime ? `${(alert.responseTime / 1000).toFixed(1)}s` : 'N/A'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emergency-alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading emergency dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            Emergency Response Dashboard
            {activeAlerts.length > 0 && (
              <Badge className={getPriorityColor('triggered')}>
                {activeAlerts.length} Active
              </Badge>
            )}
          </h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            Real-time emergency monitoring and response
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className={`h-4 w-4 inline mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              soundEnabled
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sound {soundEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => fetchAlerts()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Left Sidebar - Filters & Stats */}
        <div className="lg:col-span-1 space-y-4">
          {/* Quick Statistics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <Badge className="bg-red-600">{statistics?.triggered || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Responding</span>
                <Badge className="bg-blue-600">{statistics?.responding || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Resolved (24h)</span>
                <Badge className="bg-green-600">{statistics?.resolved || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Response</span>
                <span className="text-sm font-medium">
                  {statistics?.avgResponseTime
                    ? `${(statistics.avgResponseTime / 1000).toFixed(1)}s`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Resolution</span>
                <span className="text-sm font-medium">
                  {statistics?.avgResolutionTime
                    ? `${(statistics.avgResolutionTime / 60).toFixed(1)}m`
                    : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filters</CardTitle>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent>
                <EmergencyFilters
                  filters={filters}
                  onChange={handleFilterChange}
                />
              </CardContent>
            )}
          </Card>

          {/* Export */}
          <button
            onClick={exportToCSV}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export to CSV
          </button>
        </div>

        {/* Center & Right - Active Alerts & Map */}
        <div className="lg:col-span-3 space-y-4 lg:space-y-6">
          {/* Active Alerts List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Active Emergency Alerts
                {activeAlerts.length > 0 && (
                  <span className="ml-2 text-red-600">({activeAlerts.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-gray-600">No active emergencies</p>
                  <p className="text-sm text-gray-500 mt-1">All systems normal</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activeAlerts.map(alert => (
                    <EmergencyAlertCard
                      key={alert.id}
                      alert={alert}
                      onViewDetails={() => handleViewDetails(alert)}
                      getTimeElapsed={getTimeElapsed}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map View */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Emergency Locations Map</CardTitle>
            </CardHeader>
            <CardContent>
              <EmergencyMap
                alerts={alerts}
                selectedAlert={selectedAlert}
                onAlertClick={handleViewDetails}
              />
            </CardContent>
          </Card>

          {/* Emergency History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Emergency History (Last 24 hours)</CardTitle>
            </CardHeader>
            <CardContent>
              <EmergencyHistoryTable
                alerts={alerts}
                onViewDetails={handleViewDetails}
                getTimeElapsed={getTimeElapsed}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedAlert && (
        <EmergencyDetailsModal
          alert={selectedAlert}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAlert(null);
          }}
          onUpdate={fetchAlerts}
        />
      )}
    </div>
  );
}
