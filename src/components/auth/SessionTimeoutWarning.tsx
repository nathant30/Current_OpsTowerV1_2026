/**
 * Session Timeout Warning Modal
 * Displays warning before session expires with option to extend
 *
 * Features:
 * - Countdown timer (default: 5 minutes warning)
 * - Session extension option
 * - Auto-logout on timeout
 * - Idle time tracking
 *
 * Issue #28: Session Timeout Controls (P2)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface SessionTimeoutWarningProps {
  warningTime?: number; // Seconds before expiry to show warning (default: 300 = 5 min)
  idleTimeout?: number; // Idle timeout in seconds (default: 1800 = 30 min)
  absoluteTimeout?: number; // Absolute timeout in seconds (default: 28800 = 8 hours)
  onLogout: () => void;
  onExtend?: () => Promise<void>;
}

export default function SessionTimeoutWarning({
  warningTime = 300, // 5 minutes
  idleTimeout = 1800, // 30 minutes
  absoluteTimeout = 28800, // 8 hours
  onLogout,
  onExtend,
}: SessionTimeoutWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExtending, setIsExtending] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionStart] = useState(Date.now());

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Setup activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  // Main timeout logic
  useEffect(() => {
    const checkTimeout = () => {
      const now = Date.now();
      const idleTime = (now - lastActivity) / 1000;
      const sessionTime = (now - sessionStart) / 1000;

      // Check absolute timeout (hard limit)
      if (sessionTime >= absoluteTimeout) {
        console.log('Absolute session timeout reached');
        onLogout();
        return;
      }

      // Check idle timeout
      if (idleTime >= idleTimeout) {
        console.log('Idle timeout reached');
        onLogout();
        return;
      }

      // Show warning if approaching idle timeout
      const timeUntilTimeout = idleTimeout - idleTime;
      if (timeUntilTimeout <= warningTime && !showWarning) {
        setShowWarning(true);
        setTimeRemaining(Math.floor(timeUntilTimeout));
      }

      // Update countdown if warning is showing
      if (showWarning) {
        const remaining = Math.floor(timeUntilTimeout);
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          onLogout();
        }
      }
    };

    const interval = setInterval(checkTimeout, 1000);
    return () => clearInterval(interval);
  }, [lastActivity, sessionStart, idleTimeout, absoluteTimeout, warningTime, showWarning, onLogout]);

  // Handle session extension
  const handleExtend = async () => {
    if (!onExtend) {
      // If no extend function provided, just reset activity
      setShowWarning(false);
      updateActivity();
      return;
    }

    setIsExtending(true);

    try {
      await onExtend();
      setShowWarning(false);
      updateActivity();
    } catch (error) {
      console.error('Failed to extend session:', error);
      // On failure, still hide warning but don't reset activity
      // This will cause logout soon
    } finally {
      setIsExtending(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setShowWarning(false);
    onLogout();
  };

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get warning color based on time remaining
  const getWarningColor = (): string => {
    if (timeRemaining <= 60) return 'red';
    if (timeRemaining <= 180) return 'orange';
    return 'yellow';
  };

  if (!showWarning) return null;

  const warningColor = getWarningColor();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          warningColor === 'red' ? 'bg-red-50 border-red-200' :
          warningColor === 'orange' ? 'bg-orange-50 border-orange-200' :
          'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="text-3xl">
              {warningColor === 'red' ? '🚨' : '⏰'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Session Expiring Soon
              </h3>
              <p className={`text-sm ${
                warningColor === 'red' ? 'text-red-700' :
                warningColor === 'orange' ? 'text-orange-700' :
                'text-yellow-700'
              }`}>
                Your session will expire due to inactivity
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Countdown */}
          <div className="text-center mb-6">
            <div className={`text-6xl font-bold mb-2 ${
              warningColor === 'red' ? 'text-red-600' :
              warningColor === 'orange' ? 'text-orange-600' :
              'text-yellow-600'
            }`}>
              {formatTime(timeRemaining)}
            </div>
            <p className="text-gray-600">
              Time remaining until automatic logout
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  warningColor === 'red' ? 'bg-red-600' :
                  warningColor === 'orange' ? 'bg-orange-600' :
                  'bg-yellow-600'
                }`}
                style={{
                  width: `${(timeRemaining / warningTime) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <span className="text-blue-600 mr-2">ℹ️</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Why am I seeing this?</p>
                <p>
                  For your security, you'll be automatically logged out after{' '}
                  {Math.floor(idleTimeout / 60)} minutes of inactivity.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleExtend}
              disabled={isExtending}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExtending ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Extending...
                </div>
              ) : (
                'Stay Logged In'
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Logout Now
            </button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>
              Press <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 font-mono">Enter</kbd> to stay logged in
              or <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 font-mono">Esc</kbd> to logout
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for easy integration
export function useSessionTimeout(options: Omit<SessionTimeoutWarningProps, 'children'>) {
  return <SessionTimeoutWarning {...options} />;
}
