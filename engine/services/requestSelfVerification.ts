// requestSelfVerification — the person initiates verification.
// Routes through generateVerification with appropriate framing.
// Two-way verification: the person has private information the system doesn't.

import type { LLMProvider } from '../../llm/types.js';
import type { Store } from '../store/interface.js';
import type { GenerateVerificationResult, RequestSelfVerificationInput } from './types.js';
import { generateVerification } from './generateVerification.js';

const REASON_TO_VERIFICATION_REASON = {
  person_uncertain: 'person_requested',
  person_claims_knowledge: 'person_requested',
  person_challenges_model: 'person_requested',
} as const;

export async function requestSelfVerification(
  store: Store,
  llm: LLMProvider,
  input: RequestSelfVerificationInput,
  applicationContext: 'learning' | 'hiring' | 'certification' | 'onboarding' = 'learning'
): Promise<GenerateVerificationResult> {
  return generateVerification(store, llm, {
    personId: input.personId,
    conceptId: input.conceptId,
    reason: REASON_TO_VERIFICATION_REASON[input.reason],
    applicationContext,
  });
}
