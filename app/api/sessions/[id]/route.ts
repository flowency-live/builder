/**
 * GET /api/sessions/[id] - Retrieve session by ID
 * Requirements: 6.2, 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/lib/services/session-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Get session from database
    const session = await sessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
        },
        { status: 404 }
      );
    }

    // Return session data
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        createdAt: session.createdAt,
        lastAccessedAt: session.lastAccessedAt,
        state: {
          conversationHistory: session.state.conversationHistory,
          specification: session.state.specification,
          completeness: session.state.completeness,
          lockedSections: session.state.lockedSections,
          userInfo: session.state.userInfo,
        },
      },
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve session',
      },
      { status: 500 }
    );
  }
}
