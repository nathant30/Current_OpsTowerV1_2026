// Emergency Alerts API - List and Get All Alerts
// GET /api/emergency/alerts - Get all emergency alerts with filtering

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filter parameters
    const status = searchParams.get('status'); // 'triggered', 'processing', 'dispatched', 'resolved', 'all'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const emergencyType = searchParams.get('emergencyType');
    const reporterType = searchParams.get('reporterType'); // 'driver', 'passenger'
    const timeRange = searchParams.get('timeRange'); // 'hour', '6hours', '24hours', 'week'
    const search = searchParams.get('search'); // Search by booking ID, user ID, phone

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Status filter
    if (status && status !== 'all') {
      conditions.push(`sa.status = $${paramIndex++}`);
      params.push(status);
    }

    // Emergency type filter
    if (emergencyType) {
      conditions.push(`sa.emergency_type = $${paramIndex++}`);
      params.push(emergencyType);
    }

    // Reporter type filter
    if (reporterType) {
      conditions.push(`sa.reporter_type = $${paramIndex++}`);
      params.push(reporterType);
    }

    // Time range filter
    if (timeRange) {
      const intervals: Record<string, string> = {
        hour: '1 hour',
        '6hours': '6 hours',
        '24hours': '24 hours',
        week: '7 days'
      };
      const interval = intervals[timeRange] || '24 hours';
      conditions.push(`sa.triggered_at >= NOW() - INTERVAL '${interval}'`);
    }

    // Search filter
    if (search) {
      conditions.push(`(
        sa.booking_id::text ILIKE $${paramIndex} OR
        sa.reporter_id::text ILIKE $${paramIndex} OR
        sa.reporter_phone ILIKE $${paramIndex} OR
        sa.sos_code ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Query alerts with location data
    const query = `
      SELECT
        sa.id,
        sa.sos_code,
        sa.triggered_at,
        ST_X(sa.location::geometry) as longitude,
        ST_Y(sa.location::geometry) as latitude,
        sa.location_accuracy as accuracy,
        sa.location_address as address,
        sa.reporter_id,
        sa.reporter_type,
        sa.reporter_name,
        sa.reporter_phone,
        sa.driver_id,
        sa.booking_id,
        sa.emergency_type,
        sa.severity,
        sa.description,
        sa.status,
        sa.processing_time,
        sa.response_time,
        sa.emergency_services_notified,
        sa.emergency_reference_numbers,
        sa.first_responder_eta,
        sa.acknowledged_at,
        sa.resolved_at,
        sa.created_at,
        sa.updated_at,
        -- Count of notifications sent
        (SELECT COUNT(*) FROM emergency_notification_channels enc
         WHERE enc.sos_alert_id = sa.id) as notification_count,
        -- Count of location trail points
        (SELECT COUNT(*) FROM emergency_location_trail elt
         WHERE elt.sos_alert_id = sa.id) as location_trail_count,
        -- Latest location from trail
        (SELECT json_build_object(
           'latitude', ST_Y(elt.location::geometry),
           'longitude', ST_X(elt.location::geometry),
           'recordedAt', elt.recorded_at
         ) FROM emergency_location_trail elt
         WHERE elt.sos_alert_id = sa.id
         ORDER BY elt.recorded_at DESC LIMIT 1) as latest_location
      FROM sos_alerts sa
      ${whereClause}
      ORDER BY sa.triggered_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sos_alerts sa
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Format response
    const alerts = result.rows.map(row => ({
      id: row.id,
      sosCode: row.sos_code,
      triggeredAt: row.triggered_at,
      location: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        accuracy: row.accuracy,
        address: row.address
      },
      reporterId: row.reporter_id,
      reporterType: row.reporter_type,
      reporterName: row.reporter_name,
      reporterPhone: row.reporter_phone,
      driverId: row.driver_id,
      bookingId: row.booking_id,
      emergencyType: row.emergency_type,
      severity: row.severity,
      description: row.description,
      status: row.status,
      processingTime: row.processing_time,
      responseTime: row.response_time,
      emergencyServicesNotified: row.emergency_services_notified || [],
      emergencyReferenceNumbers: row.emergency_reference_numbers || {},
      firstResponderETA: row.first_responder_eta,
      acknowledgedAt: row.acknowledged_at,
      resolvedAt: row.resolved_at,
      notificationCount: parseInt(row.notification_count || '0'),
      locationTrailCount: parseInt(row.location_trail_count || '0'),
      latestLocation: row.latest_location,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // Get statistics
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'triggered') as triggered,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'dispatched') as dispatched,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
        COUNT(*) FILTER (WHERE status = 'responding') as responding,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'false_alarm') as false_alarm,
        AVG(response_time) as avg_response_time,
        AVG(EXTRACT(EPOCH FROM (resolved_at - triggered_at))) as avg_resolution_time
      FROM sos_alerts
      WHERE triggered_at >= NOW() - INTERVAL '24 hours'
    `;
    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        },
        statistics: {
          triggered: parseInt(stats.triggered || '0'),
          processing: parseInt(stats.processing || '0'),
          dispatched: parseInt(stats.dispatched || '0'),
          acknowledged: parseInt(stats.acknowledged || '0'),
          responding: parseInt(stats.responding || '0'),
          resolved: parseInt(stats.resolved || '0'),
          falseAlarm: parseInt(stats.false_alarm || '0'),
          avgResponseTime: parseFloat(stats.avg_response_time || '0'),
          avgResolutionTime: parseFloat(stats.avg_resolution_time || '0')
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch emergency alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch emergency alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
