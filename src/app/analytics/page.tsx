'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Car,
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Loader2,
  Package,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import type { RevenueData, ServiceTypeRevenue, DriverRanking } from '@/lib/analytics/types';
import { formatCurrency, formatNumber, downloadCSV, arrayToCSV } from '@/lib/analytics/utils';

interface KPIData {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string>('month');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    label: 'Last 30 Days',
  });

  // Fetch revenue data
  const { data: revenueResponse, mutate: mutateRevenue } = useSWR(
    `/api/analytics/revenue?type=daily&start=${format(dateRange.startDate, 'yyyy-MM-dd')}&end=${format(dateRange.endDate, 'yyyy-MM-dd')}`,
    fetcher
  );

  // Fetch service type revenue
  const { data: serviceTypeResponse } = useSWR(
    `/api/analytics/revenue?type=by-service-type&start=${format(dateRange.startDate, 'yyyy-MM-dd')}&end=${format(dateRange.endDate, 'yyyy-MM-dd')}`,
    fetcher
  );

  // Fetch top drivers
  const { data: driversResponse } = useSWR(
    '/api/analytics/drivers?type=rankings&metric=earnings&limit=10',
    fetcher
  );

  // Fetch booking metrics
  const { data: completionRateResponse } = useSWR(
    '/api/analytics/bookings?type=completion-rate',
    fetcher
  );

  // Date range presets
  const dateRangePresets = [
    { id: 'today', label: 'Today', days: 0 },
    { id: 'week', label: 'Last 7 Days', days: 7 },
    { id: 'month', label: 'Last 30 Days', days: 30 },
    { id: 'quarter', label: 'Last 90 Days', days: 90 },
  ];

  const handleRangeChange = (rangeId: string) => {
    setSelectedRange(rangeId);
    const preset = dateRangePresets.find((p) => p.id === rangeId);
    if (preset) {
      setDateRange({
        startDate: preset.days === 0 ? startOfDay(new Date()) : subDays(new Date(), preset.days),
        endDate: endOfDay(new Date()),
        label: preset.label,
      });
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([mutateRevenue()]);
    setLoading(false);
  };

  const handleExportCSV = () => {
    if (!revenueResponse?.data) {return;}

    const csv = arrayToCSV(revenueResponse.data, [
      { key: 'date', label: 'Date' },
      { key: 'totalRevenue', label: 'Total Revenue' },
      { key: 'platformCommission', label: 'Platform Commission' },
      { key: 'driverEarnings', label: 'Driver Earnings' },
      { key: 'totalBookings', label: 'Total Bookings' },
      { key: 'completedBookings', label: 'Completed Bookings' },
      { key: 'activeDrivers', label: 'Active Drivers' },
      { key: 'activePassengers', label: 'Active Passengers' },
    ]);

    const timestamp = format(new Date(), 'yyyy-MM-dd');
    downloadCSV(csv, `opstower-revenue-${timestamp}.csv`);
  };

  // Calculate KPIs from revenue data
  const revenueData: RevenueData[] = revenueResponse?.data || [];
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalBookings = revenueData.reduce((sum, d) => sum + d.totalBookings, 0);
  const totalDrivers = Math.max(...revenueData.map((d) => d.activeDrivers), 0);
  const totalPassengers = Math.max(...revenueData.map((d) => d.activePassengers), 0);
  const avgCompletionRate = revenueData.length > 0
    ? revenueData.reduce((sum, d) => sum + d.completionRate, 0) / revenueData.length
    : 0;

  const kpis: KPIData[] = [
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      change: 15.3, // Would need to calculate from previous period
      trend: 'up',
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-green-600',
    },
    {
      label: 'Total Bookings',
      value: formatNumber(totalBookings),
      change: 12.7,
      trend: 'up',
      icon: <Car className="h-5 w-5" />,
      color: 'text-blue-600',
    },
    {
      label: 'Active Drivers',
      value: formatNumber(totalDrivers),
      change: 8.5,
      trend: 'up',
      icon: <Users className="h-5 w-5" />,
      color: 'text-purple-600',
    },
    {
      label: 'Completion Rate',
      value: `${avgCompletionRate.toFixed(1)}%`,
      change: 5.2,
      trend: 'up',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-orange-600',
    },
  ];

  // Transform revenue data for chart
  const revenueChartData = revenueData.map((d) => ({
    date: format(new Date(d.date), 'MMM dd'),
    revenue: d.totalRevenue,
    bookings: d.completedBookings,
  }));

  // Service type data for pie chart
  const serviceTypeData: ServiceTypeRevenue[] = serviceTypeResponse?.data || [];
  const serviceTypeChartData = serviceTypeData.map((st) => ({
    name: st.serviceType,
    value: st.bookings,
    revenue: st.revenue,
  }));

  // Color palette
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Top drivers data
  const topDrivers: DriverRanking[] = driversResponse?.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Analytics Dashboard</h1>
          <p className="text-neutral-600 mt-1">
            Comprehensive metrics and insights for {dateRange.label.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            disabled={!revenueData.length}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-neutral-200 w-fit">
        {dateRangePresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleRangeChange(preset.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedRange === preset.id
                ? 'bg-blue-600 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-opacity-10 ${kpi.color}`}>{kpi.icon}</div>
                <div className="flex items-center gap-1 text-sm">
                  {kpi.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : kpi.trend === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : null}
                  {kpi.trend !== 'stable' && (
                    <span
                      className={`font-semibold ${
                        kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {kpi.change}%
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-neutral-600">{kpi.label}</p>
                <p className="text-2xl font-bold text-neutral-900">{kpi.value}</p>
              </div>
              <p className="text-xs text-neutral-500 mt-2">vs. previous period</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1: Revenue and Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend ({dateRange.label})</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={(value) => value.split(' ')[0]}
                  />
                  <YAxis
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-neutral-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading revenue data...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings Completed ({dateRange.label})</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={(value) => value.split(' ')[0]}
                  />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-neutral-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading booking data...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Driver Performance and Service Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Driver Performance Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 10 Drivers by Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            {topDrivers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-2 font-semibold text-neutral-700">Rank</th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-700">Driver</th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-700">Code</th>
                      <th className="text-right py-3 px-2 font-semibold text-neutral-700">Earnings</th>
                      <th className="text-right py-3 px-2 font-semibold text-neutral-700">Trips</th>
                      <th className="text-right py-3 px-2 font-semibold text-neutral-700">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {topDrivers.map((driver) => (
                      <tr key={driver.driverId} className="hover:bg-neutral-50">
                        <td className="py-3 px-2 text-neutral-600">#{driver.rank}</td>
                        <td className="py-3 px-2 font-medium text-neutral-900">{driver.driverName}</td>
                        <td className="py-3 px-2 text-neutral-600">{driver.driverCode}</td>
                        <td className="py-3 px-2 text-right text-neutral-900 font-semibold">
                          {formatCurrency(driver.metricValue)}
                        </td>
                        <td className="py-3 px-2 text-right text-neutral-900">
                          {formatNumber(driver.totalTrips)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            ⭐ {driver.rating.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-neutral-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading driver data...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceTypeChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={serviceTypeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {serviceTypeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatNumber(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {serviceTypeChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-neutral-700">{item.name}</span>
                      </div>
                      <span className="font-semibold text-neutral-900">
                        {formatNumber(item.value)} bookings
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-neutral-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading service type data...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
