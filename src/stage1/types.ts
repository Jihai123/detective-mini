export const SCREENS = ['archive', 'intro', 'investigation', 'confrontation', 'deduction', 'result'] as const;

export const OVERLAYS = ['dialogue', 'evidence', 'timeline', 'submission', 'hint', 'inspect'] as const;

export type Screen = (typeof SCREENS)[number];
export type Overlay = (typeof OVERLAYS)[number] | null;

export type ConditionExpr = string[] | { op: 'OR'; conditions: string[] } | { or: string[] };

export type HotspotEffect =
  | { type: 'setFlag'; flag: string; value: boolean }
  | { type: 'addClue'; clueId: string }
  | { type: 'unlockDialogue'; dialogueId: string }
  | { type: 'updateObjective'; objective: string }
  | { type: 'openOverlay'; overlay: Extract<Overlay, 'inspect'> }
  | { type: 'setScene'; sceneId: string };

export type DialogueEffect =
  | { type: 'addTestimony'; testimonyId: string }
  | { type: 'setFlag'; flag: string; value: boolean }
  | { type: 'updateObjective'; objective: string };

export type HotspotConfig = {
  id: string;
  label: string;
  sceneId: string;
  position: { x: number; y: number };
  positionMode: 'percent';
  unlockCondition?: ConditionExpr;
  onInteract: HotspotEffect[];
};

export type DialogueOption = {
  id: string;
  label: string;
  to: string;
  condition?: ConditionExpr;
  unlockCondition?: ConditionExpr;
};

export type DialogueNode = {
  id: string;
  characterId: string;
  entry?: boolean;
  emotion: 'neutral' | 'tense' | 'defensive';
  lines: string[];
  options: DialogueOption[];
  effects?: DialogueEffect[];
  condition?: ConditionExpr;
  unlockCondition?: ConditionExpr;
};

export type CharacterConfig = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  portrait: string;
  dialogueEntryNodeId: string;
};

export type ClueConfig = {
  id: string;
  title: string;
  description: string;
  source: string;
  isKey: boolean;
  image?: string;
};

export type TestimonyConfig = {
  id: string;
  title: string;
  content: string;
  sourceCharacterId: string;
};

export type ConfrontationRound = {
  id: string;
  defense: string;
  correctEvidence: string;
  wrongFeedback: string;
  correctFeedback: string;
};

export type ConfrontationConfig = {
  target: string;
  maxMistakes: number;
  rounds: ConfrontationRound[];
  onFail: string;
  onSuccess: string;
};

export type TimelineSlot = {
  id: string;
  label: string;
  expectedClueId: string;
};

export type SubmissionConfig = {
  suspects: string[];
  keyLies: string[];
  methods: string[];
  destinations: string[];
  correct: {
    suspect: string;
    keyLie: string;
    method: string;
    destination: string;
  };
};

export type TruthReplaySegment = {
  id: string;
  title: string;
  summary: string;
  timeAnchor: string;
  evidenceIds: string[];
};

export type SceneConfig = {
  id: string;
  label: string;
  background: string;
  hotspots: HotspotConfig[];
  characterIds: string[];
  unlockCondition?: ConditionExpr;
};

export type StageCaseConfig = {
  id: string;
  title: string;
  summary: string;
  timeRange: string;
  location: string;
  introLines: string[];
  initialObjective: string;
  scenes: SceneConfig[];
  clues: ClueConfig[];
  testimonies: TestimonyConfig[];
  characters: CharacterConfig[];
  dialogueNodes: DialogueNode[];
  confrontation: ConfrontationConfig;
  timelineSlots: TimelineSlot[];
  submission: SubmissionConfig;
  truthReplay: TruthReplaySegment[];
};

export type InventoryClue = ClueConfig & { discoveredAt: number };
export type InventoryTestimony = TestimonyConfig & { discoveredAt: number };

export type InspectCard = {
  hotspotLabel: string;
  clue: InventoryClue | null;
};

export type DialogueState = {
  characterId: string;
  nodeId: string;
  lineIndex: number;
};

export type ConfrontationState = {
  roundIndex: number;
  mistakes: number;
  lastFeedback: string;
  status: 'idle' | 'ongoing' | 'failed' | 'success';
};

export type TimelineState = {
  selectedClueId: string | null;
  placements: Record<string, string>;
  conflicts: string[];
  completed: boolean;
};

export type SubmissionState = {
  suspect: string;
  keyLie: string;
  method: string;
  destination: string;
};

export type ResultState = {
  rating: 'S' | 'A' | 'B' | 'F';
  score: number;
  clueRate: number;
  timelineComplete: boolean;
  usedHintOrFallback: boolean;
  submissionCorrect: boolean;
};

export type StageRuntimeState = {
  caseId: string;
  caseTitle: string;
  screen: Screen;
  overlay: Overlay;
  updatedAt: number;
  currentSceneId: string;
  objective: string;
  flags: Record<string, boolean>;
  inventory: InventoryClue[];
  testimonies: InventoryTestimony[];
  visitedDialogueNodes: string[];
  inspectCard: InspectCard | null;
  dialogueState: DialogueState | null;
  restoreNotice: string | null;
  contradictionMessage: string | null;
  confrontation: ConfrontationState;
  timeline: TimelineState;
  submission: SubmissionState;
  result: ResultState | null;
  hintCount: number;
  wrongSubmissionCount: number;
  lastDiscoveryAt: number;
  eventFeed: StandardEvent[];
};

export type StageSaveData = {
  caseId: string;
  screen: Screen;
  timestamp: number;
  overlay: Overlay;
  objective: string;
  currentSceneId: string;
  flags: Record<string, boolean>;
  inventory: InventoryClue[];
  testimonies: InventoryTestimony[];
  visitedDialogueNodes: string[];
  dialogueState: DialogueState | null;
  confrontation: ConfrontationState;
  timeline: TimelineState;
  submission: SubmissionState;
  result: ResultState | null;
  hintCount: number;
  wrongSubmissionCount: number;
  lastDiscoveryAt: number;
};

export type StandardEventName =
  | 'HOTSPOT_INVESTIGATED'
  | 'CLUE_DISCOVERED'
  | 'OBJECTIVE_UPDATED'
  | 'DIALOGUE_NODE_REACHED'
  | 'TESTIMONY_ADDED'
  | 'CONTRADICTION_FOUND'
  | 'CONFRONTATION_PROGRESS'
  | 'TIMELINE_UPDATED'
  | 'SUBMISSION_EVALUATED';

export type StandardEvent = {
  type: StandardEventName;
  timestamp: number;
  payload: Record<string, string>;
};

export type ConditionResult = {
  ok: boolean;
  missing: string[];
};
