'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  User, Mail, Phone, MapPin, Calendar,
  Save, X, Edit3, Loader2, CheckCircle, AlertCircle
} from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';
import ProfilePhotoUpload from './ProfilePhotoUpload';

interface PassengerFormData {
  name: string;
  email: string;
  phone: string;
  location: string;
  timezone: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

interface PassengerInfoProps {
  initialData: PassengerFormData & {
    id: string;
    photo?: string;
    joinDate: string;
    status: string;
  };
  onUpdate: (data: PassengerFormData) => Promise<void>;
  onPhotoUpdate: (photoUrl: string) => Promise<void>;
  isEditable?: boolean;
}

const PassengerInfo: React.FC<PassengerInfoProps> = ({
  initialData,
  onUpdate,
  onPhotoUpdate,
  isEditable = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch
  } = useForm<PassengerFormData>({
    defaultValues: {
      name: initialData.name,
      email: initialData.email,
      phone: initialData.phone,
      location: initialData.location,
      timezone: initialData.timezone,
      emergencyContact: initialData.emergencyContact || '',
      emergencyPhone: initialData.emergencyPhone || ''
    }
  });

  const onSubmit = async (data: PassengerFormData) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await onUpdate(data);
      setIsEditing(false);
      setSaveSuccess(true);
      logger.info('Passenger profile updated', undefined, {
        component: 'PassengerInfo',
        passengerId: initialData.id
      });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update profile';
      setSaveError(errorMsg);
      logger.error('Profile update failed', { error });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
    setSaveError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" aria-hidden="true" />
              Passenger Information
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage passenger profile and contact details
            </p>
          </div>

          {isEditable && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Edit passenger information"
            >
              <Edit3 className="w-4 h-4" aria-hidden="true" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div
          className="mx-4 sm:mx-6 mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg border border-green-200"
          role="alert"
          aria-live="polite"
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">Profile updated successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {saveError && (
        <div
          className="mx-4 sm:mx-6 mt-4 flex items-start gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium">{saveError}</p>
            <button
              onClick={() => setSaveError(null)}
              className="text-xs text-red-700 hover:text-red-800 underline mt-1"
              aria-label="Dismiss error"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center lg:items-start">
              <ProfilePhotoUpload
                currentPhoto={initialData.photo}
                onPhotoUpdate={onPhotoUpdate}
                userName={initialData.name}
              />

              {/* Status Badge */}
              <div className="mt-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(initialData.status)}`}
                  role="status"
                  aria-label={`Account status: ${initialData.status}`}
                >
                  {initialData.status}
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">

              {/* Full Name */}
              <div className="md:col-span-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full Name <span className="text-red-500" aria-label="required">*</span>
                </label>
                {isEditing ? (
                  <>
                    <input
                      id="name"
                      type="text"
                      {...register('name', {
                        required: 'Name is required',
                        minLength: {
                          value: 2,
                          message: 'Name must be at least 2 characters'
                        }
                      })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                        errors.name
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      aria-invalid={errors.name ? 'true' : 'false'}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                    />
                    {errors.name && (
                      <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.name.message}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-900 py-2 font-medium">{initialData.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address <span className="text-red-500" aria-label="required">*</span>
                </label>
                {isEditing ? (
                  <>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                      <input
                        id="email"
                        type="email"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Please enter a valid email address'
                          }
                        })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          errors.email
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        aria-invalid={errors.email ? 'true' : 'false'}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                      />
                    </div>
                    {errors.email && (
                      <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.email.message}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-900 py-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    {initialData.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number <span className="text-red-500" aria-label="required">*</span>
                </label>
                {isEditing ? (
                  <>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                      <input
                        id="phone"
                        type="tel"
                        {...register('phone', {
                          required: 'Phone number is required',
                          pattern: {
                            value: /^[\d\s\+\-\(\)]+$/,
                            message: 'Please enter a valid phone number'
                          }
                        })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          errors.phone
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        aria-invalid={errors.phone ? 'true' : 'false'}
                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                      />
                    </div>
                    {errors.phone && (
                      <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.phone.message}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-900 py-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    {initialData.phone}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Location
                </label>
                {isEditing ? (
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                      id="location"
                      type="text"
                      {...register('location')}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <p className="text-gray-900 py-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    {initialData.location || 'Not specified'}
                  </p>
                )}
              </div>

              {/* Timezone */}
              <div>
                <label
                  htmlFor="timezone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Timezone
                </label>
                {isEditing ? (
                  <select
                    id="timezone"
                    {...register('timezone')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
                    <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                  </select>
                ) : (
                  <p className="text-gray-900 py-2">{initialData.timezone}</p>
                )}
              </div>

              {/* Emergency Contact */}
              <div>
                <label
                  htmlFor="emergencyContact"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Emergency Contact Name
                </label>
                {isEditing ? (
                  <input
                    id="emergencyContact"
                    type="text"
                    {...register('emergencyContact')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., John Doe"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{initialData.emergencyContact || 'Not specified'}</p>
                )}
              </div>

              {/* Emergency Phone */}
              <div>
                <label
                  htmlFor="emergencyPhone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Emergency Phone Number
                </label>
                {isEditing ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                    <input
                      id="emergencyPhone"
                      type="tel"
                      {...register('emergencyPhone', {
                        pattern: {
                          value: /^[\d\s\+\-\(\)]+$/,
                          message: 'Please enter a valid phone number'
                        }
                      })}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                        errors.emergencyPhone
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="e.g., +63 912 345 6789"
                      aria-invalid={errors.emergencyPhone ? 'true' : 'false'}
                      aria-describedby={errors.emergencyPhone ? 'emergency-phone-error' : undefined}
                    />
                  </div>
                ) : (
                  <p className="text-gray-900 py-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    {initialData.emergencyPhone || 'Not specified'}
                  </p>
                )}
                {errors.emergencyPhone && (
                  <p id="emergency-phone-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.emergencyPhone.message}
                  </p>
                )}
              </div>

              {/* Read-only fields */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passenger ID
                  </label>
                  <p className="text-gray-900 py-2 font-mono text-sm bg-gray-50 px-3 rounded">
                    {initialData.id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <p className="text-gray-900 py-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    {initialData.joinDate}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <X className="w-4 h-4" aria-hidden="true" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !isDirty}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" aria-hidden="true" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Accessibility: Form Status Announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isSaving && 'Saving profile information...'}
        {saveSuccess && 'Profile updated successfully'}
        {saveError && `Error: ${saveError}`}
      </div>
    </div>
  );
};

export default PassengerInfo;
