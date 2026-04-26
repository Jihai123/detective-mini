// T2.6-A migration path tests
// Run: node scripts/test-migration.mjs

// ─── replicate saveStore.ts migration functions (pure, no localStorage) ───

function getPrimaryTargetId(caseId) {
  if (caseId === 'case-001') return 'zhoulan';
  return 'default';
}

function migrateSaveV2toV3(raw) {
  return { ...raw, saveVersion: 3, caseId: typeof raw.caseId === 'string' && raw.caseId ? raw.caseId : 'case-001' };
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
  // collectedClues = inventory 长度(已收集),不等于案件总 clue 数
  console.log(`  [migrateSaveV5toV6] caseId=${caseId}, primaryTarget=${targetId}, collectedClues=${clueRuntimeStates.length}`);
  return { ...raw, saveVersion: 6, confrontationBySuspect: { [targetId]: oldConf }, clueRuntimeStates };
}

// ─── 完整 case-001 v5 存档 fixture(4 条 clue 全部收集) ───
// 模拟玩家打完 round-1(won)、round-2(won) 后被卡在 round-3 的中途存档
const CONFRONTATION_V5_FULL = {
  roundIndex: 2,
  mistakesInCurrentRound: 1,
  roundResults: ['won', 'won', 'pending'],
  selectedSentenceId: 'r3-s1',
  status: 'ongoing',
  lastFeedback: '这种东西能证明什么？别再纠缠。',
};

const INVENTORY_V5_FULL = [
  { id: 'clue-envelope-opened',  title: '封套二次开启痕迹',   role: 'confrontation', isKey: true, discoveredAt: 1700000001000 },
  { id: 'clue-doorlog-0728',     title: '07:28 门禁刷卡记录', role: 'confrontation', isKey: true, discoveredAt: 1700000002000 },
  { id: 'clue-camera-gap-0731',  title: '07:31 监控短暂空档', role: 'confrontation', isKey: true, discoveredAt: 1700000003000 },
  { id: 'clue-shred-label',      title: '碎纸桶标签残片',     role: 'confrontation', isKey: true, discoveredAt: 1700000004000 },
];

const BASE_FULL = {
  caseId: 'case-001',
  screen: 'confrontation',
  timestamp: 1700000010000,
  overlay: null,
  objective: '关键对质进行中',
  currentSceneId: 'review_room',
  flags: { 'first-contradiction-found': true, 'used-hint-or-fallback': false },
  inventory: INVENTORY_V5_FULL,
  testimonies: [
    { id: 'testimony-zhoulan-sealed', title: '周岚：资料已提前封存', discoveredAt: 1700000000500 },
    { id: 'testimony-zhoulan-0728',   title: '周岚：07:28 仅确认设备', discoveredAt: 1700000001500 },
    { id: 'testimony-chenxu-noentry', title: '陈序：会前未碰纸质资料', discoveredAt: 1700000002500 },
    { id: 'testimony-chenxu-witness', title: '陈序：目击周岚前往茶水间', discoveredAt: 1700000003500 },
  ],
  visitedDialogueNodes: ['node-zhoulan-entry', 'node-zhoulan-0728', 'node-chenxu-entry', 'node-chenxu-witness'],
  dialogueState: null,
  confrontation: CONFRONTATION_V5_FULL,
  timeline: { selectedClueId: null, placements: {}, conflicts: [], completed: false },
  submission: { suspect: '', keyLie: '', method: '', destination: '' },
  result: null,
  hintCount: 0,
  wrongSubmissionCount: 0,
  lastDiscoveryAt: 1700000004000,
  interpretations: [
    { clueId: 'clue-envelope-opened', selectedTier: 'canonical', chosenAt: 1700000001200 },
    { clueId: 'clue-doorlog-0728',    selectedTier: 'canonical', chosenAt: 1700000002200 },
  ],
};

// ─── assertion helper ───
let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
  if (condition) { console.log(`  ✅ ${label}`); pass++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

// ══════════════════════════════════════════════
// Path A — 全新用户(v6 直接写入,无迁移)
// ══════════════════════════════════════════════
console.log('\n─── Path A: 全新用户 fresh v6 ───');
const freshV6 = { ...BASE_FULL, saveVersion: 6 };
assert('A-1  saveVersion === 6', freshV6.saveVersion === 6);
assert('A-2  confrontation 结构存在', !!freshV6.confrontation);
assert('A-3  confrontation.roundIndex 正确', freshV6.confrontation.roundIndex === 2);
assert('A-4  T2.6-A 阶段 app.ts 不写 confrontationBySuspect', !freshV6.confrontationBySuspect);

// ══════════════════════════════════════════════
// Path B — v5 存档(4 clue 全收集)→ v6
// ══════════════════════════════════════════════
console.log('\n─── Path B: v5 存档(4 clue 全收集)→ v6 ───');
const v5Save = { ...BASE_FULL, saveVersion: 5 };
const v5 = migrateSaveV5toV6(v5Save);
assert('B-1  saveVersion === 6', v5.saveVersion === 6);
assert('B-2  confrontationBySuspect 存在', !!v5.confrontationBySuspect);
assert('B-3  key 为 zhoulan', Object.keys(v5.confrontationBySuspect).join(',') === 'zhoulan');
assert('B-4  confrontationBySuspect.zhoulan.roundIndex === 2', v5.confrontationBySuspect.zhoulan?.roundIndex === 2);
assert('B-5  roundResults 完整保留 ["won","won","pending"]',
  JSON.stringify(v5.confrontationBySuspect.zhoulan?.roundResults) === '["won","won","pending"]');
assert('B-6  confrontation(flat) 仍保留,app.ts 可用', !!v5.confrontation);
assert('B-7  clueRuntimeStates.length === 4(4 clue 全收集)', v5.clueRuntimeStates?.length === 4);
assert('B-8  clueRuntimeStates[0].clueId 正确', v5.clueRuntimeStates?.[0]?.clueId === 'clue-envelope-opened');
assert('B-9  clueRuntimeStates[0].discoverable === true', v5.clueRuntimeStates?.[0]?.discoverable === true);
assert('B-10 clueRuntimeStates[0].currentLayer === 0', v5.clueRuntimeStates?.[0]?.currentLayer === 0);
assert('B-11 clueRuntimeStates[3].clueId 正确', v5.clueRuntimeStates?.[3]?.clueId === 'clue-shred-label');
assert('B-12 interpretations 原样保留(2 条)', v5.interpretations?.length === 2);
assert('B-13 inventory 原样保留(4 条)', v5.inventory?.length === 4);
console.log('  browser 模拟输出:');
console.log('    saveVersion:', v5.saveVersion);
console.log('    clueRuntimeStates length:', v5.clueRuntimeStates?.length);
console.log('    clueRuntimeStates entries:', JSON.stringify(v5.clueRuntimeStates, null, 2));
console.log('    confrontationBySuspect keys:', Object.keys(v5.confrontationBySuspect ?? {}));

// ══════════════════════════════════════════════
// Path C — v4 存档 → v5 → v6
// ══════════════════════════════════════════════
console.log('\n─── Path C: v4 存档 → v5 → v6 ───');
const v4Save = { ...BASE_FULL, saveVersion: 4 }; // v4 已有 interpretations
const v4 = migrateSaveV5toV6(migrateSaveV4toV5(v4Save));
assert('C-1  saveVersion === 6', v4.saveVersion === 6);
assert('C-2  confrontationBySuspect.zhoulan 存在', !!v4.confrontationBySuspect?.zhoulan);
assert('C-3  roundResults 保留 ["won","won","pending"]',
  JSON.stringify(v4.confrontationBySuspect?.zhoulan?.roundResults) === '["won","won","pending"]');
assert('C-4  clueRuntimeStates.length === 4', v4.clueRuntimeStates?.length === 4);
assert('C-5  interpretations 存在(v4 已有)', Array.isArray(v4.interpretations));

// ══════════════════════════════════════════════
// Path D — v3 存档 → v4 → v5 → v6
// ══════════════════════════════════════════════
console.log('\n─── Path D: v3 存档 → v4 → v5 → v6 ───');
const v3Base = { ...BASE_FULL };
delete v3Base.interpretations; // v3 没有 interpretations
const v3Save = { ...v3Base, saveVersion: 3 };
const v3 = migrateSaveV5toV6(migrateSaveV4toV5(migrateSaveV3toV4(v3Save)));
assert('D-1  saveVersion === 6', v3.saveVersion === 6);
assert('D-2  confrontationBySuspect.zhoulan 存在', !!v3.confrontationBySuspect?.zhoulan);
assert('D-3  v3 round 数据完整迁移(roundIndex=2)', v3.confrontationBySuspect?.zhoulan?.roundIndex === 2);
assert('D-4  v3 roundResults 完整 ["won","won","pending"]',
  JSON.stringify(v3.confrontationBySuspect?.zhoulan?.roundResults) === '["won","won","pending"]');
assert('D-5  interpretations 由 v3→v4 注入', Array.isArray(v3.interpretations));
assert('D-6  clueRuntimeStates.length === 4', v3.clueRuntimeStates?.length === 4);

// ══════════════════════════════════════════════
// Path E — v2 存档 → v3 → v4 → v5 → v6
// ══════════════════════════════════════════════
console.log('\n─── Path E: v2 存档 → v3 → v4 → v5 → v6 ───');
const v2Base = { ...BASE_FULL };
delete v2Base.caseId;
delete v2Base.interpretations;
const v2Save = { ...v2Base, saveVersion: 2 };
const v2 = migrateSaveV5toV6(migrateSaveV4toV5(migrateSaveV3toV4(migrateSaveV2toV3(v2Save))));
assert('E-1  saveVersion === 6', v2.saveVersion === 6);
assert('E-2  caseId 由 v2→v3 注入为 case-001', v2.caseId === 'case-001');
assert('E-3  confrontationBySuspect.zhoulan 存在', !!v2.confrontationBySuspect?.zhoulan);
assert('E-4  roundResults 保留 ["won","won","pending"]',
  JSON.stringify(v2.confrontationBySuspect?.zhoulan?.roundResults) === '["won","won","pending"]');
assert('E-5  clueRuntimeStates.length === 4', v2.clueRuntimeStates?.length === 4);

// ══════════════════════════════════════════════
// Path F — 未知 caseId fallback key='default'
// ══════════════════════════════════════════════
console.log('\n─── Path F: 未知 caseId → key=default ───');
const unknownSave = { ...BASE_FULL, caseId: 'case-999', saveVersion: 5 };
const unk = migrateSaveV5toV6(unknownSave);
assert('F-1  confrontationBySuspect key 为 "default"', !!unk.confrontationBySuspect?.default);
assert('F-2  caseId 保留为 case-999', unk.caseId === 'case-999');
assert('F-3  clueRuntimeStates 仍从 inventory 生成', unk.clueRuntimeStates?.length === 4);

// ══════════════════════════════════════════════
// 关于 "clues=N" 语义说明
// ══════════════════════════════════════════════
console.log('\n─── 语义说明: collectedClues ───');
const partialSave = { ...BASE_FULL, saveVersion: 5, inventory: INVENTORY_V5_FULL.slice(0, 2) };
const partial = migrateSaveV5toV6(partialSave);
assert('语义-1  2 条已收集 → clueRuntimeStates.length === 2', partial.clueRuntimeStates?.length === 2);
assert('语义-2  4 条已收集 → clueRuntimeStates.length === 4', v5.clueRuntimeStates?.length === 4);
console.log('  结论: collectedClues = inventory.length(已收集 clue 数),非案件总 clue 数');
console.log('        未收集 clue 的 discoverable 状态由 T2.6-B runtime 在启动时补全初始化');

// ─── summary ───
console.log(`\n═══ Migration tests: ${pass} passed, ${fail} failed ═══`);
if (fail > 0) process.exit(1);
