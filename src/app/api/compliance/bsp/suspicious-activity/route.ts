/**
 * BSP Suspicious Activity API
 *
 * GET /api/compliance/bsp/suspicious-activity - Get suspicious activities
 * POST /api/compliance/bsp/suspicious-activity - Create manual flag
 *
 * @module api/compliance/bsp/suspicious-activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/compliance/bsp/suspicious-activity
 *
 * Get suspicious activities
 *
 * Query params:
 * - status: Filter by status
 * - severity: Filter by severity
 * - limit: Number of activities to return (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    let sql = `SELECT * FROM bsp_suspicious_activity WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (severity) {
      sql += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    sql += ` ORDER BY detected_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query<any>(sql, params);

    const activities = result.rows.map((row) => ({
      id: row.id,
      activityType: row.activity_type,
      userId: row.user_id,
      userType: row.user_type,
      userName: row.user_name,
      relatedTransactions: JSON.parse(row.related_transactions || '[]'),
      detectionMethod: row.detection_method,
      patternDescription: row.pattern_description,
      severity: row.severity,
      evidence: JSON.parse(row.evidence || '{}'),
      status: row.status,
      assignedTo: row.assigned_to,
      investigationNotes: row.investigation_notes,
      falsePositive: row.false_positive,
      reportedToBsp: row.reported_to_bsp,
      bspSarId: row.bsp_sar_id,
      reportedAt: row.reported_at,
      detectedAt: row.detected_at,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      activities,
      count: activities.length,
    });
  } catch (error) {
    console.error('Failed to get suspicious activities:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve suspicious activities',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/compliance/bsp/suspicious-activity
 *
 * Create a manual suspicious activity flag
 *
 * Body:
 * - userId: User ID to flag
 * - userType: User type
 * - patternDescription: Description of suspicious pattern
 * - severity: Severity level
 * - relatedTransactions: Array of related transaction IDs
 * - evidence: Additional evidence
 * - flaggedBy: User ID of person flagging
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      userType,
      patternDescription,
      severity,
      relatedTransactions = [],
      evidence = {},
      flaggedBy,
    } = body;

    if (!userId || !userType || !patternDescription || !severity || !flaggedBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required fields: userId, userType, patternDescription, severity, flaggedBy',
        },
        { status: 400 }
      );
    }

    const result = await query<any>(
      `INSERT INTO bsp_suspicious_activity (
        activity_type, user_id, user_type, pattern_description,
        severity, detection_method, related_transactions, evidence,
        status, false_positive, reported_to_bsp, detected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
      [
        'manual_flag',
        userId,
        userType,
        patternDescription,
        severity,
        'manual',
        JSON.stringify(relatedTransactions),
        JSON.stringify({ ...evidence, flagged_by: flaggedBy }),
        'detected',
        false,
        false,
      ]
    );

    return NextResponse.json({
      success: true,
      activity: {
        id: result.rows[0].id,
        activityType: result.rows[0].activity_type,
        userId: result.rows[0].user_id,
        status: result.rows[0].status,
        detectedAt: result.rows[0].detected_at,
      },
      message: 'Suspicious activity flagged successfully',
    });
  } catch (error) {
    console.error('Failed to create suspicious activity flag:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create suspicious activity flag',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
