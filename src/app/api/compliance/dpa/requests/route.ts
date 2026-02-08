/**
 * DPA Data Subject Rights Requests API
 *
 * Handles submission and management of data subject rights requests
 * Implements Philippine Data Privacy Act (DPA) compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDataSubjectRightsService } from '@/lib/compliance/dpa/data-subject-rights';
import { query } from '@/lib/db';
import type { DataRequestType } from '@/lib/compliance/dpa/types';

// GET /api/compliance/dpa/requests - List all data requests (admin)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    let sql = `
      SELECT
        ddr.*,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        CASE
          WHEN ddr.deadline_date < NOW() AND ddr.status NOT IN ('completed', 'rejected', 'cancelled')
          THEN true
          ELSE false
        END as is_overdue
      FROM dpa_data_requests ddr
      LEFT JOIN users u ON ddr.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND ddr.status = $${params.length}`;
    }

    if (userId) {
      params.push(userId);
      sql += ` AND ddr.user_id = $${params.length}`;
    }

    sql += ` ORDER BY ddr.submitted_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: {
        requests: result.rows,
        total: result.rowCount || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching data requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data requests',
      },
      { status: 500 }
    );
  }
}

// POST /api/compliance/dpa/requests - Submit new data request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.requestType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId and requestType',
        },
        { status: 400 }
      );
    }

    // Validate request type
    const validTypes: DataRequestType[] = [
      'access',
      'rectification',
      'erasure',
      'portability',
      'restriction',
      'objection',
      'automated_decision',
    ];

    if (!validTypes.includes(body.requestType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request type',
        },
        { status: 400 }
      );
    }

    // Get user information
    const userResult = await query(
      'SELECT id, email, phone, user_type FROM users WHERE id = $1',
      [body.userId]
    );

    if (userResult.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Submit request using service
    const service = getDataSubjectRightsService();
    const response = await service.submitRequest({
      userId: body.userId,
      userType: user.user_type,
      userEmail: user.email,
      userPhone: user.phone,
      requestType: body.requestType,
      requestReason: body.requestReason,
      specificDataRequested: body.specificDataRequested || [],
    });

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: response.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: response.request,
        message: 'Data request submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting data request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit data request',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/compliance/dpa/requests - Update request status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.requestId || !body.status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: requestId and status',
        },
        { status: 400 }
      );
    }

    const service = getDataSubjectRightsService();
    const response = await service.updateRequestStatus(
      body.requestId,
      body.status,
      body.notes
    );

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: response.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: response.request,
      message: 'Request status updated successfully',
    });
  } catch (error) {
    console.error('Error updating request status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update request status',
      },
      { status: 500 }
    );
  }
}
