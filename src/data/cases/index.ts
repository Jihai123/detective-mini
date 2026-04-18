import type { CaseFile } from '../../domain/types';
import { case001 } from './case-001';
import { tutorialCase } from './tutorial';

export const CASES: CaseFile[] = [tutorialCase, case001];

export function getCaseById(caseId: string): CaseFile | undefined {
  return CASES.find((item) => item.id === caseId);
}
