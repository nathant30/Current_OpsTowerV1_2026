/**
 * User Registration API
 *
 * Handles new user registration with DPA consent recording
 * Implements Philippine Data Privacy Act (DPA) compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getDPAConsentService } from '@/lib/compliance/dpa/consent-management';
import { logger } from '@/lib/security/productionLogger';
import bcrypt from 'bcryptjs';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: 'passenger' | 'driver' | 'operator';
  acceptedTerms: boolean;
  acceptedPrivacyPolicy: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format',
          code: 'INVALID_EMAIL',
        },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 8 characters)
    if (body.password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must be at least 8 characters',
          code: 'WEAK_PASSWORD',
        },
        { status: 400 }
      );
    }

    // Validate consent acceptance
    if (!body.acceptedTerms || !body.acceptedPrivacyPolicy) {
      return NextResponse.json(
        {
          success: false,
          error: 'You must accept the terms of service and privacy policy',
          code: 'CONSENT_REQUIRED',
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [body.email.toLowerCase()]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User with this email already exists',
          code: 'DUPLICATE_EMAIL',
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // Create user
    const userResult = await query(
      `INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        user_type,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
      RETURNING id, email, first_name, last_name, user_type, created_at`,
      [
        body.email.toLowerCase(),
        hashedPassword,
        body.firstName,
        body.lastName,
        body.phone || null,
        body.userType || 'passenger',
      ]
    );

    const newUser = userResult.rows[0];

    // Get IP address from request headers
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Record DPA consents
    const consentService = getDPAConsentService();

    // Record Terms of Service consent
    await consentService.recordConsent({
      userId: newUser.id,
      userType: body.userType || 'passenger',
      consentType: 'terms_of_service',
      consentGiven: true,
      consentVersion: '1.0.0',
      purpose: 'Accept terms of service and platform usage agreement',
      consentMethod: 'explicit',
      sourcePage: '/register',
      sourceAction: 'registration_form_submit',
      ipAddress,
      userAgent,
    });

    // Record Privacy Policy consent
    await consentService.recordConsent({
      userId: newUser.id,
      userType: body.userType || 'passenger',
      consentType: 'privacy_policy',
      consentGiven: true,
      consentVersion: '1.0.0',
      purpose: 'Data processing consent and privacy policy acceptance',
      consentMethod: 'explicit',
      sourcePage: '/register',
      sourceAction: 'registration_form_submit',
      ipAddress,
      userAgent,
    });

    // Log successful registration
    logger.info('User registered successfully', {
      userId: newUser.id,
      email: newUser.email,
      userType: newUser.user_type,
      ipAddress,
    });

    // Return user data (excluding sensitive information)
    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            userType: newUser.user_type,
            createdAt: newUser.created_at,
          },
        },
        message: 'Registration successful',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Registration error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Registration failed. Please try again.',
        code: 'REGISTRATION_FAILED',
      },
      { status: 500 }
    );
  }
}
