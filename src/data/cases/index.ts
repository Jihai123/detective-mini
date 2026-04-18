import type { CaseFile } from '../../domain/types';
import { tutorialCase } from './tutorial';
import { case001 } from './case-001';

export const CASES: CaseFile[] = [tutorialCase, case001];

export function getCaseById(caseId: string): CaseFile | undefined {
  return CASES.find((item) => item.id === caseId);
}
