/**
 * WebSocket Connection Status Indicator
 * Issue #29: WebSocket Edge Cases - Connection status UI
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { ConnectionStatus } from '@/lib/websocket/connection-manager';
import { cn } from '@/lib/utils';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  queuedMessages?: number;
  showDetails?: boolean;
  className?: string;
  onReconnect?: () => void;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  queuedMessages = 0,
  showDetails = false,
  className,
  onReconnect
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand when disconnected or has queued messages
  useEffect(() => {
    if (status !== 'connected' || queuedMessages > 0) {
      setIsExpanded(true);
    } else {
      const timer = setTimeout(() => setIsExpanded(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status, queuedMessages]);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          pulse: false
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          pulse: false
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          text: 'Reconnecting',
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          pulse: true
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Connection Error',
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          pulse: true
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (!showDetails && status === 'connected' && queuedMessages === 0) {
    return null; // Hide when everything is normal
  }

  return (
    <div className={cn('fixed top-4 right-4 z-50', className)}>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border shadow-lg transition-all duration-300',
          config.bgColor,
          config.borderColor,
          isExpanded ? 'w-auto' : 'w-10'
        )}
        role="status"
        aria-live="polite"
        aria-label={`Connection status: ${config.text}`}
      >
        {/* Status Indicator */}
        <div className="relative flex items-center justify-center">
          <div className={cn('w-2 h-2 rounded-full', config.color)}>
            {config.pulse && (
              <div className={cn('absolute inset-0 rounded-full animate-ping', config.color)} />
            )}
          </div>
        </div>

        {/* Details (when expanded) */}
        {isExpanded && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-200">
            <Icon
              className={cn(
                'w-4 h-4',
                config.textColor,
                status === 'reconnecting' && 'animate-spin'
              )}
              aria-hidden="true"
            />

            <div className="flex flex-col">
              <span className={cn('text-sm font-medium', config.textColor)}>
                {config.text}
              </span>
              {queuedMessages > 0 && (
                <span className="text-xs text-gray-600">
                  {queuedMessages} message{queuedMessages !== 1 ? 's' : ''} queued
                </span>
              )}
            </div>

            {status === 'error' && onReconnect && (
              <button
                onClick={onReconnect}
                className="ml-2 px-3 py-1 text-xs bg-white text-red-700 border border-red-300 rounded hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label="Retry connection"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Offline Banner - Shows when connection is lost
 */
export const OfflineBanner: React.FC<{
  visible: boolean;
  queuedMessages?: number;
  onDismiss?: () => void;
}> = ({ visible, queuedMessages = 0, onDismiss }) => {
  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-orange-600 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <WifiOff className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">You are currently offline</p>
            <p className="text-sm text-orange-100">
              Changes will be synced when connection is restored
              {queuedMessages > 0 && ` (${queuedMessages} pending)`}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-orange-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600"
            aria-label="Dismiss offline notification"
          >
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Reconnection Progress Indicator
 */
export const ReconnectionProgress: React.FC<{
  visible: boolean;
  attempt: number;
  maxAttempts: number;
}> = ({ visible, attempt, maxAttempts }) => {
  if (!visible) return null;

  const progress = (attempt / maxAttempts) * 100;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-white rounded-lg border border-gray-200 shadow-xl p-4 w-80 animate-in slide-in-from-bottom duration-300"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">
            Reconnecting to server...
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            Attempt {attempt} of {maxAttempts}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={attempt}
              aria-valuemin={0}
              aria-valuemax={maxAttempts}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatusIndicator;
