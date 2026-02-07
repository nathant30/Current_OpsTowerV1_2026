// Emergency Contacts API - CRUD operations
// GET /api/emergency/contacts - List emergency contacts
// POST /api/emergency/contacts - Create new emergency contact

import { NextRequest, NextResponse } from 'next/server';
import { emergencyContactsService } from '@/lib/emergency/emergency-contacts-service';
import { logger } from '@/lib/security/productionLogger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType') as 'driver' | 'passenger';

    if (!userId || !userType) {
      return NextResponse.json(
        { error: 'userId and userType are required' },
        { status: 400 }
      );
    }

    if (!['driver', 'passenger'].includes(userType)) {
      return NextResponse.json(
        { error: 'userType must be either "driver" or "passenger"' },
        { status: 400 }
      );
    }

    const contacts = await emergencyContactsService.getEmergencyContacts(userId, userType);
    const statistics = await emergencyContactsService.getContactStatistics(userId, userType);

    return NextResponse.json({
      success: true,
      data: {
        contacts,
        statistics
      }
    });
  } catch (error: any) {
    logger.error('Failed to get emergency contacts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve emergency contacts', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['userId', 'userType', 'name', 'relationship', 'phone', 'priority'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate userType
    if (!['driver', 'passenger'].includes(body.userType)) {
      return NextResponse.json(
        { error: 'userType must be either "driver" or "passenger"' },
        { status: 400 }
      );
    }

    // Validate priority
    if (![1, 2, 3].includes(body.priority)) {
      return NextResponse.json(
        { error: 'priority must be 1, 2, or 3' },
        { status: 400 }
      );
    }

    // Validate relationship
    const validRelationships = ['spouse', 'parent', 'child', 'sibling', 'friend', 'coworker', 'other'];
    if (!validRelationships.includes(body.relationship)) {
      return NextResponse.json(
        { error: `relationship must be one of: ${validRelationships.join(', ')}` },
        { status: 400 }
      );
    }

    const contact = await emergencyContactsService.createEmergencyContact({
      userId: body.userId,
      userType: body.userType,
      name: body.name,
      relationship: body.relationship,
      phone: body.phone,
      email: body.email,
      alternativePhone: body.alternativePhone,
      priority: body.priority,
      notifyViaSms: body.notifyViaSms,
      notifyViaEmail: body.notifyViaEmail,
      notifyViaPhoneCall: body.notifyViaPhoneCall
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency contact created successfully. Verification code sent.',
      data: contact
    }, { status: 201 });
  } catch (error: any) {
    logger.error('Failed to create emergency contact:', error);
    return NextResponse.json(
      { error: 'Failed to create emergency contact', details: error.message },
      { status: 500 }
    );
  }
}
