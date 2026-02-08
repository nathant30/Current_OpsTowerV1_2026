'use client';

/**
 * LTFRB (Land Transportation Franchising and Regulatory Board) Compliance Dashboard
 *
 * Monitors transportation regulatory compliance for Philippine operations
 * Displays driver compliance, vehicle franchise status, trip reporting, and document expiry
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Car,
  FileText,
  Shield,
  Clock,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

interface LTFRBDashboardData {
  drivers: {
    total: number;
    compliant: number;
    verified: number;
    expiringSoon: number;
    expired: number;
  };
  vehicles: {
    total: number;
    compliant: number;
    verified: number;
    expiringSoon: number;
    expired: number;
  };
  trips: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    reported: number;
    unreported: number;
  };
}

export default function LTFRBComplianceDashboard() {
  const [dashboardData, setDashboardData] = useState<LTFRBDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch LTFRB compliance data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/compliance/ltfrb/dashboard');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.dashboard) {
        setDashboardData(result.dashboard);
        setLastUpdate(new Date());
      } else {
        throw new Error(result.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching LTFRB dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load LTFRB compliance data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 60 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading LTFRB compliance dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate compliance percentages
  const driverComplianceRate = dashboardData?.drivers.total
    ? Math.round((dashboardData.drivers.compliant / dashboardData.drivers.total) * 100)
    : 0;
  const vehicleComplianceRate = dashboardData?.vehicles.total
    ? Math.round((dashboardData.vehicles.compliant / dashboardData.vehicles.total) * 100)
    : 0;
  const tripReportingRate = dashboardData?.trips.today
    ? Math.round((dashboardData.trips.reported / (dashboardData.trips.reported + dashboardData.trips.unreported)) * 100)
    : 100;

  const overallCompliance = Math.round((driverComplianceRate + vehicleComplianceRate + tripReportingRate) / 3);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">LTFRB Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Land Transportation Franchising and Regulatory Board compliance monitoring
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>Last updated: {lastUpdate.toLocaleTimeString()}</div>
          <Button onClick={fetchDashboardData} variant="outline" size="sm" className="mt-2">
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overall Compliance Score */}
      {dashboardData && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Overall LTFRB Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-primary">
                  {overallCompliance}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {overallCompliance >= 90 && 'Excellent compliance'}
                  {overallCompliance >= 70 && overallCompliance < 90 && 'Good compliance'}
                  {overallCompliance < 70 && 'Needs improvement'}
                </p>
              </div>
              <div className="text-right space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Drivers:</span>
                  <Badge variant={driverComplianceRate >= 90 ? 'default' : 'destructive'}>
                    {driverComplianceRate}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Vehicles:</span>
                  <Badge variant={vehicleComplianceRate >= 90 ? 'default' : 'destructive'}>
                    {vehicleComplianceRate}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Reporting:</span>
                  <Badge variant={tripReportingRate >= 95 ? 'default' : 'destructive'}>
                    {tripReportingRate}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver Compliance Summary */}
      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.drivers.total}</div>
              <p className="text-xs text-muted-foreground">Registered drivers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliant</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboardData.drivers.compliant}
              </div>
              <p className="text-xs text-muted-foreground">
                {driverComplianceRate}% compliance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.drivers.verified}
              </div>
              <p className="text-xs text-muted-foreground">LTFRB verified</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboardData.drivers.expiringSoon}
              </div>
              <p className="text-xs text-muted-foreground">Within 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {dashboardData.drivers.expired}
              </div>
              <p className="text-xs text-muted-foreground">Require renewal</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vehicle Compliance Summary */}
      {dashboardData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Franchise Compliance
            </CardTitle>
            <CardDescription>Vehicle registration and franchise status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center">
                <div className="text-3xl font-bold">{dashboardData.vehicles.total}</div>
                <div className="text-sm text-muted-foreground mt-1">Total Vehicles</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {dashboardData.vehicles.compliant}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {dashboardData.vehicles.verified}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Verified</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {dashboardData.vehicles.expiringSoon}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Expiring Soon</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive">
                  {dashboardData.vehicles.expired}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Expired</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Reporting Statistics */}
      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Trip Statistics</CardTitle>
              <CardDescription>Completed trips and reporting status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Trips Today</span>
                <span className="text-2xl font-bold">{dashboardData.trips.today}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Trips This Week</span>
                <span className="text-lg font-semibold">{dashboardData.trips.thisWeek}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Trips This Month</span>
                <span className="text-lg font-semibold">{dashboardData.trips.thisMonth}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>LTFRB Reporting Status</CardTitle>
              <CardDescription>Trip reporting compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Reported to LTFRB</span>
                <Badge variant="default" className="text-lg">
                  {dashboardData.trips.reported}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pending Report</span>
                <Badge variant={dashboardData.trips.unreported > 0 ? 'destructive' : 'default'} className="text-lg">
                  {dashboardData.trips.unreported}
                </Badge>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Reporting Rate</span>
                  <span className="text-2xl font-bold text-primary">{tripReportingRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Alerts */}
      {dashboardData && (dashboardData.drivers.expired > 0 || dashboardData.vehicles.expired > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Urgent Compliance Issues</div>
            <ul className="list-disc list-inside space-y-1">
              {dashboardData.drivers.expired > 0 && (
                <li>{dashboardData.drivers.expired} driver(s) with expired documents</li>
              )}
              {dashboardData.vehicles.expired > 0 && (
                <li>{dashboardData.vehicles.expired} vehicle(s) with expired franchise</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Document Expiry Warning */}
      {dashboardData && (dashboardData.drivers.expiringSoon > 0 || dashboardData.vehicles.expiringSoon > 0) && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Upcoming Document Expiry</div>
            <ul className="list-disc list-inside space-y-1">
              {dashboardData.drivers.expiringSoon > 0 && (
                <li>{dashboardData.drivers.expiringSoon} driver document(s) expiring within 30 days</li>
              )}
              {dashboardData.vehicles.expiringSoon > 0 && (
                <li>{dashboardData.vehicles.expiringSoon} vehicle franchise(s) expiring within 30 days</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common LTFRB compliance tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/drivers">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-2">
                <Users className="h-5 w-5" />
                <span>View Driver Compliance</span>
              </Button>
            </Link>
            <Link href="/vehicles">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-2">
                <Car className="h-5 w-5" />
                <span>View Vehicle Franchises</span>
              </Button>
            </Link>
            <Link href="/compliance/ltfrb/reports">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>LTFRB Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Information */}
      <Card>
        <CardHeader>
          <CardTitle>LTFRB Compliance Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Driver Requirements</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Valid Professional Driver License</li>
                <li>TNVS (Transport Network Vehicle Service) Accreditation</li>
                <li>Clean driving record</li>
                <li>Age requirement compliance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Vehicle Requirements</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Valid LTFRB Franchise</li>
                <li>Maximum 7-year vehicle age limit</li>
                <li>Emission standards compliance</li>
                <li>Valid OR/CR and comprehensive insurance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
