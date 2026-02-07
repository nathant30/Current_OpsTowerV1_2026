/**
 * Analytics Export API Routes
 *
 * GET /api/analytics/export?format=csv&reportType=revenue&...
 * GET /api/analytics/export?format=pdf&reportType=financial&...
 *
 * @module api/analytics/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const reportType = searchParams.get('reportType');

    if (!reportType) {
      return NextResponse.json(
        { success: false, error: 'reportType is required' },
        { status: 400 }
      );
    }

    // Parse params
    const params: any = {};
    searchParams.forEach((value, key) => {
      if (key !== 'format' && key !== 'reportType') {
        params[key] = value;
      }
    });

    // Handle date parameters
    if (params.start) {
      params.startDate = new Date(params.start);
    }
    if (params.end) {
      params.endDate = new Date(params.end);
    }

    switch (format) {
      case 'csv': {
        const csvData = await analyticsService.exportToCSV(reportType, params);

        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `opstower-${reportType}-${timestamp}.csv`;

        // Return CSV file
        return new NextResponse(csvData, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      }

      case 'pdf': {
        try {
          const pdfBuffer = await analyticsService.exportToPDF(reportType, params);

          const timestamp = new Date().toISOString().split('T')[0];
          const filename = `opstower-${reportType}-${timestamp}.pdf`;

          return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'PDF export not yet implemented. Please use CSV format.',
            },
            { status: 501 }
          );
        }
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown export format: ${format}. Valid formats: csv, pdf`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Analytics export API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
