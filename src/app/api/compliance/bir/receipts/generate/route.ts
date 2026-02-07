/**
 * BIR Receipt Generation API
 * POST /api/compliance/bir/receipts/generate - Generate Official Receipt
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBIRTaxService } from '@/lib/compliance/bir';

export async function POST(request: NextRequest) {
  try {
    const receiptData = await request.json();

    if (!receiptData.customerName || !receiptData.grossAmount || !receiptData.description) {
      return NextResponse.json(
        {
          success: false,
          error: 'customerName, grossAmount, and description are required',
        },
        { status: 400 }
      );
    }

    const service = getBIRTaxService();
    const result = await service.generateOfficialReceipt(receiptData);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating receipt:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate receipt',
      },
      { status: 500 }
    );
  }
}
