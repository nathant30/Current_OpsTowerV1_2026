'use client';

/**
 * Emergency Alert Card Component
 * Displays individual emergency alert with quick actions
 */

import { Phone, MapPin, Eye, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  reporterType: 'driver' | 'passenger';
  reporterName?: string;
  reporterPhone?: string;
  emergencyType: string;
  severity: number;
  status: string;
  description?: string;
}

interface EmergencyAlertCardProps {
  alert: EmergencyAlert;
  onViewDetails: () => void;
  getTimeElapsed: (triggeredAt: string) => string;
}

export default function EmergencyAlertCard({
  alert,
  onViewDetails,
  getTimeElapsed
}: EmergencyAlertCardProps) {
  // Get priority icon and color
  const getPriorityColor = (status: string): string => {
    switch (status) {
      case 'triggered':
      case 'processing':
        return 'border-red-500 bg-red-50';
      case 'dispatched':
      case 'acknowledged':
        return 'border-yellow-500 bg-yellow-50';
      case 'responding':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getStatusBadgeColor = (status: string): string => {
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
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getEmergencyTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      medical_emergency: 'Medical',
      security_threat: 'Security',
      accident_critical: 'Accident',
      fire_emergency: 'Fire',
      natural_disaster: 'Disaster',
      kidnapping: 'Kidnapping',
      domestic_violence: 'Violence',
      general_emergency: 'General'
    };
    return labels[type] || type;
  };

  // Initiate phone call
  const handleCall = (phone?: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getPriorityColor(alert.status)} transition-all hover:shadow-lg`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-bold text-lg">{alert.sosCode}</h3>
            <p className="text-sm text-gray-600">{getTimeElapsed(alert.triggeredAt)}</p>
          </div>
        </div>
        <Badge className={getStatusBadgeColor(alert.status)}>
          {alert.status.toUpperCase()}
        </Badge>
      </div>

      {/* Emergency Info */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-xs text-gray-600">Type</p>
          <p className="text-sm font-medium">{getEmergencyTypeLabel(alert.emergencyType)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Severity</p>
          <p className="text-sm font-medium text-red-600">{alert.severity}/10</p>
        </div>
      </div>

      {/* Reporter Info */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <User className="h-4 w-4 text-gray-500" />
        <span className="font-medium">{alert.reporterName || 'Unknown'}</span>
        <Badge variant="outline" className="text-xs">
          {alert.reporterType}
        </Badge>
      </div>

      {/* Location */}
      <div className="flex items-start gap-2 mb-4">
        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            {alert.location.address || `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`}
          </p>
        </div>
      </div>

      {/* Description */}
      {alert.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {alert.description}
        </p>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Eye className="h-4 w-4" />
          View Details
        </button>
        {alert.reporterPhone && (
          <button
            onClick={() => handleCall(alert.reporterPhone)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Phone className="h-4 w-4" />
            Call
          </button>
        )}
      </div>
    </div>
  );
}
