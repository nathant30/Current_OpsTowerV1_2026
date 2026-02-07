// Emergency Alert by ID - Get single alert and Update status
// GET /api/emergency/alerts/:id - Get alert details with full history
// PUT /api/emergency/alerts/:id - Update alert status

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { logger } from '@/lib/security/productionLogger';
import { getWebSocketManager } from '@/lib/websocket';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get alert details
    const alertQuery = `
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
        sa.acknowledged_by,
        sa.resolved_at,
        sa.resolved_by,
        sa.resolution_notes,
        sa.false_alarm_reason,
        sa.created_at,
        sa.updated_at
      FROM sos_alerts sa
      WHERE sa.id = $1
    `;

    const alertResult = await db.query(alertQuery, [id]);

    if (alertResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Emergency alert not found' },
        { status: 404 }
      );
    }

    const row = alertResult.rows[0];

    // Get location trail
    const locationTrailQuery = `
      SELECT
        id,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        accuracy,
        altitude,
        speed,
        heading,
        address,
        location_source,
        battery_level,
        is_moving,
        geofence_breached,
        geofence_name,
        recorded_at
      FROM emergency_location_trail
      WHERE sos_alert_id = $1
      ORDER BY recorded_at DESC
      LIMIT 100
    `;
    const locationTrailResult = await db.query(locationTrailQuery, [id]);

    // Get notification history
    const notificationsQuery = `
      SELECT
        id,
        channel_type,
        recipient,
        recipient_type,
        subject,
        message,
        status,
        priority,
        sent_at,
        delivered_at,
        acknowledged,
        acknowledged_at,
        created_at
      FROM emergency_notification_channels
      WHERE sos_alert_id = $1
      ORDER BY created_at DESC
    `;
    const notificationsResult = await db.query(notificationsQuery, [id]);

    // Get emergency contacts notified
    const contactsQuery = `
      SELECT
        ec.id,
        ec.name,
        ec.relationship,
        ec.phone,
        ec.priority,
        ecn.notification_type,
        ecn.status,
        ecn.sent_at,
        ecn.delivered_at,
        ecn.acknowledged
      FROM emergency_contact_notifications ecn
      JOIN emergency_contacts ec ON ec.id = ecn.emergency_contact_id
      WHERE ecn.sos_alert_id = $1
      ORDER BY ec.priority ASC
    `;
    const contactsResult = await db.query(contactsQuery, [id]);

    // Format response
    const alert = {
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
      acknowledgedBy: row.acknowledged_by,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      resolutionNotes: row.resolution_notes,
      falseAlarmReason: row.false_alarm_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      locationTrail: locationTrailResult.rows.map(loc => ({
        id: loc.id,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        accuracy: loc.accuracy,
        altitude: loc.altitude,
        speed: loc.speed,
        heading: loc.heading,
        address: loc.address,
        locationSource: loc.location_source,
        batteryLevel: loc.battery_level,
        isMoving: loc.is_moving,
        geofenceBreached: loc.geofence_breached,
        geofenceName: loc.geofence_name,
        recordedAt: loc.recorded_at
      })),
      notifications: notificationsResult.rows,
      emergencyContactsNotified: contactsResult.rows
    };

    return NextResponse.json({
      success: true,
      data: alert
    });

  } catch (error) {
    logger.error('Failed to fetch emergency alert details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch emergency alert details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      status,
      resolutionNotes,
      falseAlarmReason,
      operatorId,
      operatorName
    } = body;

    // Validate status
    const validStatuses = ['triggered', 'processing', 'dispatched', 'acknowledged', 'responding', 'resolved', 'false_alarm'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);

      // If status is 'acknowledged', set acknowledged_at
      if (status === 'acknowledged' && !updates.includes('acknowledged_at')) {
        updates.push(`acknowledged_at = NOW()`);
        updates.push(`acknowledged_by = $${paramIndex++}`);
        values.push(operatorId || 'system');
      }

      // If status is 'resolved', set resolved_at
      if (status === 'resolved' && !updates.includes('resolved_at')) {
        updates.push(`resolved_at = NOW()`);
        updates.push(`resolved_by = $${paramIndex++}`);
        values.push(operatorId || 'system');
      }
    }

    if (resolutionNotes) {
      updates.push(`resolution_notes = $${paramIndex++}`);
      values.push(resolutionNotes);
    }

    if (falseAlarmReason) {
      updates.push(`false_alarm_reason = $${paramIndex++}`);
      values.push(falseAlarmReason);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE sos_alerts
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Emergency alert not found' },
        { status: 404 }
      );
    }

    // Broadcast update via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      wsManager.broadcastToAll('emergency_alert_update', {
        alertId: id,
        status,
        operatorName,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Emergency alert ${id} updated to status: ${status} by ${operatorName || 'system'}`);

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      },
      message: 'Emergency alert updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update emergency alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update emergency alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
