/**
 * MFA Enrollment Component
 * Complete UI flow for setting up multi-factor authentication
 *
 * Features:
 * - QR code display for TOTP setup
 * - Manual entry key option
 * - Backup codes display and download
 * - Verification step
 * - Success confirmation
 *
 * Issue #16: Multi-Factor Authentication (P1)
 */

'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface MFAEnrollmentProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface SetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

type EnrollmentStep = 'setup' | 'verify' | 'backup-codes' | 'complete';

export default function MFAEnrollment({ onComplete, onCancel }: MFAEnrollmentProps) {
  const [step, setStep] = useState<EnrollmentStep>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showManualKey, setShowManualKey] = useState(false);
  const [backupCodesDownloaded, setBackupCodesDownloaded] = useState(false);

  // Step 1: Initialize MFA setup
  const handleInitSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rbac_token')}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setSetupData(result.data);
        setStep('verify');
      } else {
        setError(result.message || 'Failed to initialize MFA setup');
      }
    } catch (err) {
      console.error('MFA setup error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify TOTP code
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rbac_token')}`,
        },
        body: JSON.stringify({
          code: verificationCode,
          method: 'totp',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStep('backup-codes');
      } else {
        setError(result.message || 'Invalid verification code');
        setVerificationCode('');
      }
    } catch (err) {
      console.error('MFA verification error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Download backup codes
  const handleDownloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = [
      'Xpress Ops Tower - MFA Backup Codes',
      '=====================================',
      '',
      'Save these backup codes in a secure location.',
      'Each code can only be used once.',
      '',
      ...setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`),
      '',
      '=====================================',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opstower-mfa-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setBackupCodesDownloaded(true);
  };

  // Copy backup codes to clipboard
  const handleCopyBackupCodes = async () => {
    if (!setupData?.backupCodes) return;

    const text = setupData.backupCodes.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      alert('Backup codes copied to clipboard');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Render setup introduction
  const renderSetupStep = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Enable Two-Factor Authentication
        </h2>
        <p className="text-gray-600">
          Add an extra layer of security to your account
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">What you'll need:</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>An authenticator app (Google Authenticator, Authy, or similar)</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>A secure place to store your backup codes</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>About 2-3 minutes to complete setup</span>
          </li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={handleInitSetup}
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Initializing...' : 'Get Started'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Render QR code and verification step
  const renderVerifyStep = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">📱</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Scan QR Code
        </h2>
        <p className="text-gray-600">
          Use your authenticator app to scan this QR code
        </p>
      </div>

      {setupData && (
        <div>
          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <QRCodeSVG
                value={setupData.qrCodeUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Manual entry option */}
          <div className="text-center mb-6">
            <button
              onClick={() => setShowManualKey(!showManualKey)}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              {showManualKey ? 'Hide manual entry key' : 'Can\'t scan? Enter key manually'}
            </button>

            {showManualKey && (
              <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Manual Entry Key:</p>
                <code className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-200 break-all">
                  {setupData.manualEntryKey}
                </code>
              </div>
            )}
          </div>

          {/* Verification input */}
          <div className="mb-6">
            <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
              Enter the 6-digit code from your app:
            </label>
            <input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleVerifyCode}
              disabled={verificationCode.length !== 6 || isLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Render backup codes step
  const renderBackupCodesStep = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">🔑</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Save Your Backup Codes
        </h2>
        <p className="text-gray-600">
          Store these codes in a safe place. Each can only be used once.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <span className="text-yellow-600 mr-2">⚠️</span>
          <div className="text-sm text-yellow-800">
            <strong>Important:</strong> If you lose access to your authenticator app,
            these codes are the only way to regain access to your account.
          </div>
        </div>
      </div>

      {setupData && (
        <div>
          {/* Backup codes display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              {setupData.backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 bg-white px-3 py-2 rounded border border-gray-200"
                >
                  <span className="text-xs text-gray-500">{index + 1}.</span>
                  <code className="font-mono text-sm font-semibold">{code}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 mb-6">
            <button
              onClick={handleDownloadBackupCodes}
              className="flex-1 flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download</span>
            </button>
            <button
              onClick={handleCopyBackupCodes}
              className="flex-1 flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </button>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start space-x-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={backupCodesDownloaded}
              onChange={(e) => setBackupCodesDownloaded(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-gray-700">
              I have saved my backup codes in a secure location and understand
              that I won't be able to see them again.
            </span>
          </label>

          {/* Complete button */}
          <button
            onClick={() => setStep('complete')}
            disabled={!backupCodesDownloaded}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Setup
          </button>
        </div>
      )}
    </div>
  );

  // Render completion step
  const renderCompleteStep = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Two-Factor Authentication Enabled
        </h2>
        <p className="text-gray-600">
          Your account is now protected with an additional layer of security
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-900 mb-2">What happens next:</h3>
        <ul className="space-y-2 text-sm text-green-800">
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>You'll need your authenticator app code when logging in</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>Use backup codes if you lose access to your authenticator</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>You can manage MFA settings in your account preferences</span>
          </li>
        </ul>
      </div>

      <button
        onClick={onComplete}
        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700"
      >
        Done
      </button>
    </div>
  );

  // Main render
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Progress indicator */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={step === 'setup' ? 'text-blue-600' : 'text-gray-400'}>
              1. Setup
            </span>
            <span className={step === 'verify' ? 'text-blue-600' : 'text-gray-400'}>
              2. Verify
            </span>
            <span className={step === 'backup-codes' ? 'text-blue-600' : 'text-gray-400'}>
              3. Backup Codes
            </span>
            <span className={step === 'complete' ? 'text-blue-600' : 'text-gray-400'}>
              4. Complete
            </span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{
                width: step === 'setup' ? '25%' :
                       step === 'verify' ? '50%' :
                       step === 'backup-codes' ? '75%' : '100%'
              }}
            />
          </div>
        </div>

        {/* Step content */}
        {step === 'setup' && renderSetupStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'backup-codes' && renderBackupCodesStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
}
