import type { CaseFile } from './types';

export function validateCaseFile(caseFile: CaseFile): string[] {
  const errors: string[] = [];

  if (!caseFile.id.trim()) {
    errors.push('case.id 不能为空');
  }

  if (caseFile.suspects.length === 0) {
    errors.push(`${caseFile.id}: suspects 不能为空`);
  }

  if (caseFile.clues.length === 0) {
    errors.push(`${caseFile.id}: clues 不能为空`);
  }

  const questionIds = new Set(caseFile.questions.map((q) => q.id));
  if (!questionIds.has('q1') || !questionIds.has('q2') || !questionIds.has('q3')) {
    errors.push(`${caseFile.id}: questions 必须包含 q1/q2/q3`);
  }

  return errors;
}
