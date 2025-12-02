/**
 * SessionManager Service - Postgres Implementation
 * Manages user sessions with aggressive persistence and magic link support
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 16.1, 16.4, 16.5
 */

import { v4 as uuidv4 } from 'uuid';
import { sql } from '../db/postgres';
import type {
  Session,
  SessionState,
  Message,
  Specification,
} from '../models/types';

/**
 * SessionManager handles all session-related operations using Postgres
 */
export class SessionManager {
  /**
   * Create a new session
   * Generates a unique session ID and initializes empty state
   */
  async createSession(): Promise<Session> {
    const sessionId = uuidv4();
    const now = new Date();

    // Insert session record
    await sql`
      INSERT INTO sessions (id, created_at, last_accessed_at, status)
      VALUES (${sessionId}, ${now.toISOString()}, ${now.toISOString()}, 'active')
    `;

    // Create initial specification
    const specification: Specification = {
      id: sessionId,
      version: 0,
      plainEnglishSummary: {
        overview: '',
        keyFeatures: [],
        targetUsers: '',
        integrations: [],
      },
      formalPRD: {
        introduction: '',
        glossary: {},
        requirements: [],
        nonFunctionalRequirements: [],
      },
      lastUpdated: now,
    };

    const progress = {
      topics: [],
      overallCompleteness: 0,
      projectComplexity: 'Simple' as const,
    };

    // Insert initial specification
    await sql`
      INSERT INTO specifications (
        id, session_id, version, plain_english_summary, formal_prd, progress_state, created_at, updated_at
      ) VALUES (
        ${uuidv4()},
        ${sessionId},
        0,
        ${JSON.stringify(specification.plainEnglishSummary)},
        ${JSON.stringify(specification.formalPRD)},
        ${JSON.stringify(progress)},
        ${now.toISOString()},
        ${now.toISOString()}
      )
    `;

    return {
      id: sessionId,
      createdAt: now,
      lastAccessedAt: now,
      state: {
        conversationHistory: [],
        specification,
        progress,
      },
    };
  }

  /**
   * Get a session by ID
   * Reconstructs full session state from Postgres
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Get session metadata
    const sessionResult = await sql`
      SELECT id, created_at, last_accessed_at, magic_link_token, status
      FROM sessions
      WHERE id = ${sessionId}
    `;

    if (sessionResult.rows.length === 0) {
      return null;
    }

    const sessionRow = sessionResult.rows[0];

    // Get conversation history
    const messagesResult = await sql`
      SELECT id, role, content, timestamp, metadata
      FROM messages
      WHERE session_id = ${sessionId}
      ORDER BY timestamp ASC
    `;

    const conversationHistory: Message[] = messagesResult.rows.map((row) => ({
      id: row.id,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata || undefined,
    }));

    // Get latest specification
    const specResult = await sql`
      SELECT id, version, plain_english_summary, formal_prd, progress_state, updated_at
      FROM specifications
      WHERE session_id = ${sessionId}
      ORDER BY version DESC
      LIMIT 1
    `;

    let specification: Specification;
    let progress;

    if (specResult.rows.length > 0) {
      const specRow = specResult.rows[0];
      specification = {
        id: sessionId,
        version: specRow.version,
        plainEnglishSummary: specRow.plain_english_summary,
        formalPRD: specRow.formal_prd,
        lastUpdated: new Date(specRow.updated_at),
      };
      progress = specRow.progress_state;
    } else {
      // No specification yet, use default
      specification = {
        id: sessionId,
        version: 0,
        plainEnglishSummary: {
          overview: '',
          keyFeatures: [],
          targetUsers: '',
          integrations: [],
        },
        formalPRD: {
          introduction: '',
          glossary: {},
          requirements: [],
          nonFunctionalRequirements: [],
        },
        lastUpdated: new Date(sessionRow.created_at),
      };
      progress = {
        topics: [],
        overallCompleteness: 0,
        projectComplexity: 'Simple' as const,
      };
    }

    const sessionState: SessionState = {
      conversationHistory,
      specification,
      progress,
    };

    // Update last accessed time
    await this.updateLastAccessedTime(sessionId);

    return {
      id: sessionRow.id,
      createdAt: new Date(sessionRow.created_at),
      lastAccessedAt: new Date(sessionRow.last_accessed_at),
      state: sessionState,
      magicLinkToken: sessionRow.magic_link_token || undefined,
    };
  }

  /**
   * Save session state to Postgres
   * Implements aggressive persistence - saves after every message
   */
  async saveSessionState(
    sessionId: string,
    state: SessionState
  ): Promise<void> {
    const now = new Date();

    // Get existing messages to find new ones
    const existingMessagesResult = await sql`
      SELECT id FROM messages WHERE session_id = ${sessionId}
    `;

    const existingMessageIds = new Set(
      existingMessagesResult.rows.map((row) => row.id)
    );

    // Save new messages
    const newMessages = state.conversationHistory.filter(
      (msg) => !existingMessageIds.has(msg.id)
    );

    for (const message of newMessages) {
      await sql`
        INSERT INTO messages (id, session_id, role, content, timestamp, metadata)
        VALUES (
          ${message.id},
          ${sessionId},
          ${message.role},
          ${message.content},
          ${message.timestamp.toISOString()},
          ${message.metadata ? JSON.stringify(message.metadata) : null}
        )
      `;
    }

    // Get current specification version
    const currentSpecResult = await sql`
      SELECT version
      FROM specifications
      WHERE session_id = ${sessionId}
      ORDER BY version DESC
      LIMIT 1
    `;

    const currentVersion =
      currentSpecResult.rows.length > 0
        ? currentSpecResult.rows[0].version
        : -1;

    // Save specification if version changed
    if (state.specification.version !== currentVersion) {
      await sql`
        INSERT INTO specifications (
          id, session_id, version, plain_english_summary, formal_prd, progress_state, created_at, updated_at
        ) VALUES (
          ${uuidv4()},
          ${sessionId},
          ${state.specification.version},
          ${JSON.stringify(state.specification.plainEnglishSummary)},
          ${JSON.stringify(state.specification.formalPRD)},
          ${JSON.stringify(state.progress)},
          ${now.toISOString()},
          ${now.toISOString()}
        )
      `;
    }

    // Update last accessed time
    await this.updateLastAccessedTime(sessionId);
  }

  /**
   * Generate a magic link token for session restoration
   * Uses UUID v4 for cryptographically secure tokens
   */
  async generateMagicLink(sessionId: string): Promise<string> {
    const token = uuidv4();

    await sql`
      UPDATE sessions
      SET magic_link_token = ${token}
      WHERE id = ${sessionId}
    `;

    return token;
  }

  /**
   * Restore session from magic link token
   */
  async restoreSessionFromMagicLink(token: string): Promise<Session> {
    const result = await sql`
      SELECT id
      FROM sessions
      WHERE magic_link_token = ${token}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired magic link token');
    }

    const sessionId = result.rows[0].id;
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    return session;
  }

  /**
   * Abandon current session and mark it as abandoned
   * Session data is retained for potential future retrieval
   */
  async abandonSession(sessionId: string): Promise<void> {
    await sql`
      UPDATE sessions
      SET status = 'abandoned'
      WHERE id = ${sessionId}
    `;
  }

  /**
   * Update last accessed time for a session
   * Private helper method
   */
  private async updateLastAccessedTime(sessionId: string): Promise<void> {
    await sql`
      UPDATE sessions
      SET last_accessed_at = NOW()
      WHERE id = ${sessionId}
    `;
  }

  /**
   * Preserve error state in the database
   * Saves user input and session state before reporting error
   * Requirements: 13.1, 13.5
   */
  async preserveErrorState(
    sessionId: string,
    error: Error,
    userInput?: string,
    currentState?: SessionState
  ): Promise<void> {
    try {
      // Save error record
      await sql`
        INSERT INTO errors (session_id, error_message, error_stack, user_input, timestamp)
        VALUES (
          ${sessionId},
          ${error.message},
          ${error.stack || null},
          ${userInput || null},
          NOW()
        )
      `;

      // If we have current state, save it
      if (currentState) {
        await this.saveSessionState(sessionId, currentState);
      }
    } catch (preserveError) {
      // Log but don't throw - we don't want error preservation to fail the original operation
      console.error('Failed to preserve error state:', preserveError);
    }
  }

  /**
   * Reconstruct conversation context after an error
   * Retrieves the last known good state from the database
   * Requirements: 13.2
   */
  async reconstructContextAfterError(sessionId: string): Promise<SessionState | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      // Return the reconstructed state
      return session.state;
    } catch (error) {
      console.error('Failed to reconstruct context:', error);
      return null;
    }
  }

  /**
   * Get queued offline messages from browser storage
   * This is a helper method that works with browser localStorage
   * Requirements: 13.3
   */
  static getOfflineMessages(sessionId: string): Message[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const key = `offline_messages_${sessionId}`;
      const stored = localStorage.getItem(key);
      if (!stored) {
        return [];
      }

      const messages = JSON.parse(stored);
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (error) {
      console.error('Failed to get offline messages:', error);
      return [];
    }
  }

  /**
   * Queue a message for offline storage
   * Stores message in browser localStorage when offline
   * Requirements: 13.3
   */
  static queueOfflineMessage(sessionId: string, message: Message): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const key = `offline_messages_${sessionId}`;
      const existing = SessionManager.getOfflineMessages(sessionId);
      existing.push(message);

      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to queue offline message:', error);
    }
  }

  /**
   * Clear offline messages after successful sync
   * Requirements: 13.3
   */
  static clearOfflineMessages(sessionId: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const key = `offline_messages_${sessionId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear offline messages:', error);
    }
  }

  /**
   * Sync offline messages to the server
   * Sends queued messages when connectivity is restored
   * Requirements: 13.3
   */
  async syncOfflineMessages(sessionId: string): Promise<void> {
    const offlineMessages = SessionManager.getOfflineMessages(sessionId);

    if (offlineMessages.length === 0) {
      return;
    }

    try {
      // Get current session state
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Add offline messages to conversation history
      const updatedState: SessionState = {
        ...session.state,
        conversationHistory: [
          ...session.state.conversationHistory,
          ...offlineMessages,
        ],
      };

      // Save updated state
      await this.saveSessionState(sessionId, updatedState);

      // Clear offline messages after successful sync
      SessionManager.clearOfflineMessages(sessionId);
    } catch (error) {
      console.error('Failed to sync offline messages:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
