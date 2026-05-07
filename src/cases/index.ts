import type { CaseDefinition } from './types';
import { case001 } from './case-001';
import { case002Definition } from './case-002';

export const CASE_REGISTRY: CaseDefinition[] = [case001, case002Definition];

export function getCaseById(caseId: string): CaseDefinition {
  const found = CASE_REGISTRY.find((c) => c.meta.id === caseId);
  if (!found) throw new Error(`Unknown caseId: ${caseId}`);
  return found;
}
