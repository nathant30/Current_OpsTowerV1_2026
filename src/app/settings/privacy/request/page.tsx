'use client';

/**
 * Data Subject Rights Request Form
 *
 * User-facing interface for submitting data privacy requests
 * Implements Philippine Data Privacy Act (DPA) rights:
 * - Right to Access (export my data)
 * - Right to Erasure (delete my data)
 * - Right to Rectification (correct my data)
 * - Right to Data Portability
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Download,
  Trash2,
  Edit,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import Link from 'next/link';

type RequestType = 'access' | 'erasure' | 'rectification' | 'portability';

interface RequestTypeInfo {
  value: RequestType;
  label: string;
  description: string;
  icon: React.ReactNode;
  processingTime: string;
  warning?: string;
}

const REQUEST_TYPES: RequestTypeInfo[] = [
  {
    value: 'access',
    label: 'Access My Data',
    description: 'Request a copy of all personal data we have about you',
    icon: <Download className="h-5 w-5" />,
    processingTime: 'Within 30 days',
  },
  {
    value: 'erasure',
    label: 'Delete My Data',
    description: 'Request deletion of your personal data (Right to be Forgotten)',
    icon: <Trash2 className="h-5 w-5" />,
    processingTime: 'Within 30 days',
    warning: 'This action cannot be undone. Some data may be retained for legal compliance.',
  },
  {
    value: 'rectification',
    label: 'Correct My Data',
    description: 'Request correction of inaccurate or incomplete personal data',
    icon: <Edit className="h-5 w-5" />,
    processingTime: 'Within 30 days',
  },
  {
    value: 'portability',
    label: 'Export My Data',
    description: 'Request your data in a portable, machine-readable format',
    icon: <FileText className="h-5 w-5" />,
    processingTime: 'Within 30 days',
  },
];

export default function DataSubjectRequestPage() {
  const [requestType, setRequestType] = useState<RequestType | ''>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Mock user ID - in production, get from auth context/session
  const userId = 'current-user-id'; // TODO: Replace with actual user ID from session

  const selectedRequestInfo = REQUEST_TYPES.find((rt) => rt.value === requestType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/compliance/dpa/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          requestType,
          requestReason: description,
          specificDataRequested: [],
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit request');
      }

      setSuccess(true);
      setRequestId(result.data?.requestId || null);
      setRequestType('');
      setDescription('');
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Data Privacy Request</h1>
        </div>
        <p className="text-muted-foreground">
          Exercise your rights under the Philippine Data Privacy Act (Republic Act No. 10173)
        </p>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your request has been submitted successfully!
            {requestId && (
              <div className="mt-2">
                <strong>Request ID:</strong> {requestId}
              </div>
            )}
            <div className="mt-2">
              We will process your request within 30 days as required by the Data Privacy Act.
              You will receive an email notification once your request is processed.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Information Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Your Rights Under DPA</p>
              <p>
                Under the Philippine Data Privacy Act, you have the right to access, correct,
                delete, and port your personal data. We are committed to processing your
                request within 30 days.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Privacy Request</CardTitle>
          <CardDescription>
            Select the type of request and provide additional details to help us process it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Type Selection */}
            <div className="space-y-3">
              <Label htmlFor="requestType">Request Type</Label>
              <Select
                value={requestType}
                onValueChange={(value) => setRequestType(value as RequestType)}
              >
                <SelectTrigger id="requestType">
                  <SelectValue placeholder="Select a request type..." />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {type.icon}
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected Request Info */}
              {selectedRequestInfo && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    {selectedRequestInfo.icon}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedRequestInfo.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedRequestInfo.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Processing Time:</strong> {selectedRequestInfo.processingTime}
                      </p>
                    </div>
                  </div>

                  {selectedRequestInfo.warning && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {selectedRequestInfo.warning}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Additional Details
                <span className="text-muted-foreground ml-1">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Provide any additional information that will help us process your request..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                For rectification requests, please specify what data needs to be corrected.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={!requestType || loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
              <Link href="/settings/privacy">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Legal Notice */}
      <Card className="mt-6 border-gray-200 bg-gray-50">
        <CardContent className="pt-6 text-xs text-muted-foreground">
          <p className="mb-2">
            <strong>Legal Notice:</strong> This request is processed in accordance with the
            Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and
            Regulations.
          </p>
          <p>
            We may require additional verification of your identity before processing certain
            requests, particularly for deletion or access requests, to ensure the security of
            your personal data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
