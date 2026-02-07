'use client';

/**
 * Emergency Details Modal Component
 * Shows full emergency information with timeline, location history, and actions
 */

import { useEffect, useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Activity,
  MessageSquare,
  Users,
  Navigation
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EmergencyAlert {
  id: string;
  sosCode: string;
  triggeredAt: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  reporterType: string;
  reporterName?: string;
  reporterPhone?: string;
  emergencyType: string;
  severity: number;
  description?: string;
  status: string;
  processingTime?: number;
  responseTime?: number;
}

interface EmergencyDetailsModalProps {
  alert: EmergencyAlert;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface AlertDetails {
  locationTrail: Array<{
    latitude: number;
    longitude: number;
    address?: string;
    recordedAt: string;
    batteryLevel?: number;
    speed?: number;
  }>;
  notifications: Array<{
    channel_type: string;
    recipient: string;
    status: string;
    sent_at?: string;
  }>;
  emergencyContactsNotified: Array<{
    name: string;
    relationship: string;
    phone: string;
    notification_type: string;
    status: string;
  }>;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export default function EmergencyDetailsModal({
  alert,
  isOpen,
  onClose,
  onUpdate
}: EmergencyDetailsModalProps) {
  const [details, setDetails] = useState<AlertDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'contacts' | 'actions'>('overview');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Fetch full alert details
  useEffect(() => {
    if (isOpen && alert.id) {
      fetchDetails();
    }
  }, [isOpen, alert.id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/emergency/alerts/${alert.id}`);
      const data = await response.json();

      if (data.success) {
        setDetails(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch alert details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update alert status
  const updateStatus = async (newStatus: string) => {
    try {
      setUpdating(true);

      const response = await fetch(`/api/emergency/alerts/${alert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolutionNotes: newStatus === 'resolved' ? resolutionNotes : undefined,
          operatorId: 'current_operator_id', // TODO: Get from auth context
          operatorName: 'Operator' // TODO: Get from auth context
        })
      });

      const data = await response.json();

      if (data.success) {
        onUpdate();
        if (newStatus === 'resolved' || newStatus === 'false_alarm') {
          onClose();
        } else {
          fetchDetails();
        }
      } else {
        alert('Failed to update status: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update emergency status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'triggered':
      case 'processing':
        return 'bg-red-600';
      case 'dispatched':
      case 'acknowledged':
        return 'bg-yellow-600';
      case 'responding':
        return 'bg-blue-600';
      case 'resolved':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const formatElapsedTime = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-bold">{alert.sosCode}</h2>
              <p className="text-sm opacity-90">Emergency Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-red-700 p-2 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-4">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'contacts', label: 'Contacts' },
              { id: 'actions', label: 'Actions' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Activity className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className={`${getStatusColor(alert.status)} text-white text-base px-4 py-2`}>
                      {alert.status.toUpperCase()}
                    </Badge>
                    <div className="text-sm text-gray-600">
                      Triggered {formatTime(alert.triggeredAt)}
                    </div>
                  </div>

                  {/* Emergency Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Emergency Type</p>
                      <p className="font-medium">{alert.emergencyType.replace(/_/g, ' ').toUpperCase()}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Severity</p>
                      <p className="font-medium text-red-600">{alert.severity}/10</p>
                    </div>
                  </div>

                  {/* Reporter Info */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <h3 className="font-bold">Reporter Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Name</p>
                        <p className="font-medium">{alert.reporterName || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Type</p>
                        <p className="font-medium capitalize">{alert.reporterType}</p>
                      </div>
                      {alert.reporterPhone && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-600">Phone</p>
                          <a
                            href={`tel:${alert.reporterPhone}`}
                            className="font-medium text-blue-600 hover:underline flex items-center gap-2"
                          >
                            <Phone className="h-4 w-4" />
                            {alert.reporterPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <h3 className="font-bold">Location</h3>
                    </div>
                    <p className="text-gray-700 mb-2">
                      {alert.location.address || 'Address not available'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {alert.location.latitude.toFixed(6)}, {alert.location.longitude.toFixed(6)}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${alert.location.latitude},${alert.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Navigation className="h-4 w-4" />
                      Open in Maps
                    </a>
                  </div>

                  {/* Description */}
                  {alert.description && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-5 w-5 text-gray-500" />
                        <h3 className="font-bold">Description</h3>
                      </div>
                      <p className="text-gray-700">{alert.description}</p>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  {(alert.processingTime || alert.responseTime) && (
                    <div className="grid grid-cols-2 gap-4">
                      {alert.processingTime && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Processing Time</p>
                          <p className="font-bold text-lg">{(alert.processingTime / 1000).toFixed(2)}s</p>
                        </div>
                      )}
                      {alert.responseTime && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Response Time</p>
                          <p className="font-bold text-lg">{(alert.responseTime / 1000).toFixed(2)}s</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && details && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-4">Location Trail</h3>
                  {details.locationTrail && details.locationTrail.length > 0 ? (
                    <div className="space-y-3">
                      {details.locationTrail.map((point, index) => (
                        <div key={index} className="flex gap-3 border-l-2 border-gray-300 pl-4">
                          <div className="flex-shrink-0 w-16 text-xs text-gray-600">
                            {formatTime(point.recordedAt)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{point.address || 'Unknown location'}</p>
                            <p className="text-xs text-gray-600">
                              {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                            </p>
                            {point.batteryLevel && (
                              <p className="text-xs text-gray-600">Battery: {point.batteryLevel}%</p>
                            )}
                            {point.speed && (
                              <p className="text-xs text-gray-600">Speed: {point.speed} km/h</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No location trail data available</p>
                  )}
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === 'contacts' && details && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-4">Emergency Contacts Notified</h3>
                  {details.emergencyContactsNotified && details.emergencyContactsNotified.length > 0 ? (
                    <div className="space-y-3">
                      {details.emergencyContactsNotified.map((contact, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{contact.name}</p>
                              <p className="text-sm text-gray-600 capitalize">{contact.relationship}</p>
                            </div>
                            <Badge
                              className={
                                contact.status === 'delivered'
                                  ? 'bg-green-600'
                                  : contact.status === 'sent'
                                  ? 'bg-blue-600'
                                  : 'bg-gray-600'
                              }
                            >
                              {contact.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">{contact.phone}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Via {contact.notification_type.toUpperCase()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No emergency contacts were notified</p>
                  )}

                  <h3 className="font-bold text-lg mt-6 mb-4">All Notifications</h3>
                  {details.notifications && details.notifications.length > 0 ? (
                    <div className="space-y-2">
                      {details.notifications.map((notif, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200">
                          <div>
                            <p className="text-sm font-medium">{notif.channel_type.toUpperCase()}</p>
                            <p className="text-xs text-gray-600">{notif.recipient}</p>
                          </div>
                          <Badge
                            className={
                              notif.status === 'sent' || notif.status === 'delivered'
                                ? 'bg-green-600'
                                : notif.status === 'failed'
                                ? 'bg-red-600'
                                : 'bg-gray-600'
                            }
                          >
                            {notif.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No notifications sent</p>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {activeTab === 'actions' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-lg mb-4">Update Emergency Status</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => updateStatus('acknowledged')}
                        disabled={updating || alert.status === 'acknowledged'}
                        className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => updateStatus('responding')}
                        disabled={updating || alert.status === 'responding'}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        Mark Responding
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mb-4">Resolve Emergency</h3>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter resolution notes..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      rows={4}
                    />
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => updateStatus('resolved')}
                        disabled={updating || !resolutionNotes.trim()}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-5 w-5" />
                        Resolve Emergency
                      </button>
                      <button
                        onClick={() => updateStatus('false_alarm')}
                        disabled={updating}
                        className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        False Alarm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
