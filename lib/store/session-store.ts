/**
 * Client-Side State Management with Zustand
 * Manages conversation history, specification, and progress state
 * Implements browser LocalStorage persistence and automatic server sync
 * 
 * Requirements: 3.1, 6.1, 6.2
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Message,
  Specification,
  CompletenessState,
  SessionState,
} from '../models/types';

/**
 * Session store state interface
 */
interface SessionStore {
  // State
  sessionId: string | null;
  conversationHistory: Message[];
  specification: Specification | null;
  completeness: CompletenessState | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;

  // Actions
  setSessionId: (sessionId: string) => void;
  addMessage: (message: Message) => void;
  updateSpecification: (specification: Specification) => void;
  updateCompleteness: (completeness: CompletenessState) => void;
  setLoading: (isLoading: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncedAt: (date: Date) => void;
  clearSession: () => void;
  restoreSession: (state: SessionState, sessionId: string) => void;
  
  // Computed
  getMessageCount: () => number;
  getLatestMessage: () => Message | null;
}

/**
 * Initial state for a new session
 */
const initialState = {
  sessionId: null,
  conversationHistory: [],
  specification: null,
  completeness: null,
  isLoading: false,
  isSyncing: false,
  lastSyncedAt: null,
};

/**
 * Zustand store with localStorage persistence
 * Automatically syncs state to browser storage
 */
export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Set the current session ID
      setSessionId: (sessionId: string) => {
        set({ sessionId });
      },

      // Add a new message to conversation history
      addMessage: (message: Message) => {
        set((state) => ({
          conversationHistory: [...state.conversationHistory, message],
        }));
      },

      // Update the specification
      updateSpecification: (specification: Specification) => {
        set({ specification });
      },

      // Update completeness state
      updateCompleteness: (completeness: CompletenessState) => {
        set({ completeness });
      },

      // Set loading state
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      // Set syncing state
      setSyncing: (isSyncing: boolean) => {
        set({ isSyncing });
      },

      // Set last synced timestamp
      setLastSyncedAt: (date: Date) => {
        set({ lastSyncedAt: date });
      },

      // Clear all session data
      clearSession: () => {
        set(initialState);
      },

      // Restore session from server data
      restoreSession: (state: SessionState, sessionId: string) => {
        set({
          sessionId,
          conversationHistory: state.conversationHistory,
          specification: state.specification,
          completeness: state.completeness,
          lastSyncedAt: new Date(),
        });
      },

      // Get total message count
      getMessageCount: () => {
        return get().conversationHistory.length;
      },

      // Get the most recent message
      getLatestMessage: () => {
        const messages = get().conversationHistory;
        return messages.length > 0 ? messages[messages.length - 1] : null;
      },
    }),
    {
      name: 'spec-wizard-session', // localStorage key
      storage: createJSONStorage(() => localStorage),

      // TODO: Custom Date serialization needs to be implemented with zustand v4+ storage API
      // For now using default JSON serialization (Dates will be stored as ISO strings)
      
      // Partial persistence - only persist essential data
      partialize: (state) => ({
        sessionId: state.sessionId,
        conversationHistory: state.conversationHistory,
        specification: state.specification,
        completeness: state.completeness,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
