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
export const SAVE_VERSION = 2 as const;

function isScreen(value: string): value is Screen {
  return (SCREENS as readonly string[]).includes(value);
}

function isConfrontation(value: unknown): value is ConfrontationState {
  if (!value || typeof value !== 'object') return false;
  const parsed = value as Partial<ConfrontationState>;
  const validStatus = parsed.status === 'idle' || parsed.status === 'ongoing' || parsed.status === 'success' || parsed.status === 'allLost';
  const validSelectedSentenceId = parsed.selectedSentenceId === null || typeof parsed.selectedSentenceId === 'string';
  const validRoundResults = Array.isArray(parsed.roundResults) && parsed.roundResults.every((r) => r === 'pending' || r === 'won' || r === 'lost');
  return typeof parsed.roundIndex === 'number' && typeof parsed.mistakesInCurrentRound === 'number' && validRoundResults && validSelectedSentenceId && validStatus && typeof parsed.lastFeedback === 'string';
}

function isTimeline(value: unknown): value is TimelineState {
  if (!value || typeof value !== 'object') return false;
  const parsed = value as Partial<TimelineState>;
  const validSelectedClueId = parsed.selectedClueId === null || typeof parsed.selectedClueId === 'string';
  return typeof parsed.completed === 'boolean' && typeof parsed.placements === 'object' && Array.isArray(parsed.conflicts) && validSelectedClueId;
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
    // 当前策略：版本不匹配直接丢弃，不做迁移。未来有线上玩家时再引入 migrator。
    if (typeof p.saveVersion !== 'number' || p.saveVersion !== SAVE_VERSION) {
      console.info('[saveStore] save version mismatch, discarding old save');
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
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

export function saveStageState(input: Omit<StageSaveData, 'saveVersion'>): void {
  const payload = { ...input, saveVersion: SAVE_VERSION };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}
