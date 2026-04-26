import type { CaseDefinition } from './types';
import { case001 } from './case-001';

const case002: CaseDefinition = {
  meta: {
    id: 'case-002',
    title: '待解密案件',
    difficulty: 'normal',
    tutorialMode: false,
    order: 2,
    unlocked: false,
  },
};

export const CASE_REGISTRY: CaseDefinition[] = [case001, case002];

export function getCaseById(caseId: string): CaseDefinition {
  const found = CASE_REGISTRY.find((c) => c.meta.id === caseId);
  if (!found) throw new Error(`Unknown caseId: ${caseId}`);
  return found;
}
