'use client';

/**
 * Emergency History Table Component
 * Displays emergency alerts in a sortable table format with pagination
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, Eye, ArrowUpDown } from 'lucide-react';

interface EmergencyAlert {
  id: string;
  sosCode: string;
  triggeredAt: string;
  location: {
    address?: string;
  };
  reporterType: string;
  reporterName?: string;
  emergencyType: string;
  status: string;
  responseTime?: number;
}

interface EmergencyHistoryTableProps {
  alerts: EmergencyAlert[];
  onViewDetails: (alert: EmergencyAlert) => void;
  getTimeElapsed: (triggeredAt: string) => string;
}

type SortField = 'triggeredAt' | 'sosCode' | 'emergencyType' | 'status' | 'responseTime';
type SortDirection = 'asc' | 'desc';

export default function EmergencyHistoryTable({
  alerts,
  onViewDetails,
  getTimeElapsed
}: EmergencyHistoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('triggeredAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sort alerts
  const sortedAlerts = [...alerts].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'triggeredAt':
        comparison = new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime();
        break;
      case 'sosCode':
        comparison = a.sosCode.localeCompare(b.sosCode);
        break;
      case 'emergencyType':
        comparison = a.emergencyType.localeCompare(b.emergencyType);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'responseTime':
        comparison = (a.responseTime || 0) - (b.responseTime || 0);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Paginate
  const totalPages = Math.ceil(sortedAlerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAlerts = sortedAlerts.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'triggered':
      case 'processing':
        return 'bg-red-600 text-white';
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

  // Render sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-blue-600" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                onClick={() => handleSort('triggeredAt')}
                className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Time
                  <SortIcon field="triggeredAt" />
                </div>
              </th>
              <th
                onClick={() => handleSort('sosCode')}
                className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  SOS Code
                  <SortIcon field="sosCode" />
                </div>
              </th>
              <th
                onClick={() => handleSort('emergencyType')}
                className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Type
                  <SortIcon field="emergencyType" />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Location
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Reporter
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th
                onClick={() => handleSort('responseTime')}
                className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Response Time
                  <SortIcon field="responseTime" />
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedAlerts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                  No emergency alerts found
                </td>
              </tr>
            ) : (
              paginatedAlerts.map(alert => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {getTimeElapsed(alert.triggeredAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {alert.sosCode}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {alert.emergencyType.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                    {alert.location.address || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>
                      <div className="font-medium">{alert.reporterName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 capitalize">{alert.reporterType}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(alert.status)}>
                      {alert.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {alert.responseTime
                      ? `${(alert.responseTime / 1000).toFixed(1)}s`
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onViewDetails(alert)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-sm font-medium">View</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedAlerts.length)} of{' '}
            {sortedAlerts.length} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
