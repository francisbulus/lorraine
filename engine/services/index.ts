// Engine Services — entry point.
// LLM-powered adapters that sit between the engine core and applications.
// These generate and interpret the human-facing interactions that produce
// verification events for the core.

export type {
  DifficultyAxis,
  VerificationReason,
  ApplicationContext,
  VerificationType,
  GenerateVerificationInput,
  GenerateVerificationResult,
  InterpretResponseInput,
  TrustUpdate,
  InterpretResponseResult,
  ImplicitSignalType,
  ExtractImplicitSignalsInput,
  ImplicitSignal,
  SelfVerificationReason,
  RequestSelfVerificationInput,
} from './types.js';

export { generateVerification } from './generateVerification.js';
export { interpretResponse } from './interpretResponse.js';
export { extractImplicitSignals } from './extractImplicitSignals.js';
export { requestSelfVerification } from './requestSelfVerification.js';
