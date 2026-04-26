export const SCREENS = ['archive', 'intro', 'investigation', 'confrontation', 'deduction', 'result'] as const;

export const OVERLAYS = ['dialogue', 'evidence', 'timeline', 'submission', 'hint', 'inspect', 'interpret'] as const;

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

export type Emotion = 'neutral' | 'tense' | 'defensive' | 'serious' | 'collapse';

export type DialogueNode = {
  id: string;
  characterId: string;
  entry?: boolean;
  emotion: Emotion;
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
  emotionPortraits?: Partial<Record<Emotion, string>>;
  dialogueEntryNodeId: string;
};

// T2 激活
export interface ClueInterpretation {
  label: string;
  summary?: string;
  attacksTestimonyIds: string[];
}

// T2 激活
export interface ClueInterpretations {
  canonical: ClueInterpretation;
  partial?: ClueInterpretation;
  misread?: ClueInterpretation;
}

// T2 激活 / T2.6 扩展: 'both' 替换为 'context'(背景证据,不参与对质也不影响结局)
export type ClueRole = 'confrontation' | 'emotional' | 'context';

// T5 预留
export interface ClueDiscoveryLayer {
  layerId: string;
  description: string;
  unlockAction?: string;
}

// T6 预留
export interface ClueUnlockRequirement {
  requiredClueIds?: string[];
  requiredInterpretations?: Array<{ clueId: string; tier: 'canonical' | 'partial' | 'misread' }>;
}

// T2 激活
export interface ClueInterpretationChoice {
  clueId: string;
  selectedTier: 'canonical' | 'partial' | 'misread';
  chosenAt: number;
}

// T2 激活
export type InterpretationState = ClueInterpretationChoice[];

export type ClueConfig = {
  id: string;
  title: string;
  description: string;
  source: string;
  isKey: boolean;
  image?: string;
  // T2 激活
  role: ClueRole;
  // T2 激活
  interpretations: ClueInterpretations;
  // T5 预留
  discoveryLayers?: ClueDiscoveryLayer[];
  // T6 预留
  unlockRequirement?: ClueUnlockRequirement;
};

export type TestimonyConfig = {
  id: string;
  title: string;
  content: string;
  sourceCharacterId: string;
};

// T2.6: 三档对质反应文本(未填则运行时使用全局默认兜底)
export type TestimonySentenceResponses = {
  partial?: string;
  misread?: string;
  irrelevant?: string;
};

export type TestimonySentence = {
  id: string;
  text: string;
  contradictable: boolean;
  counterEvidenceId?: string;
  responses?: TestimonySentenceResponses;
};

export type ConfrontationRound = {
  id: string;
  sentences: TestimonySentence[];
  enterEmotion: Emotion;
  onCorrectEmotion: Emotion;
  onCorrectFeedback: string;
  onWrongFeedback: string;
  onRoundLost?: string;
};

// T2.6: 每个嫌疑人独立的对质数据(平行切换,互不干扰)
export type SuspectConfig = {
  suspectId: string;
  maxMistakesPerRound: number;
  rounds: ConfrontationRound[];
  onAllLost?: string;
  onSuccess: string;
};

export type ConfrontationConfig = {
  target: string;
  maxMistakesPerRound: number;
  rounds: ConfrontationRound[];
  onAllLost?: string;
  onSuccess: string;
  // T2.6: 多嫌疑人结构,T2.6-B 激活; T2.6-A 期间与旧字段并存
  suspects?: SuspectConfig[];
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

// T2.6: 结局文本块
export type EndingTextBlock = {
  title: string;
  body: string;
};

// T2.6: endingMatrix 规则条目 — 满足 when 条件则命中对应 endingKey
export type EndingMatrixRule = {
  when: {
    minScore?: number;
    submissionCorrect?: boolean;
  };
  endingKey: string;
};

// T2.6: data-driven 结局矩阵,规则顺序命中,无命中则用 fallback
export type EndingMatrix = {
  rules: EndingMatrixRule[];
  fallback: string;
};

// T2.6: 线索发现/解锁 runtime 状态(discoverable 由 unlock 重算驱动,T2.6-B 激活)
export type ClueRuntimeState = {
  clueId: string;
  discoverable: boolean;
  currentLayer: number;
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
  // T2.6: data-driven 结局文本与矩阵(T2.6-B 接入 result 渲染)
  endings?: Record<string, EndingTextBlock>;
  endingMatrix?: EndingMatrix;
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
  mistakesInCurrentRound: number;
  // T2.6: 新增 'draw'(misread 命中时可产生平局,T2.6-B 激活)
  roundResults: Array<'pending' | 'won' | 'lost' | 'draw'>;
  selectedSentenceId: string | null;
  status: 'idle' | 'ongoing' | 'success' | 'allLost';
  lastFeedback: string;
  lostByMisread?: boolean;
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
  // T2 激活
  interpretations: InterpretationState;
};

export type StageSaveData = {
  saveVersion: number;
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
  // T2 激活
  interpretations: InterpretationState;
  // T2.6: 多嫌疑人对质状态字典 { suspectId: ConfrontationState }(T2.6-B 激活,T2.6-A 仅写入 migration)
  confrontationBySuspect?: Record<string, ConfrontationState>;
  // T2.6: 每条线索的发现/layer runtime 状态(T2.6-B 激活)
  clueRuntimeStates?: ClueRuntimeState[];
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
