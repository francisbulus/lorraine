// Engine Services — types.
// These types are specific to the LLM-powered services layer.
// They do not belong in the engine core.

import type { Modality, TrustState } from '../types.js';

// --- generateVerification ---

export type DifficultyAxis = 'recall' | 'inference' | 'transfer' | 'discrimination';

export type VerificationReason =
  | 'scheduled'
  | 'person_requested'
  | 'contested_resolution'
  | 'probing'
  | 'external_requirement';

export type ApplicationContext = 'learning' | 'hiring' | 'certification' | 'onboarding';

export type VerificationType =
  | 'grill_question'
  | 'sandbox_prompt'
  | 'write_prompt'
  | 'sketch_prompt'
  | 'conversational_probe';

export interface GenerateVerificationInput {
  personId: string;
  conceptId?: string;
  targetModality?: Modality;
  difficultyAxis?: DifficultyAxis;
  reason: VerificationReason;
  applicationContext: ApplicationContext;
}

export interface GenerateVerificationResult {
  type: VerificationType;
  content: string;
  expectedSignals: string[];
  conceptsTested: string[];
}

// --- interpretResponse ---

export interface InterpretResponseInput {
  verificationId: string;
  personId: string;
  response: string;
  responseModality: Modality;
}

export interface TrustUpdate {
  conceptId: string;
  result: 'demonstrated' | 'failed' | 'partial';
  previousState: TrustState | null;
  newState: TrustState;
  evidence: string;
}

export interface InterpretResponseResult {
  trustUpdates: TrustUpdate[];
  contestedDetected: boolean;
  implicitSignals: ImplicitSignal[];
}

// --- extractImplicitSignals ---

export type ImplicitSignalType =
  | 'correct_usage'
  | 'incorrect_usage'
  | 'question_revealing_gap'
  | 'self_correction'
  | 'sophistication_increase'
  | 'confusion_signal'
  | 'natural_connection_made';

export interface ExtractImplicitSignalsInput {
  utterance: string;
  conversationHistory: string[];
  personId: string;
  currentTrustState: Record<string, TrustState>;
}

export interface ImplicitSignal {
  conceptId: string;
  signalType: ImplicitSignalType;
  confidence: number;
  evidence: string;
}

// --- requestSelfVerification ---

export type SelfVerificationReason =
  | 'person_uncertain'
  | 'person_claims_knowledge'
  | 'person_challenges_model';

export interface RequestSelfVerificationInput {
  personId: string;
  conceptId?: string;
  reason: SelfVerificationReason;
}
