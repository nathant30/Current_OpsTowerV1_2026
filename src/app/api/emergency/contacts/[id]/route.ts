// Emergency Contact API - Single contact operations
// GET /api/emergency/contacts/[id] - Get single contact
// PUT /api/emergency/contacts/[id] - Update contact
// DELETE /api/emergency/contacts/[id] - Delete contact

import { NextRequest, NextResponse } from 'next/server';
import { emergencyContactsService } from '@/lib/emergency/emergency-contacts-service';
import { logger } from '@/lib/security/productionLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contact = await emergencyContactsService.getEmergencyContact(params.id);

    if (!contact) {
      return NextResponse.json(
        { error: 'Emergency contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contact
    });
  } catch (error: any) {
    logger.error(`Failed to get emergency contact ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to retrieve emergency contact', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate priority if provided
    if (body.priority && ![1, 2, 3].includes(body.priority)) {
      return NextResponse.json(
        { error: 'priority must be 1, 2, or 3' },
        { status: 400 }
      );
    }

    // Validate relationship if provided
    if (body.relationship) {
      const validRelationships = ['spouse', 'parent', 'child', 'sibling', 'friend', 'coworker', 'other'];
      if (!validRelationships.includes(body.relationship)) {
        return NextResponse.json(
          { error: `relationship must be one of: ${validRelationships.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const contact = await emergencyContactsService.updateEmergencyContact(params.id, body);

    return NextResponse.json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: contact
    });
  } catch (error: any) {
    logger.error(`Failed to update emergency contact ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update emergency contact', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await emergencyContactsService.deleteEmergencyContact(params.id);

    return NextResponse.json({
      success: true,
      message: 'Emergency contact deleted successfully'
    });
  } catch (error: any) {
    logger.error(`Failed to delete emergency contact ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete emergency contact', details: error.message },
      { status: 500 }
    );
  }
}
