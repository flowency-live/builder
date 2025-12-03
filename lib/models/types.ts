/**
 * Core Data Models for Specification Wizard
 * TypeScript interfaces for Session, Specification, Message, and Submission
 */

/**
 * Default sections that must be completed for a build-ready spec
 * IMPORTANT: This is the single source of truth - use this constant everywhere
 */
export const DEFAULT_MISSING_SECTIONS = [
  'overview',
  'targetUsers',
  'keyFeatures',
  'flows',
  'rulesAndConstraints',
  'nonFunctional',
  'mvpDefinition'
] as const;

/**
 * Message in a conversation
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO string
  metadata?: {
    specUpdated?: boolean;
    progressUpdated?: boolean;
  };
}

/**
 * Plain English Summary - user-facing specification view
 * v0.3: Spec-first architecture with flows, rules, and MVP definition
 */
export interface PlainEnglishSummary {
  overview: string;
  targetUsers: string;
  keyFeatures: string[];
  flows: string[];
  rulesAndConstraints: string[];
  nonFunctional: string[];
  mvpDefinition: {
    included: string[];
    excluded: string[];
  };
}

/**
 * Requirement in formal PRD
 */
export interface Requirement {
  id: string;
  userStory: string;
  acceptanceCriteria: string[];
  priority: 'must-have' | 'nice-to-have';
}

/**
 * Non-Functional Requirement
 */
export interface NFR {
  id: string;
  category: string;
  description: string;
}

/**
 * Formal Product Requirements Document (EARS-formatted)
 */
export interface FormalPRD {
  introduction: string;
  glossary: Record<string, string>;
  requirements: Requirement[];
  nonFunctionalRequirements: NFR[];
}

/**
 * Specification with both formal and plain English versions
 */
export interface Specification {
  id: string;
  version: number;
  plainEnglishSummary: PlainEnglishSummary;
  formalPRD: FormalPRD;
  lastUpdated: string; // ISO string
}

/**
 * Topic in progress tracking
 */
export interface Topic {
  id: string;
  name: string;
  status: 'not-started' | 'in-progress' | 'complete';
  required: boolean;
}

/**
 * Progress state for specification completion
 */
export interface ProgressState {
  topics: Topic[];
  overallCompleteness: number; // 0-100
  projectComplexity: 'Simple' | 'Medium' | 'Complex';
}

/**
 * Contact information for submission
 */
export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  budgetRange?: string;
  timeline?: string;
  referralSource?: string;
  urgency?: string;
}

/**
 * Locked PRD section - tracks what's been decided and can't be re-litigated
 */
export interface LockedSection {
  name: string; // e.g., "Problem Statement", "Target Users", "Scope"
  summary: string; // Bullet-point summary of what was locked in
  lockedAt: string; // ISO string
}

/**
 * Completeness tracking for specification readiness
 */
export interface CompletenessState {
  missingSections: string[];
  readyForHandoff: boolean;
  lastEvaluated: string; // ISO string
}

/**
 * Session state containing all conversation and specification data
 * v0.3: Removed ProgressState, completeness is now required
 */
export interface SessionState {
  conversationHistory: Message[];
  specification: Specification;
  userInfo?: ContactInfo;
  lockedSections?: LockedSection[];
  completeness: CompletenessState; // Required in v0.3
}

/**
 * Session with metadata
 */
export interface Session {
  id: string;
  createdAt: string; // ISO string
  lastAccessedAt: string; // ISO string
  state: SessionState;
  magicLinkToken?: string;
}

/**
 * Submission package for quotation
 */
export interface Submission {
  id: string;
  sessionId: string;
  contactInfo: ContactInfo;
  specificationVersion: number;
  submittedAt: string; // ISO string
  status: 'pending' | 'reviewed' | 'quoted';
  referenceNumber: string;
}
