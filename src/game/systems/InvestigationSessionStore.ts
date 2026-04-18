import type { CaseFile, InvestigationState } from '../../domain/types';

const sessions = new Map<string, InvestigationState>();

function makeInitialTimeline(caseFile: CaseFile): Record<string, Record<string, string>> {
  const selections: Record<string, Record<string, string>> = {};
  caseFile.suspects.forEach((suspect) => {
    selections[suspect.id] = {};
  });
  return selections;
}

export function startCaseSession(caseFile: CaseFile): InvestigationState {
  const state: InvestigationState = {
    caseId: caseFile.id,
    startedAt: Date.now(),
    discoveredHotspots: new Set(),
    discoveredClues: new Set(),
    unlockedConversations: new Set(),
    selectedKeyEvidence: new Set(),
    methodTheory: '',
    timelineSelections: makeInitialTimeline(caseFile)
  };

  sessions.set(caseFile.id, state);
  return state;
}

export function getCaseSession(caseFile: CaseFile): InvestigationState {
  const existing = sessions.get(caseFile.id);
  if (existing) return existing;
  return startCaseSession(caseFile);
}

export function clearCaseSession(caseId: string): void {
  sessions.delete(caseId);
}
