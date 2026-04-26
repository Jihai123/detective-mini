// T2.6-A migration path tests — pure function replication of saveStore.ts logic
// Run: node scripts/test-migration.mjs

// --- replicate migration functions from saveStore.ts ---

function getPrimaryTargetId(caseId) {
  if (caseId === 'case-001') return 'zhoulan';
  return 'default';
}

function migrateSaveV2toV3(raw) {
  return {
    ...raw,
    saveVersion: 3,
    caseId: typeof raw.caseId === 'string' && raw.caseId ? raw.caseId : 'case-001',
  };
}

function migrateSaveV3toV4(raw) {
  return { ...raw, saveVersion: 4, interpretations: [] };
}

function migrateSaveV4toV5(raw) {
  return { ...raw, saveVersion: 5 };
}

function migrateSaveV5toV6(raw) {
  const caseId = typeof raw.caseId === 'string' ? raw.caseId : 'case-001';
  const targetId = getPrimaryTargetId(caseId);
  const oldConf = raw.confrontation && typeof raw.confrontation === 'object' ? raw.confrontation : {};

  const inventory = Array.isArray(raw.inventory) ? raw.inventory : [];
  const clueRuntimeStates = inventory.map((clue) => ({
    clueId: typeof clue.id === 'string' ? clue.id : '',
    discoverable: true,
    currentLayer: 0,
  }));

  console.log(`  [migrateSaveV5toV6] caseId=${caseId}, primaryTarget=${targetId}, clues=${clueRuntimeStates.length}`);
  return {
    ...raw,
    saveVersion: 6,
    confrontationBySuspect: { [targetId]: oldConf },
    clueRuntimeStates,
  };
}

// --- test fixtures ---

const CONFRONTATION_V5 = {
  roundIndex: 1,
  mistakesInCurrentRound: 0,
  roundResults: ['won', 'pending', 'pending'],
  selectedSentenceId: null,
  status: 'ongoing',
  lastFeedback: '……封条边缘有痕迹？那也不能说明什么。',
};

const INVENTORY_V5 = [
  { id: 'clue-envelope-opened', title: '封套二次开启痕迹', discoveredAt: 1700000001000 },
  { id: 'clue-doorlog-0728', title: '07:28 门禁刷卡记录', discoveredAt: 1700000002000 },
];

const BASE_FIELDS = {
  caseId: 'case-001',
  screen: 'confrontation',
  timestamp: 1700000000000,
  overlay: null,
  objective: '对质中',
  currentSceneId: 'review_room',
  flags: { 'first-contradiction-found': true },
  inventory: INVENTORY_V5,
  testimonies: [],
  visitedDialogueNodes: ['node-zhoulan-entry'],
  dialogueState: null,
  confrontation: CONFRONTATION_V5,
  timeline: { selectedClueId: null, placements: {}, conflicts: [], completed: false },
  submission: { suspect: '', keyLie: '', method: '', destination: '' },
  result: null,
  hintCount: 0,
  wrongSubmissionCount: 0,
  lastDiscoveryAt: 1700000000000,
};

// --- assertion helper ---
let pass = 0;
let fail = 0;
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    fail++;
  }
}

// --- path a: fresh v6 (no migration, app writes directly) ---
console.log('\n─── Path A: fresh v6 (新用户,无存档) ───');
const freshV6 = { ...BASE_FIELDS, saveVersion: 6, interpretations: [] };
assert('saveVersion === 6', freshV6.saveVersion === 6);
assert('confrontation preserved', freshV6.confrontation.roundIndex === 1);
assert('no confrontationBySuspect yet (app.ts not updated in T2.6-A)', !freshV6.confrontationBySuspect);
console.log(`  state: v6 save with ${Object.keys(freshV6).length} fields`);

// --- path b: v5 save with confrontation data ---
console.log('\n─── Path B: v5 存档 → v6 ───');
const v5Save = { ...BASE_FIELDS, saveVersion: 5, interpretations: [
  { clueId: 'clue-envelope-opened', selectedTier: 'canonical', chosenAt: 1700000001500 },
] };
const v5Migrated = migrateSaveV5toV6(v5Save);
assert('saveVersion === 6', v5Migrated.saveVersion === 6);
assert('confrontationBySuspect.zhoulan populated', !!v5Migrated.confrontationBySuspect?.zhoulan);
assert('confrontationBySuspect.zhoulan.roundIndex === 1', v5Migrated.confrontationBySuspect?.zhoulan?.roundIndex === 1);
assert('confrontationBySuspect.zhoulan.roundResults preserved', JSON.stringify(v5Migrated.confrontationBySuspect?.zhoulan?.roundResults) === '["won","pending","pending"]');
assert('confrontation (flat) still present for app.ts', !!v5Migrated.confrontation);
assert('clueRuntimeStates has 2 entries', v5Migrated.clueRuntimeStates?.length === 2);
assert('clueRuntimeStates[0].clueId correct', v5Migrated.clueRuntimeStates?.[0]?.clueId === 'clue-envelope-opened');
assert('clueRuntimeStates[0].discoverable === true', v5Migrated.clueRuntimeStates?.[0]?.discoverable === true);
assert('clueRuntimeStates[0].currentLayer === 0', v5Migrated.clueRuntimeStates?.[0]?.currentLayer === 0);
assert('interpretations preserved', v5Migrated.interpretations?.length === 1);
console.log(`  confrontationBySuspect keys: ${Object.keys(v5Migrated.confrontationBySuspect ?? {}).join(', ')}`);

// --- path c: v4 → v5 → v6 ---
// v4 存档经 v3→v4 已注入 interpretations:[]
console.log('\n─── Path C: v4 存档 → v5 → v6 ───');
const v4Save = { ...BASE_FIELDS, saveVersion: 4, interpretations: [] };
const v4Migrated = migrateSaveV5toV6(migrateSaveV4toV5(v4Save));
assert('saveVersion === 6', v4Migrated.saveVersion === 6);
assert('confrontationBySuspect.zhoulan populated', !!v4Migrated.confrontationBySuspect?.zhoulan);
assert('clueRuntimeStates length === 2', v4Migrated.clueRuntimeStates?.length === 2);
assert('interpretations preserved from v4', Array.isArray(v4Migrated.interpretations));

// --- path d: v3 → v4 → v5 → v6 ---
console.log('\n─── Path D: v3 存档 → v4 → v5 → v6 ───');
const v3Save = { ...BASE_FIELDS, saveVersion: 3 };
delete v3Save.interpretations;
const v3Migrated = migrateSaveV5toV6(migrateSaveV4toV5(migrateSaveV3toV4(v3Save)));
assert('saveVersion === 6', v3Migrated.saveVersion === 6);
assert('confrontationBySuspect.zhoulan populated', !!v3Migrated.confrontationBySuspect?.zhoulan);
assert('interpretations injected by v3→v4 step', Array.isArray(v3Migrated.interpretations));

// --- path e: v2 → v3 → v4 → v5 → v6 ---
console.log('\n─── Path E: v2 存档 → v3 → v4 → v5 → v6 ───');
const v2Save = { ...BASE_FIELDS, saveVersion: 2 };
delete v2Save.caseId;
delete v2Save.interpretations;
const v2Migrated = migrateSaveV5toV6(migrateSaveV4toV5(migrateSaveV3toV4(migrateSaveV2toV3(v2Save))));
assert('saveVersion === 6', v2Migrated.saveVersion === 6);
assert('caseId injected by v2→v3', v2Migrated.caseId === 'case-001');
assert('confrontationBySuspect.zhoulan populated', !!v2Migrated.confrontationBySuspect?.zhoulan);
assert('clueRuntimeStates populated', Array.isArray(v2Migrated.clueRuntimeStates));

// --- path f: unknown case-id fallback ---
console.log('\n─── Path F: 未知 caseId fallback → key=default ───');
const unknownSave = { ...BASE_FIELDS, caseId: 'case-999', saveVersion: 5, interpretations: [] };
const unknownMigrated = migrateSaveV5toV6(unknownSave);
assert('fallback key is "default"', !!unknownMigrated.confrontationBySuspect?.default);
assert('caseId preserved', unknownMigrated.caseId === 'case-999');

// --- summary ---
console.log(`\n═══ Migration tests: ${pass} passed, ${fail} failed ═══`);
if (fail > 0) process.exit(1);
