import { CASES } from '../../data/cases';
import type { CaseProgress, SaveData } from '../../domain/types';

const SAVE_KEY = 'detective-mini-save-v1';

function defaultProgressForCase(unlocked: boolean): CaseProgress {
  return {
    completed: false,
    highestScore: 0,
    fastestSeconds: null,
    unlocked
  };
}

function makeDefaultSave(): SaveData {
  const caseProgress: Record<string, CaseProgress> = {};
  CASES.forEach((caseFile, index) => {
    caseProgress[caseFile.id] = defaultProgressForCase(index === 0);
  });

  return {
    version: 1,
    caseProgress,
    settings: {
      soundEnabled: true
    }
  };
}

export function readSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return makeDefaultSave();
    }

    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = makeDefaultSave();

    const mergedProgress: Record<string, CaseProgress> = {};
    CASES.forEach((caseFile, index) => {
      const fallback = defaults.caseProgress[caseFile.id] ?? defaultProgressForCase(index === 0);
      const source = parsed.caseProgress?.[caseFile.id];

      mergedProgress[caseFile.id] = {
        completed: Boolean(source?.completed),
        highestScore:
          typeof source?.highestScore === 'number' && Number.isFinite(source.highestScore)
            ? Math.max(0, Math.floor(source.highestScore))
            : fallback.highestScore,
        fastestSeconds:
          typeof source?.fastestSeconds === 'number' && Number.isFinite(source.fastestSeconds)
            ? Math.max(0, Math.floor(source.fastestSeconds))
            : fallback.fastestSeconds,
        unlocked: typeof source?.unlocked === 'boolean' ? source.unlocked : fallback.unlocked
      };
    });

    return {
      version: 1,
      caseProgress: mergedProgress,
      settings: {
        soundEnabled:
          typeof parsed.settings?.soundEnabled === 'boolean'
            ? parsed.settings.soundEnabled
            : defaults.settings.soundEnabled
      }
    };
  } catch {
    return makeDefaultSave();
  }
}

export function writeSaveData(saveData: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch {
    // ignore localStorage write failures
  }
}

export function updateCaseCompletion(caseId: string, score: number, elapsedSeconds: number): SaveData {
  const saveData = readSaveData();
  const caseIndex = CASES.findIndex((item) => item.id === caseId);

  if (caseIndex === -1) {
    return saveData;
  }

  const existing = saveData.caseProgress[caseId] ?? defaultProgressForCase(caseIndex === 0);
  saveData.caseProgress[caseId] = {
    completed: true,
    highestScore: Math.max(existing.highestScore, score),
    fastestSeconds:
      existing.fastestSeconds === null ? elapsedSeconds : Math.min(existing.fastestSeconds, elapsedSeconds),
    unlocked: true
  };

  const nextCase = CASES[caseIndex + 1];
  if (nextCase) {
    const current = saveData.caseProgress[nextCase.id] ?? defaultProgressForCase(false);
    saveData.caseProgress[nextCase.id] = {
      ...current,
      unlocked: true
    };
  }

  writeSaveData(saveData);
  return saveData;
}
