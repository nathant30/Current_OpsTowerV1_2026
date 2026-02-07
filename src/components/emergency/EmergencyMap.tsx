'use client';

/**
 * Emergency Map Component
 * Displays emergency locations on an interactive map using Leaflet
 * Shows active emergencies as red markers, resolved as green markers
 */

import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';

interface EmergencyAlert {
  id: string;
  sosCode: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: string;
  emergencyType: string;
  reporterName?: string;
  reporterType: string;
  triggeredAt: string;
}

interface EmergencyMapProps {
  alerts: EmergencyAlert[];
  selectedAlert: EmergencyAlert | null;
  onAlertClick: (alert: EmergencyAlert) => void;
}

export default function EmergencyMap({
  alerts,
  selectedAlert,
  onAlertClick
}: EmergencyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [L, setL] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<any[]>([]);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((leaflet) => {
        setL(leaflet.default);
      });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!L || !mapContainer.current || map) {return;}

    // Create map centered on Metro Manila, Philippines
    const newMap = L.map(mapContainer.current).setView([14.5995, 120.9842], 11);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(newMap);

    setMap(newMap);
    setMapLoaded(true);
  }, [L, map]);

  // Update markers when alerts change
  useEffect(() => {
    if (!map || !L || !mapLoaded) {return;}

    // Clear existing markers
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current = [];

    // Add markers for each alert
    alerts.forEach(alert => {
      const isActive = !['resolved', 'false_alarm'].includes(alert.status);
      const isSelected = selectedAlert?.id === alert.id;

      // Create custom icon
      const iconColor = isActive ? '#DC2626' : '#10B981'; // red for active, green for resolved
      const iconSize = isSelected ? 40 : 30;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            position: relative;
            width: ${iconSize}px;
            height: ${iconSize}px;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: ${iconSize}px;
              height: ${iconSize}px;
              background: ${iconColor};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              ${isActive ? 'animation: pulse 2s infinite;' : ''}
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
            }
          </style>
        `,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2]
      });

      // Create marker
      const marker = L.marker([alert.location.latitude, alert.location.longitude], { icon })
        .addTo(map);

      // Add popup
      const popupContent = `
        <div style="min-width: 200px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: ${iconColor};">
            ${alert.sosCode}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>Type:</strong> ${alert.emergencyType.replace(/_/g, ' ')}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>Reporter:</strong> ${alert.reporterName || 'Unknown'} (${alert.reporterType})
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>Location:</strong> ${alert.location.address || 'Unknown'}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            <strong>Status:</strong> ${alert.status.toUpperCase()}
          </div>
          <button
            onclick="window.viewEmergencyDetails('${alert.id}')"
            style="
              width: 100%;
              padding: 6px 12px;
              background: #2563EB;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 500;
            "
          >
            View Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Click handler
      marker.on('click', () => {
        onAlertClick(alert);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if there are markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    }

  }, [map, L, alerts, selectedAlert, mapLoaded]);

  // Center on selected alert
  useEffect(() => {
    if (map && selectedAlert) {
      map.setView([selectedAlert.location.latitude, selectedAlert.location.longitude], 15);
    }
  }, [map, selectedAlert]);

  // Global function to view details (called from popup buttons)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).viewEmergencyDetails = (alertId: string) => {
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
          onAlertClick(alert);
        }
      };
    }
  }, [alerts, onAlertClick]);

  if (!mapLoaded) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-96 rounded-lg"
        style={{ minHeight: '400px' }}
      />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
        <h4 className="text-xs font-bold mb-2 text-gray-700">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span className="text-gray-700">Active Emergency</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span className="text-gray-700">Resolved</span>
          </div>
        </div>
      </div>

      {/* Alert Count Badge */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 border border-gray-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-bold">{alerts.length} Alerts</span>
        </div>
      </div>
    </div>
  );
}
