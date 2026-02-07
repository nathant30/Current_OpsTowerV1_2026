'use client';

/**
 * BSP (Bangko Sentral ng Pilipinas) Compliance Dashboard
 *
 * Monitors Anti-Money Laundering (AML) compliance for Philippine financial regulations
 * Displays transaction monitoring, threshold breaches, flagged transactions, compliance alerts
 * Tracks suspicious activity patterns and reporting status
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
  TrendingUp,
  FileText,
  DollarSign,
  Shield,
  Clock,
  Users,
} from 'lucide-react';
import Link from 'next/link';

interface BSPDashboardData {
  amlStatistics: {
    totalTransactionsMonitored: number;
    flaggedForReview: number;
    reviewedCount: number;
    reportedToBSP: number;
    thresholdBreaches: {
      singleTransaction: number;
      dailyCumulative: number;
      monthlyCumulative: number;
    };
  };
  activeAlerts: number;
  pendingReviews: number;
  complianceScore: number;
  todaySummary: {
    transactionsProcessed: number;
    highValueTransactions: number;
    flaggedTransactions: number;
    complianceIssues: number;
  };
  suspiciousPatterns: {
    structuring: number;
    rapidSuccession: number;
    unusualPatterns: number;
  };
}

export default function BSPComplianceDashboard() {
  const [dashboardData, setDashboardData] = useState<BSPDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch BSP compliance data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/compliance/bsp/dashboard');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setDashboardData(result.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(result.error?.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching BSP dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load BSP compliance data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading BSP compliance dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">BSP Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Anti-Money Laundering (AML) monitoring and regulatory compliance
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

      {/* Compliance Score */}
      {dashboardData && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Overall Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-primary">
                  {dashboardData.complianceScore}/100
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {dashboardData.complianceScore >= 90 && 'Excellent compliance'}
                  {dashboardData.complianceScore >= 70 && dashboardData.complianceScore < 90 && 'Good compliance'}
                  {dashboardData.complianceScore < 70 && 'Needs improvement'}
                </p>
              </div>
              <div className="text-right">
                <Badge
                  variant={dashboardData.activeAlerts > 0 ? 'destructive' : 'default'}
                  className="text-sm"
                >
                  {dashboardData.activeAlerts} Active Alerts
                </Badge>
                <div className="mt-2 text-sm text-muted-foreground">
                  {dashboardData.pendingReviews} Pending Reviews
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Summary */}
      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions Today</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.todaySummary.transactionsProcessed.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Processed and monitored
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Value (>₱50K)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.todaySummary.highValueTransactions}
              </div>
              <p className="text-xs text-muted-foreground">
                Exceeds BSP threshold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged Today</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {dashboardData.todaySummary.flaggedTransactions}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Issues</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.todaySummary.complianceIssues}
              </div>
              <p className="text-xs text-muted-foreground">
                Active issues
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AML Statistics */}
      {dashboardData && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>AML Monitoring Statistics</CardTitle>
              <CardDescription>Transaction monitoring and threshold tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Monitored</span>
                <span className="text-lg font-bold">
                  {dashboardData.amlStatistics.totalTransactionsMonitored.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Flagged for Review</span>
                <Badge variant="destructive">
                  {dashboardData.amlStatistics.flaggedForReview}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Reviewed</span>
                <span className="text-lg font-semibold text-green-600">
                  {dashboardData.amlStatistics.reviewedCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Reported to BSP</span>
                <span className="text-lg font-semibold">
                  {dashboardData.amlStatistics.reportedToBSP}
                </span>
              </div>
              <div className="pt-4 border-t">
                <Link href="/compliance/bsp/flagged">
                  <Button variant="outline" className="w-full">
                    View Flagged Transactions
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Threshold Breaches</CardTitle>
              <CardDescription>BSP AML threshold violations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Single Transaction (>₱50K)</span>
                  <Badge variant={dashboardData.amlStatistics.thresholdBreaches.singleTransaction > 0 ? 'destructive' : 'default'}>
                    {dashboardData.amlStatistics.thresholdBreaches.singleTransaction}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Daily Cumulative (>₱100K)</span>
                  <Badge variant={dashboardData.amlStatistics.thresholdBreaches.dailyCumulative > 0 ? 'destructive' : 'default'}>
                    {dashboardData.amlStatistics.thresholdBreaches.dailyCumulative}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Monthly Cumulative (>₱500K)</span>
                  <Badge variant={dashboardData.amlStatistics.thresholdBreaches.monthlyCumulative > 0 ? 'destructive' : 'default'}>
                    {dashboardData.amlStatistics.thresholdBreaches.monthlyCumulative}
                  </Badge>
                </div>
              </div>
              <div className="pt-4 border-t text-xs text-muted-foreground">
                <p>Automatic monitoring per BSP AML regulations</p>
                <p>Circular No. 706 Series of 2010</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suspicious Patterns */}
      {dashboardData && (
        <Card>
          <CardHeader>
            <CardTitle>Suspicious Activity Patterns</CardTitle>
            <CardDescription>Detected patterns requiring investigation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-destructive">
                  {dashboardData.suspiciousPatterns.structuring}
                </div>
                <div className="text-sm text-muted-foreground mt-2 text-center">
                  Structuring
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Multiple transactions just below threshold
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-destructive">
                  {dashboardData.suspiciousPatterns.rapidSuccession}
                </div>
                <div className="text-sm text-muted-foreground mt-2 text-center">
                  Rapid Succession
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  High velocity transactions
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-destructive">
                  {dashboardData.suspiciousPatterns.unusualPatterns}
                </div>
                <div className="text-sm text-muted-foreground mt-2 text-center">
                  Unusual Patterns
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Anomalous behavior detected
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/compliance/bsp/suspicious-activity">
                <Button variant="outline" className="w-full">
                  Review Suspicious Activities
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common compliance tasks and reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/compliance/bsp/flagged">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Flagged Transactions</span>
              </Button>
            </Link>
            <Link href="/compliance/bsp/reports">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>BSP Reports</span>
              </Button>
            </Link>
            <Link href="/compliance/bsp/alerts">
              <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Active Alerts</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
