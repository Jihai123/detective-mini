import type { CaseFile } from '../../domain/types';
import { tutorialCase } from './tutorial';

export const CASES: CaseFile[] = [tutorialCase];

export function getCaseById(caseId: string): CaseFile | undefined {
  return CASES.find((item) => item.id === caseId);
}
