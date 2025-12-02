/**
 * POST /api/sessions - Create a new session
 * Requirements: 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';

export async function POST(request: NextRequest) {
  try {
    // Debug: Check if credentials are available
    console.log('Credentials check:', {
      FBUILDER_AWS_ACCESS_KEY_ID: process.env.FBUILDER_AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
      FBUILDER_AWS_SECRET_ACCESS_KEY: process.env.FBUILDER_AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
      DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME,
      REGION: process.env.REGION,
    });

    // Create new session
    const session = await sessionManager.createSession();

    return NextResponse.json(
      {
        success: true,
        session: {
          id: session.id,
          createdAt: session.createdAt.toISOString(),
          lastAccessedAt: session.lastAccessedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create session',
      },
      { status: 500 }
    );
  }
}
