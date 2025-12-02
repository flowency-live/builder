/**
 * POST /api/sessions - Create a new session
 * Requirements: 6.2
 *
 * This endpoint proxies to the Lambda function via API Gateway
 * Amplify SSR → API Gateway → Lambda → DynamoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { lambdaClient } from '@/lib/api/lambda-client';

export async function POST(request: NextRequest) {
  try {
    // Call Lambda function via API Gateway
    const result = await lambdaClient.createSession();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to create session',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
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
