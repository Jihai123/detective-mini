export type CaseDifficulty = 'tutorial' | 'normal' | 'hard';

export type ArchiveMeta = {
  type: string;
  location: string;
  incidentWindow: string;
  threatLevel: 'low' | 'medium' | 'high';
};

export type BriefingSection = {
  headline: string;
  body: string;
};

export type Briefing = {
  intro: string;
  objective: string;
  sections: BriefingSection[];
};

export type Suspect = {
  id: string;
  name: string;
  role: string;
  identity: string;
  relationToCase: string;
  nightAction: string;
  suspiciousPoint: string;
  motive: string;
  relations: string[];
};

export type ConversationSnippet = {
  id: string;
  suspectId: string;
  title: string;
  lines: string[];
  unlockedBy: string;
};

export type EvidenceCategory = 'testimony' | 'physical' | 'record' | 'surveillance' | 'extra';

export type EvidenceClue = {
  id: string;
  category: EvidenceCategory;
  title: string;
  summary: string;
  detail: string;
  relatedSuspectIds: string[];
  discoveredBy: string;
  keyEvidenceCandidate: boolean;
};

export type InvestigationHotspot = {
  id: string;
  label: string;
  region: string;
  description: string;
  discoveryText: string;
  clueIds: string[];
  conversationIds: string[];
  isOptional?: boolean;
};

export type TimelineSlot = {
  id: string;
  label: string;
  options: string[];
};

export type CaseSolution = {
  culpritId: string;
  keyLieClueId: string;
  methodKeywords: string[];
  evidenceChain: string[];
  truthSegments: string[];
  expectedTimeline: Record<string, Record<string, string>>;
  canonicalTimeline: string[];
};

export type CaseFile = {
  id: string;
  title: string;
  difficulty: CaseDifficulty;
  archiveMeta: ArchiveMeta;
  archiveSubtitle: string;
  briefing: Briefing;
  suspects: Suspect[];
  hotspots: InvestigationHotspot[];
  conversations: ConversationSnippet[];
  clues: EvidenceClue[];
  timelineSlots: TimelineSlot[];
  solution: CaseSolution;
  hints: string[];
};

export type CaseProgress = {
  completed: boolean;
  highestScore: number;
  fastestSeconds: number | null;
  unlocked: boolean;
  highestRating: 'S' | 'A' | 'B' | 'C' | 'D' | null;
  completionCount: number;
};

export type GameSettings = {
  soundEnabled: boolean;
};

export type SaveData = {
  version: 2;
  caseProgress: Record<string, CaseProgress>;
  settings: GameSettings;
};

export type InvestigationState = {
  caseId: string;
  startedAt: number;
  discoveredHotspots: Set<string>;
  discoveredClues: Set<string>;
  unlockedConversations: Set<string>;
  selectedKeyEvidence: Set<string>;
  culpritId?: string;
  keyLieClueId?: string;
  methodTheory: string;
  timelineSelections: Record<string, Record<string, string>>;
};

export type CaseResult = {
  totalScore: number;
  rating: 'S' | 'A' | 'B' | 'C' | 'D';
  elapsedSeconds: number;
  timelineAccuracy: number;
  timelineCompletion: number;
  correct: {
    culprit: boolean;
    lie: boolean;
    method: boolean;
  };
  breakdown: {
    culprit: number;
    lie: number;
    method: number;
    keyEvidence: number;
    timeline: number;
    efficiency: number;
  };
};
