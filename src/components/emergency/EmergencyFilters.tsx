'use client';

/**
 * Emergency Filters Component
 * Filter panel for emergency dashboard
 */

import { Search } from 'lucide-react';

interface Filters {
  status: string;
  emergencyType: string;
  reporterType: string;
  timeRange: string;
  search: string;
}

interface EmergencyFiltersProps {
  filters: Filters;
  onChange: (filters: Partial<Filters>) => void;
}

export default function EmergencyFilters({ filters, onChange }: EmergencyFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="SOS Code, Booking ID, Phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="triggered">Triggered</option>
          <option value="processing">Processing</option>
          <option value="dispatched">Dispatched</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="responding">Responding</option>
          <option value="resolved">Resolved</option>
          <option value="false_alarm">False Alarm</option>
        </select>
      </div>

      {/* Emergency Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Emergency Type
        </label>
        <select
          value={filters.emergencyType}
          onChange={(e) => onChange({ emergencyType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Types</option>
          <option value="medical_emergency">Medical Emergency</option>
          <option value="security_threat">Security Threat</option>
          <option value="accident_critical">Critical Accident</option>
          <option value="fire_emergency">Fire Emergency</option>
          <option value="natural_disaster">Natural Disaster</option>
          <option value="kidnapping">Kidnapping</option>
          <option value="domestic_violence">Domestic Violence</option>
          <option value="general_emergency">General Emergency</option>
        </select>
      </div>

      {/* Reporter Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reporter Type
        </label>
        <select
          value={filters.reporterType}
          onChange={(e) => onChange({ reporterType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Reporters</option>
          <option value="driver">Driver</option>
          <option value="passenger">Passenger</option>
        </select>
      </div>

      {/* Time Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Range
        </label>
        <select
          value={filters.timeRange}
          onChange={(e) => onChange({ timeRange: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="hour">Last Hour</option>
          <option value="6hours">Last 6 Hours</option>
          <option value="24hours">Last 24 Hours</option>
          <option value="week">Last Week</option>
        </select>
      </div>

      {/* Reset Button */}
      <button
        onClick={() =>
          onChange({
            status: 'all',
            emergencyType: '',
            reporterType: '',
            timeRange: '24hours',
            search: ''
          })
        }
        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
      >
        Reset Filters
      </button>
    </div>
  );
}
