'use client';

/**
 * Driver LTFRB Compliance View
 *
 * Displays individual driver compliance status including:
 * - License status and expiry
 * - TNVS accreditation status
 * - Document expiry dates
 * - Compliance issues and alerts
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Clock,
  FileText,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface DriverComplianceData {
  driver: {
    id: string;
    driverId: string;
    licenseNumber: string;
    licenseType: string;
    tnvsAccreditationNumber?: string;
    verificationStatus: string;
    licenseExpiryDate: string;
    accreditationExpiryDate?: string;
    hasValidProfessionalLicense: boolean;
    hasTnvsAccreditation: boolean;
    hasCleanDrivingRecord: boolean;
    meetsAgeRequirement: boolean;
    ltfrbCompliant: boolean;
    complianceIssues: Array<{ issue: string; severity: string }>;
  };
  compliant: boolean;
  issues?: string[];
}

export default function DriverCompliancePage() {
  const params = useParams();
  const driverId = params?.driverId as string;

  const [complianceData, setComplianceData] = useState<DriverComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch driver compliance data
  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/compliance/ltfrb/drivers/verify?driverId=${driverId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setComplianceData(result);
      } else {
        throw new Error(result.error || 'Failed to load compliance data');
      }
    } catch (err) {
      console.error('Error fetching driver compliance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load driver compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      fetchComplianceData();
    }
  }, [driverId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading driver compliance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchComplianceData} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!complianceData || !complianceData.driver) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Driver compliance data not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const driver = complianceData.driver;

  // Calculate days until expiry
  const calculateDaysUntilExpiry = (expiryDate: string): number => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const licenseDaysUntilExpiry = calculateDaysUntilExpiry(driver.licenseExpiryDate);
  const accreditationDaysUntilExpiry = driver.accreditationExpiryDate
    ? calculateDaysUntilExpiry(driver.accreditationExpiryDate)
    : null;

  // Determine badge variant based on status
  const getExpiryBadgeVariant = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return 'destructive';
    if (daysUntilExpiry <= 30) return 'default';
    return 'default';
  };

  const getExpiryColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return 'text-destructive';
    if (daysUntilExpiry <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Driver LTFRB Compliance</h1>
          <p className="text-muted-foreground">License: {driver.licenseNumber}</p>
        </div>
        <div className="text-right">
          <Link href={`/drivers/${driverId}`}>
            <Button variant="outline" size="sm">
              Back to Driver Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Overall Compliance Status */}
      <Card className={`border-l-4 ${driver.ltfrbCompliant ? 'border-l-green-600' : 'border-l-destructive'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {driver.ltfrbCompliant ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Overall LTFRB Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={driver.ltfrbCompliant ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                {driver.ltfrbCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Verification Status: {driver.verificationStatus.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <Button onClick={fetchComplianceData} variant="outline" size="sm">
                Refresh Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Requirements Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professional License</CardTitle>
            {driver.hasValidProfessionalLicense ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driver.hasValidProfessionalLicense ? 'Valid' : 'Invalid'}
            </div>
            <p className="text-xs text-muted-foreground">Type: {driver.licenseType}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TNVS Accreditation</CardTitle>
            {driver.hasTnvsAccreditation ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driver.hasTnvsAccreditation ? 'Active' : 'Missing'}
            </div>
            <p className="text-xs text-muted-foreground">
              {driver.tnvsAccreditationNumber || 'Not provided'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Driving Record</CardTitle>
            {driver.hasCleanDrivingRecord ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driver.hasCleanDrivingRecord ? 'Clean' : 'Has Violations'}
            </div>
            <p className="text-xs text-muted-foreground">Record status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Age Requirement</CardTitle>
            {driver.meetsAgeRequirement ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {driver.meetsAgeRequirement ? 'Met' : 'Not Met'}
            </div>
            <p className="text-xs text-muted-foreground">LTFRB requirement</p>
          </CardContent>
        </Card>
      </div>

      {/* Document Expiry Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              License Expiry
            </CardTitle>
            <CardDescription>Professional driver license validity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Expiry Date</span>
              <span className="text-lg font-semibold">
                {new Date(driver.licenseExpiryDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Days Until Expiry</span>
              <Badge variant={getExpiryBadgeVariant(licenseDaysUntilExpiry)}>
                <span className={getExpiryColor(licenseDaysUntilExpiry)}>
                  {licenseDaysUntilExpiry > 0 ? `${licenseDaysUntilExpiry} days` : 'EXPIRED'}
                </span>
              </Badge>
            </div>
            {licenseDaysUntilExpiry <= 30 && licenseDaysUntilExpiry > 0 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>License expiring soon. Please renew.</AlertDescription>
              </Alert>
            )}
            {licenseDaysUntilExpiry < 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>License has expired. Driver cannot operate.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              TNVS Accreditation Expiry
            </CardTitle>
            <CardDescription>Transport network service accreditation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {driver.accreditationExpiryDate && accreditationDaysUntilExpiry !== null ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Expiry Date</span>
                  <span className="text-lg font-semibold">
                    {new Date(driver.accreditationExpiryDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Days Until Expiry</span>
                  <Badge variant={getExpiryBadgeVariant(accreditationDaysUntilExpiry)}>
                    <span className={getExpiryColor(accreditationDaysUntilExpiry)}>
                      {accreditationDaysUntilExpiry > 0 ? `${accreditationDaysUntilExpiry} days` : 'EXPIRED'}
                    </span>
                  </Badge>
                </div>
                {accreditationDaysUntilExpiry <= 30 && accreditationDaysUntilExpiry > 0 && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>Accreditation expiring soon. Please renew.</AlertDescription>
                  </Alert>
                )}
                {accreditationDaysUntilExpiry < 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Accreditation has expired.</AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>TNVS accreditation not found. Driver must obtain accreditation.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Issues */}
      {driver.complianceIssues && driver.complianceIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Compliance Issues
            </CardTitle>
            <CardDescription>Issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {driver.complianceIssues.map((issue, index) => (
                <Alert
                  key={index}
                  variant={issue.severity === 'critical' ? 'destructive' : 'default'}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span>{issue.issue}</span>
                      <Badge variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                        {issue.severity}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LTFRB Requirements Reference */}
      <Card>
        <CardHeader>
          <CardTitle>LTFRB Compliance Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Valid Professional Driver License (not expired)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Active TNVS (Transport Network Vehicle Service) Accreditation</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Clean driving record with no major violations</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Meets minimum age requirement (18 years old)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Link href={`/drivers/${driverId}`} className="flex-1">
          <Button variant="outline" className="w-full">
            <User className="h-4 w-4 mr-2" />
            View Driver Profile
          </Button>
        </Link>
        <Link href="/compliance/ltfrb" className="flex-1">
          <Button variant="outline" className="w-full">
            <FileText className="h-4 w-4 mr-2" />
            View All LTFRB Compliance
          </Button>
        </Link>
      </div>
    </div>
  );
}
