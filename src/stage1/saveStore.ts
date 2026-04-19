import {
  SCREENS,
  type ConfrontationState,
  type InventoryClue,
  type InventoryTestimony,
  type ResultState,
  type Screen,
  type StageSaveData,
  type SubmissionState,
  type TimelineState,
} from './types';

const SAVE_KEY = 'detective-mini.stage1.save';

function isScreen(value: string): value is Screen {
  return (SCREENS as readonly string[]).includes(value);
}

function isConfrontation(value: unknown): value is ConfrontationState {
  if (!value || typeof value !== 'object') return false;
  const parsed = value as Partial<ConfrontationState>;
  return typeof parsed.roundIndex === 'number' && typeof parsed.mistakes === 'number' && typeof parsed.lastFeedback === 'string';
}

function isTimeline(value: unknown): value is TimelineState {
  if (!value || typeof value !== 'object') return false;
  const parsed = value as Partial<TimelineState>;
  return typeof parsed.completed === 'boolean' && typeof parsed.placements === 'object' && Array.isArray(parsed.conflicts);
}

function isSubmission(value: unknown): value is SubmissionState {
  if (!value || typeof value !== 'object') return false;
  const parsed = value as Partial<SubmissionState>;
  return typeof parsed.suspect === 'string' && typeof parsed.keyLie === 'string' && typeof parsed.method === 'string' && typeof parsed.destination === 'string';
}

function isResult(value: unknown): value is ResultState | null {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  const parsed = value as Partial<ResultState>;
  return typeof parsed.score === 'number' && typeof parsed.clueRate === 'number' && typeof parsed.submissionCorrect === 'boolean';
}

export function loadStageSave(): StageSaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const p = JSON.parse(raw) as Partial<StageSaveData>;
    if (!p.caseId || typeof p.caseId !== 'string') return null;
    if (!p.screen || typeof p.screen !== 'string' || !isScreen(p.screen)) return null;
    if (!p.timestamp || typeof p.timestamp !== 'number') return null;
    if (p.overlay !== null && typeof p.overlay !== 'string') return null;
    if (!p.objective || typeof p.objective !== 'string') return null;
    if (!p.currentSceneId || typeof p.currentSceneId !== 'string') return null;
    if (!p.flags || typeof p.flags !== 'object') return null;
    if (!Array.isArray(p.inventory as InventoryClue[])) return null;
    if (!Array.isArray(p.testimonies as InventoryTestimony[])) return null;
    if (!Array.isArray(p.visitedDialogueNodes)) return null;
    if (!isConfrontation(p.confrontation)) return null;
    if (!isTimeline(p.timeline)) return null;
    if (!isSubmission(p.submission)) return null;
    if (!isResult(p.result)) return null;
    if (typeof p.hintCount !== 'number' || typeof p.wrongSubmissionCount !== 'number' || typeof p.lastDiscoveryAt !== 'number') return null;
    return p as StageSaveData;
  } catch {
    return null;
  }
}

export function saveStageState(input: StageSaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(input));
}
