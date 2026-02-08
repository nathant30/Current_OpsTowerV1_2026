'use client';

/**
 * BSP Report Management Page
 *
 * Manual BSP report generation and report history view
 * Allows compliance officers to:
 * - Generate daily reports manually
 * - View recent report submissions
 * - Download report files
 * - Track BSP submission status
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from 'lucide-react';

interface ReportSubmission {
  id: string;
  reportId: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  totalTransactions: number;
  totalAmount: number;
  flaggedTransactions: number;
  suspiciousActivities: number;
  filePath?: string;
  fileFormat: string;
  fileSizeBytes?: number;
  status: string;
  bspReferenceNumber?: string;
  generatedAt: string;
  submittedAt?: string;
}

export default function BSPReportsPage() {
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);

  // Fetch recent reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/compliance/bsp/reports');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.reports) {
        setReports(result.reports || []);
      } else {
        throw new Error(result.error || 'Failed to load reports');
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Generate daily report manually
  const generateDailyReport = async () => {
    try {
      setGenerating(true);
      setError(null);
      setGenerateSuccess(null);

      const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret-change-in-production';

      const response = await fetch('/api/cron/bsp-daily', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate report');
      }

      if (result.success) {
        setGenerateSuccess(
          `Report generated successfully! Report ID: ${result.data.reportId}, Records: ${result.data.recordCount}`
        );
        // Refresh reports list
        setTimeout(() => {
          fetchReports();
        }, 1000);
      } else {
        throw new Error(result.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchReports();
  }, []);

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string; icon: any }> = {
      generated: { variant: 'default', label: 'Generated', icon: FileText },
      submitted: { variant: 'default', label: 'Submitted', icon: CheckCircle },
      acknowledged: { variant: 'default', label: 'Acknowledged', icon: CheckCircle },
      draft: { variant: 'secondary', label: 'Draft', icon: Clock },
      rejected: { variant: 'destructive', label: 'Rejected', icon: AlertTriangle },
    };

    const config = statusConfig[status] || { variant: 'default', label: status, icon: FileText };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BSP Report Management</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage BSP compliance reports
          </p>
        </div>
        <Button onClick={fetchReports} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Generate Report Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate Daily Report
          </CardTitle>
          <CardDescription>
            Manually generate a BSP compliance report for yesterday&apos;s transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {generateSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{generateSuccess}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <Button
              onClick={generateDailyReport}
              disabled={generating}
              className="w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Yesterday&apos;s Report
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              This will generate a report for transactions from yesterday
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            View and download recent BSP compliance report submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && reports.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">No reports generated yet</p>
              <p className="text-sm text-muted-foreground">
                Generate your first report using the button above
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Flagged</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono text-xs">
                        {report.reportId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {report.reportType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(report.periodStart).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.totalTransactions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(report.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.flaggedTransactions > 0 ? (
                          <Badge variant="destructive">{report.flaggedTransactions}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(report.generatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.filePath && (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.reduce((sum, r) => sum + r.totalTransactions, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Flagged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.reduce((sum, r) => sum + r.flaggedTransactions, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
