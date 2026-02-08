'use client';

/**
 * DPA Data Subject Rights Request Management Dashboard
 *
 * Admin interface for managing data privacy requests
 * Implements Philippine Data Privacy Act (DPA) 30-day deadline compliance
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Edit,
  FileText,
  Filter,
  Search,
  Shield,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

interface DPARequest {
  id: string;
  request_id: string;
  user_id: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  request_type: string;
  request_reason: string;
  status: string;
  priority: string;
  deadline_date: string;
  submitted_at: string;
  completed_at?: string;
  is_overdue: boolean;
}

type StatusFilter = 'all' | 'submitted' | 'under_review' | 'processing' | 'completed' | 'rejected';

const REQUEST_TYPE_LABELS: Record<string, string> = {
  access: 'Access My Data',
  erasure: 'Delete My Data',
  rectification: 'Correct My Data',
  portability: 'Export My Data',
  restriction: 'Restrict Processing',
  objection: 'Object to Processing',
  automated_decision: 'Automated Decision',
};

const REQUEST_TYPE_ICONS: Record<string, React.ReactNode> = {
  access: <Download className="h-4 w-4" />,
  erasure: <Trash2 className="h-4 w-4" />,
  rectification: <Edit className="h-4 w-4" />,
  portability: <FileText className="h-4 w-4" />,
  restriction: <Shield className="h-4 w-4" />,
  objection: <XCircle className="h-4 w-4" />,
  automated_decision: <AlertTriangle className="h-4 w-4" />,
};

export default function DPARequestsManagementPage() {
  const [requests, setRequests] = useState<DPARequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedRequest, setSelectedRequest] = useState<DPARequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'complete' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/compliance/dpa/requests?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setRequests(result.data.requests || []);
      } else {
        throw new Error(result.error || 'Failed to load requests');
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load DPA requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedRequest || !actionType) return;

    setActionLoading(true);

    try {
      let newStatus = '';

      switch (actionType) {
        case 'approve':
          newStatus = 'approved';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
        case 'complete':
          newStatus = 'completed';
          break;
      }

      const response = await fetch('/api/compliance/dpa/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: selectedRequest.request_id,
          status: newStatus,
          notes: actionNotes,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update request');
      }

      // Refresh data
      await fetchRequests();

      // Close dialog
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setActionType(null);
      setActionNotes('');
    } catch (err) {
      console.error('Error updating request:', err);
      alert(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setActionLoading(false);
    }
  };

  // Open action dialog
  const openActionDialog = (request: DPARequest, action: 'approve' | 'reject' | 'complete') => {
    setSelectedRequest(request);
    setActionType(action);
    setActionDialogOpen(true);
  };

  // Filter requests
  const filteredRequests = requests.filter((request) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !request.request_id.toLowerCase().includes(search) &&
        !request.user_email.toLowerCase().includes(search) &&
        !`${request.user_first_name} ${request.user_last_name}`.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: requests.length,
    pending: requests.filter((r) =>
      ['submitted', 'under_review', 'processing'].includes(r.status)
    ).length,
    completed: requests.filter((r) => r.status === 'completed').length,
    overdue: requests.filter((r) => r.is_overdue).length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'under_review':
        return <Badge variant="default">Under Review</Badge>;
      case 'processing':
        return <Badge variant="default">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDaysRemaining = (deadlineDate: string) => {
    const deadline = new Date(deadlineDate);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading && requests.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading DPA requests...</p>
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
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">DPA Request Management</h1>
          </div>
          <p className="text-muted-foreground">
            Manage data subject rights requests under the Philippine Data Privacy Act
          </p>
        </div>
        <Link href="/compliance">
          <Button variant="outline">Back to Compliance</Button>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Request ID, user email, name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Subject Rights Requests</CardTitle>
          <CardDescription>{filteredRequests.length} request(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const daysRemaining = getDaysRemaining(request.deadline_date);
                    const isUrgent = daysRemaining <= 7 && !request.is_overdue;

                    return (
                      <TableRow
                        key={request.id}
                        className={request.is_overdue ? 'bg-red-50' : ''}
                      >
                        <TableCell className="font-mono text-sm">
                          {request.request_id.substring(0, 16)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">
                                {request.user_first_name} {request.user_last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {request.user_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {REQUEST_TYPE_ICONS[request.request_type]}
                            <span className="text-sm">
                              {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(request.submitted_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <div>
                              <div
                                className={`text-sm font-medium ${
                                  request.is_overdue
                                    ? 'text-red-600'
                                    : isUrgent
                                    ? 'text-orange-600'
                                    : ''
                                }`}
                              >
                                {new Date(request.deadline_date).toLocaleDateString()}
                              </div>
                              <div
                                className={`text-xs ${
                                  request.is_overdue
                                    ? 'text-red-600'
                                    : isUrgent
                                    ? 'text-orange-600'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {request.is_overdue
                                  ? `${Math.abs(daysRemaining)} days overdue`
                                  : `${daysRemaining} days remaining`}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {request.status === 'submitted' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openActionDialog(request, 'approve')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {request.status === 'approved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openActionDialog(request, 'complete')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Complete
                              </Button>
                            )}
                            {['submitted', 'under_review', 'processing'].includes(
                              request.status
                            ) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openActionDialog(request, 'reject')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Request'}
              {actionType === 'reject' && 'Reject Request'}
              {actionType === 'complete' && 'Mark as Complete'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Request ID: {selectedRequest.request_id}
                  <br />
                  User: {selectedRequest.user_first_name} {selectedRequest.user_last_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder={
                  actionType === 'reject'
                    ? 'Please provide a reason for rejection...'
                    : 'Add any notes or comments...'
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
