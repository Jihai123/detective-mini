export type CaseDifficulty = 'tutorial' | 'normal' | 'hard';

export type Suspect = {
  id: string;
  name: string;
  role: string;
  profile: string;
  motive: string;
};

export type ClueType = 'testimony' | 'physical' | 'digital' | 'timeline';
export type ClueUnlockMode = 'initial' | 'extra';
export type ClueImportance = 'low' | 'medium' | 'high';

export type Clue = {
  id: string;
  type: ClueType;
  title: string;
  content: string;
  relatedSuspectIds: string[];
  unlockMode: ClueUnlockMode;
  importance: ClueImportance;
};

export type TimelineSlot = {
  id: string;
  label: string;
  options: string[];
};

export type SingleQuestion = {
  id: string;
  prompt: string;
  type: 'single';
  options: Array<{ label: string; value: string }>;
};

export type TextQuestion = {
  id: string;
  prompt: string;
  type: 'text';
  acceptableAnswers: string[];
};

export type CaseQuestion = SingleQuestion | TextQuestion;

export type HintTier = {
  level: number;
  text: string;
};

export type CaseSolution = {
  culpritId: string;
  keyLieClueId: string;
  methodAnswer: string;
  methodKeywords: string[];
  reasoning: string[];
};

export type CaseFile = {
  id: string;
  title: string;
  difficulty: CaseDifficulty;
  intro: string;
  objective: string;
  suspects: Suspect[];
  clues: Clue[];
  timelineSlots: TimelineSlot[];
  extraClueBudget: number;
  questions: CaseQuestion[];
  solution: CaseSolution;
  hints: HintTier[];
};

export type PlayerAnswers = {
  culpritId?: string;
  keyLieClueId?: string;
  methodAnswer?: string;
};

export type CaseResult = {
  totalScore: number;
  rating: 'S' | 'A' | 'B' | 'C' | 'D';
  breakdown: {
    culprit: number;
    lie: number;
    method: number;
    timeBonus: number;
    hintBonus: number;
    extraClueBonus: number;
  };
  isPerfect: boolean;
  correct: {
    culprit: boolean;
    lie: boolean;
    method: boolean;
  };
};
