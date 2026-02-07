'use client';

/**
 * BSP Flagged Transactions Review Interface
 *
 * Displays transactions flagged for AML review by BSP monitoring system
 * Allows compliance officers to review, investigate, and mark transactions
 * Supports filtering by risk level, date range, and review status
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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  FileText,
  DollarSign,
  User,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';
import Link from 'next/link';

interface FlaggedTransaction {
  id: string;
  transactionId: string;
  paymentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  transactionType: string;
  transactionDate: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  riskFactors: string[];
  thresholdBreaches: {
    singleTransaction: boolean;
    dailyCumulative: boolean;
    monthlyCumulative: boolean;
  };
  flaggedForReview: boolean;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  reportedToBSP: boolean;
  bspReportId?: string;
}

export default function FlaggedTransactionsPage() {
  const [transactions, setTransactions] = useState<FlaggedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [reviewFilter, setReviewFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'risk'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch flagged transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/compliance/bsp/flagged-transactions');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setTransactions(result.data.transactions || []);
      } else {
        throw new Error(result.error?.message || 'Failed to load flagged transactions');
      }
    } catch (err) {
      console.error('Error fetching flagged transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Mark transaction as reviewed
  const markAsReviewed = async (transactionId: string, notes: string) => {
    try {
      const response = await fetch(`/api/compliance/bsp/flagged-transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewed: true,
          reviewNotes: notes,
        }),
      });

      if (response.ok) {
        // Refresh data
        await fetchTransactions();
      } else {
        throw new Error('Failed to update transaction');
      }
    } catch (err) {
      console.error('Error updating transaction:', err);
      alert('Failed to mark transaction as reviewed');
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((tx) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !tx.transactionId.toLowerCase().includes(search) &&
          !tx.userName.toLowerCase().includes(search) &&
          !tx.userEmail.toLowerCase().includes(search)
        ) {
          return false;
        }
      }

      // Risk level filter
      if (riskFilter !== 'all' && tx.riskLevel !== riskFilter) {
        return false;
      }

      // Review status filter
      if (reviewFilter === 'reviewed' && !tx.reviewed) return false;
      if (reviewFilter === 'pending' && tx.reviewed) return false;

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        comparison = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'risk') {
        comparison = a.riskScore - b.riskScore;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading flagged transactions...</p>
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
          <h1 className="text-3xl font-bold mb-2">Flagged Transactions</h1>
          <p className="text-muted-foreground">
            Review transactions flagged for AML compliance by the BSP monitoring system
          </p>
        </div>
        <Link href="/compliance/bsp">
          <Button variant="outline">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Transaction ID, user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Risk Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Risk Level</label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Review Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Review Status</label>
              <Select value={reviewFilter} onValueChange={setReviewFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="risk">Risk Score</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{transactions.length}</div>
            <div className="text-sm text-muted-foreground">Total Flagged</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">
              {transactions.filter((t) => !t.reviewed).length}
            </div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {transactions.filter((t) => t.reviewed).length}
            </div>
            <div className="text-sm text-muted-foreground">Reviewed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {transactions.filter((t) => t.riskLevel === 'critical' || t.riskLevel === 'high').length}
            </div>
            <div className="text-sm text-muted-foreground">High/Critical Risk</div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions Requiring Review</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transaction(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Thresholds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No flagged transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">
                        {tx.transactionId.substring(0, 12)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(tx.transactionDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <div>
                            <div className="font-medium text-sm">{tx.userName}</div>
                            <div className="text-xs text-muted-foreground">{tx.userEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-semibold">
                          <DollarSign className="h-3 w-3" />
                          ₱{tx.amount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(tx.riskLevel)}>
                          {tx.riskLevel.toUpperCase()} ({tx.riskScore})
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {tx.thresholdBreaches.singleTransaction && (
                            <Badge variant="outline" className="w-fit">₱50K Single</Badge>
                          )}
                          {tx.thresholdBreaches.dailyCumulative && (
                            <Badge variant="outline" className="w-fit">₱100K Daily</Badge>
                          )}
                          {tx.thresholdBreaches.monthlyCumulative && (
                            <Badge variant="outline" className="w-fit">₱500K Monthly</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tx.reviewed ? (
                          <Badge variant="default" className="flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Reviewed
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <XCircle className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const notes = prompt('Review notes:');
                              if (notes) {
                                markAsReviewed(tx.id, notes);
                              }
                            }}
                            disabled={tx.reviewed}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
