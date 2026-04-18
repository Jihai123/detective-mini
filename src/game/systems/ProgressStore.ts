import { CASES } from '../../data/cases';
import type { CaseProgress, SaveData } from '../../domain/types';

const SAVE_KEY = 'detective-mini-save-v2';

function defaultProgressForCase(unlocked: boolean): CaseProgress {
  return {
    completed: false,
    highestScore: 0,
    fastestSeconds: null,
    unlocked,
    highestRating: null,
    completionCount: 0
  };
}

function makeDefaultSave(): SaveData {
  const caseProgress: Record<string, CaseProgress> = {};
  CASES.forEach((caseFile, index) => {
    caseProgress[caseFile.id] = defaultProgressForCase(index === 0);
  });

  return {
    version: 2,
    caseProgress,
    settings: { soundEnabled: true }
  };
}

export function readSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return makeDefaultSave();

    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = makeDefaultSave();
    const mergedProgress: Record<string, CaseProgress> = {};

    CASES.forEach((caseFile, index) => {
      const fallback = defaults.caseProgress[caseFile.id] ?? defaultProgressForCase(index === 0);
      const source = parsed.caseProgress?.[caseFile.id];
      mergedProgress[caseFile.id] = {
        completed: Boolean(source?.completed),
        highestScore: typeof source?.highestScore === 'number' ? Math.max(0, Math.floor(source.highestScore)) : fallback.highestScore,
        fastestSeconds:
          typeof source?.fastestSeconds === 'number' ? Math.max(0, Math.floor(source.fastestSeconds)) : fallback.fastestSeconds,
        unlocked: typeof source?.unlocked === 'boolean' ? source.unlocked : fallback.unlocked,
        highestRating: source?.highestRating ?? fallback.highestRating,
        completionCount: typeof source?.completionCount === 'number' ? Math.max(0, Math.floor(source.completionCount)) : fallback.completionCount
      };
    });

    return {
      version: 2,
      caseProgress: mergedProgress,
      settings: { soundEnabled: parsed.settings?.soundEnabled ?? defaults.settings.soundEnabled }
    };
  } catch {
    return makeDefaultSave();
  }
}

export function writeSaveData(saveData: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch {
    // ignore write errors
  }
}

const ratingRank = { S: 5, A: 4, B: 3, C: 2, D: 1 } as const;

export function updateCaseCompletion(caseId: string, score: number, elapsedSeconds: number, rating: 'S' | 'A' | 'B' | 'C' | 'D'): SaveData {
  const saveData = readSaveData();
  const caseIndex = CASES.findIndex((item) => item.id === caseId);
  if (caseIndex === -1) return saveData;

  const existing = saveData.caseProgress[caseId] ?? defaultProgressForCase(caseIndex === 0);
  const prevRating = existing.highestRating;

  saveData.caseProgress[caseId] = {
    completed: true,
    highestScore: Math.max(existing.highestScore, score),
    fastestSeconds: existing.fastestSeconds === null ? elapsedSeconds : Math.min(existing.fastestSeconds, elapsedSeconds),
    unlocked: true,
    highestRating:
      prevRating === null || ratingRank[rating] > ratingRank[prevRating]
        ? rating
        : prevRating,
    completionCount: existing.completionCount + 1
  };

  const nextCase = CASES[caseIndex + 1];
  if (nextCase) {
    saveData.caseProgress[nextCase.id] = {
      ...(saveData.caseProgress[nextCase.id] ?? defaultProgressForCase(false)),
      unlocked: true
    };
  }

  writeSaveData(saveData);
  return saveData;
}
