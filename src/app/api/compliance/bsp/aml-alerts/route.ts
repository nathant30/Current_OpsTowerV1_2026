/**
 * BSP AML Alerts API
 *
 * GET /api/compliance/bsp/aml-alerts - Get AML alerts
 *
 * @module api/compliance/bsp/aml-alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/compliance/bsp/aml-alerts
 *
 * Get AML compliance alerts
 *
 * Query params:
 * - status: Filter by status (active, acknowledged, resolved, dismissed)
 * - severity: Filter by severity (info, warning, error, critical)
 * - limit: Number of alerts to return (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    let sql = `SELECT * FROM bsp_compliance_alerts WHERE 1=1`;
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

    sql += ` ORDER BY triggered_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query<any>(sql, params);

    const alerts = result.rows.map((row) => ({
      id: row.id,
      alertType: row.alert_type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      transactionId: row.transaction_id,
      userId: row.user_id,
      reportId: row.report_id,
      alertData: JSON.parse(row.alert_data || '{}'),
      status: row.status,
      acknowledgedBy: row.acknowledged_by,
      acknowledgedAt: row.acknowledged_at,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      resolutionNotes: row.resolution_notes,
      notificationSent: row.notification_sent,
      notificationChannels: JSON.parse(row.notification_channels || '[]'),
      triggeredAt: row.triggered_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('Failed to get AML alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve AML alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/compliance/bsp/aml-alerts/[id]
 *
 * Update alert status (acknowledge or resolve)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, action, userId, notes } = body;

    if (!alertId || !action || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Alert ID, action, and user ID are required',
        },
        { status: 400 }
      );
    }

    let updateSql = '';
    const params: any[] = [];

    if (action === 'acknowledge') {
      updateSql = `UPDATE bsp_compliance_alerts
                   SET status = 'acknowledged',
                       acknowledged_by = $1,
                       acknowledged_at = NOW()
                   WHERE id = $2`;
      params.push(userId, alertId);
    } else if (action === 'resolve') {
      updateSql = `UPDATE bsp_compliance_alerts
                   SET status = 'resolved',
                       resolved_by = $1,
                       resolved_at = NOW(),
                       resolution_notes = $2
                   WHERE id = $3`;
      params.push(userId, notes || '', alertId);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action: ${action}`,
        },
        { status: 400 }
      );
    }

    await query(updateSql, params);

    return NextResponse.json({
      success: true,
      message: `Alert ${action}d successfully`,
    });
  } catch (error) {
    console.error('Failed to update alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
