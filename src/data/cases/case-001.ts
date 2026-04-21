import type { StageCaseConfig } from '../../stage1/types';

export const case001Config: StageCaseConfig = {
  id: 'case-001',
  title: '08:17 的空档',
  summary: '发布会前的资料封套出现二次开启痕迹，监控与门禁记录存在时间断层。',
  timeRange: '07:10 - 08:40',
  location: '星港科技 12F 评审区',
  introLines: [
    '第一轮调查聚焦 review_room：desk 与 door_terminal。',
    '矛盾成立后进入第二轮区域，最后完成关键对质。',
    '阶段 6：进行时间验证并提交结案归纳。',
  ],
  initialObjective: '第一轮调查：在 review_room 查明封套状态与门禁记录。',
  clues: [
    { id: 'clue-envelope-opened', title: '封套二次开启痕迹', description: '封签边缘有新拉扯痕迹，封套并非”一直密封”。', source: 'review_room / desk', isKey: true, image: '/assets/cases/case-001/clues/clue-envelope-opened.jpg' },
    { id: 'clue-doorlog-0728', title: '07:28 门禁刷卡记录', description: '评审室门终端记录显示 07:28 有一次进入。', source: 'review_room / door_terminal', isKey: true, image: '/assets/cases/case-001/clues/clue-doorlog-0728.jpg' },
    { id: 'clue-camera-gap-0731', title: '07:31 监控短暂空档', description: '走廊监控在 07:31 附近存在几分钟数据缺口。', source: 'hallway_monitor / monitor_node', isKey: true, image: '/assets/cases/case-001/clues/clue-camera-gap-0731.jpg' },
    { id: 'clue-shred-label', title: '碎纸桶标签残片', description: '茶水间回收桶发现被撕碎的评审标签条。', source: 'pantry_bin / recycle_bin', isKey: true, image: '/assets/cases/case-001/clues/clue-shred-label.jpg' },
  ],
  testimonies: [
    { id: 'testimony-zhoulan-sealed', title: '周岚：资料已提前封存', content: '周岚称资料前一晚已封存，之后没再碰过。', sourceCharacterId: 'zhoulan' },
    { id: 'testimony-zhoulan-0728', title: '周岚：07:28 仅确认设备', content: '周岚承认 07:28 进入评审室，只看空调和投影，未碰资料。', sourceCharacterId: 'zhoulan' },
    { id: 'testimony-chenxu-noentry', title: '陈序：会前未碰纸质资料', content: '陈序表示 08:05 到场后一直在外侧整理演示文件。', sourceCharacterId: 'chenxu' },
  ],
  characters: [
    { id: 'zhoulan', name: '周岚', role: '项目行政负责人', avatar: '/assets/cases/case-001/characters/zhoulan-avatar.png', portrait: '/assets/cases/case-001/characters/zhoulan-neutral.png', dialogueEntryNodeId: 'node-zhoulan-entry' },
    { id: 'chenxu', name: '陈序', role: '演示工程师', avatar: '/assets/cases/case-001/characters/chenxu-avatar.png', portrait: '/assets/cases/case-001/characters/chenxu-neutral.png', dialogueEntryNodeId: 'node-chenxu-entry' },
  ],
  dialogueNodes: [
    { id: 'node-zhoulan-entry', characterId: 'zhoulan', entry: true, emotion: 'neutral', lines: ['发布会资料昨晚就封好了，今天早上我只看了设备。'], effects: [{ type: 'addTestimony', testimonyId: 'testimony-zhoulan-sealed' }], options: [{ id: 'opt-zhoulan-0728', label: '门禁 07:28 的进入记录怎么解释？', to: 'node-zhoulan-0728', unlockCondition: ['clue:clue-doorlog-0728'] }] },
    { id: 'node-zhoulan-0728', characterId: 'zhoulan', emotion: 'tense', lines: ['是我进去确认过空调和投影，但我没有动桌上的资料封套。'], effects: [{ type: 'addTestimony', testimonyId: 'testimony-zhoulan-0728' }], options: [{ id: 'opt-zhoulan-back', label: '回到主问题', to: 'node-zhoulan-entry' }] },
    { id: 'node-chenxu-entry', characterId: 'chenxu', entry: true, emotion: 'neutral', lines: ['我 08:05 左右到场，在外面整理演示内容，没进评审室翻资料。'], effects: [{ type: 'addTestimony', testimonyId: 'testimony-chenxu-noentry' }], options: [{ id: 'opt-chenxu-side', label: '你在走廊看到谁最早到？', to: 'node-chenxu-side', unlockCondition: ['flag:first-contradiction-found'] }] },
    { id: 'node-chenxu-side', characterId: 'chenxu', emotion: 'defensive', lines: ['我看到周岚比我更早在评审区附近，像是在确认什么。'], options: [{ id: 'opt-chenxu-back', label: '继续调查', to: 'node-chenxu-entry' }] },
  ],
  scenes: [
    { id: 'review_room', label: '评审室', background: '/assets/cases/case-001/scenes/review_room.jpg', characterIds: ['zhoulan', 'chenxu'], hotspots: [
      { id: 'desk', label: '桌面封套', sceneId: 'review_room', position: { x: 51, y: 67 }, positionMode: 'percent', onInteract: [{ type: 'addClue', clueId: 'clue-envelope-opened' }, { type: 'updateObjective', objective: '追问周岚“封存后未触碰”的说法。' }, { type: 'openOverlay', overlay: 'inspect' }] },
      { id: 'door_terminal', label: '门口终端', sceneId: 'review_room', position: { x: 15, y: 55 }, positionMode: 'percent', onInteract: [{ type: 'addClue', clueId: 'clue-doorlog-0728' }, { type: 'updateObjective', objective: '已掌握 07:28 记录，立即追问周岚。' }, { type: 'openOverlay', overlay: 'inspect' }] },
    ] },
    { id: 'hallway_monitor', label: '走廊监控点', background: '/assets/cases/case-001/scenes/hallway_monitor.jpg', characterIds: ['chenxu'], unlockCondition: ['flag:first-contradiction-found'], hotspots: [
      { id: 'monitor_node', label: '监控节点', sceneId: 'hallway_monitor', position: { x: 68, y: 41 }, positionMode: 'percent', unlockCondition: ['flag:first-contradiction-found'], onInteract: [{ type: 'addClue', clueId: 'clue-camera-gap-0731' }, { type: 'updateObjective', objective: '第二轮调查：补全 07:31 空档与碎纸来源。' }, { type: 'openOverlay', overlay: 'inspect' }] },
    ] },
    { id: 'pantry_bin', label: '茶水间回收区', background: '/assets/cases/case-001/scenes/pantry_bin.jpg', characterIds: ['zhoulan'], unlockCondition: ['flag:first-contradiction-found'], hotspots: [
      { id: 'recycle_bin', label: '回收桶', sceneId: 'pantry_bin', position: { x: 36, y: 62 }, positionMode: 'percent', unlockCondition: ['flag:first-contradiction-found'], onInteract: [{ type: 'addClue', clueId: 'clue-shred-label' }, { type: 'updateObjective', objective: '已获得第二轮关键物证，准备进入后续阶段。' }, { type: 'openOverlay', overlay: 'inspect' }] },
    ] },
  ],
  confrontation: {
    target: 'zhoulan',
    maxMistakes: 2,
    rounds: [
      { id: 'round-1', defense: '资料早就封好了，从昨晚到早上都没人动过。', correctEvidence: 'clue-envelope-opened', wrongFeedback: '周岚：这条证据不能证明我说错了，别混淆重点。', correctFeedback: '周岚：……封套边缘确实不像原封不动。' },
      { id: 'round-2', defense: '07:28 进去只是检查设备，不涉及资料。', correctEvidence: 'clue-doorlog-0728', wrongFeedback: '周岚：你拿不出时间点证据，就别断言我进门行为。', correctFeedback: '周岚：门禁记录你都看到了……我确实是 07:28 进过门。' },
      { id: 'round-3', defense: '即使进去过，也不代表我动过资料。', correctEvidence: 'clue-shred-label', wrongFeedback: '周岚：这不足以指向我处理过资料。', correctFeedback: '周岚：……那张标签是我撕掉的，我承认转移过结论页。' },
    ],
    onFail: '对质受挫：先回调查区补强证据，再回来施压。',
    onSuccess: '周岚承认转移了结论页，进入时间验证与结案归纳。',
  },
  timelineSlots: [
    { id: 't-0720', label: '07:20 资料送达 / 周岚负责封装', expectedClueId: 'clue-envelope-opened' },
    { id: 't-0728', label: '07:28 周岚进入评审室', expectedClueId: 'clue-doorlog-0728' },
    { id: 't-0731', label: '07:31–07:33 监控空窗', expectedClueId: 'clue-camera-gap-0731' },
    { id: 't-0800', label: '08:00 发现结论页异常', expectedClueId: 'clue-shred-label' },
    { id: 't-0805', label: '08:05 陈序到场', expectedClueId: 'clue-doorlog-0728' },
    { id: 't-0817', label: '08:17 玩家介入', expectedClueId: 'clue-camera-gap-0731' },
    { id: 't-0822', label: '08:22 最后期限', expectedClueId: 'clue-shred-label' },
  ],
  submission: {
    suspects: ['周岚', '陈序'],
    keyLies: ['“资料始终处于封存状态”', '“07:28 仅检查设备且未接触资料”'],
    methods: ['进入评审室后拆封并抽走结论页，再伪装为封套完好', '仅通过口头误导拖延，无实体转移'],
    destinations: ['茶水间回收桶（碎纸混入）', '走廊储物柜'],
    correct: {
      suspect: '周岚',
      keyLie: '“资料始终处于封存状态”',
      method: '进入评审室后拆封并抽走结论页，再伪装为封套完好',
      destination: '茶水间回收桶（碎纸混入）',
    },
  },
  truthReplay: [
    { id: 'rp-1', title: '进入', summary: '周岚在 07:28 进入评审室，行为与其“未再接触”说法冲突。', timeAnchor: '07:28', evidenceIds: ['clue-doorlog-0728', 'testimony-zhoulan-0728'] },
    { id: 'rp-2', title: '拆封', summary: '封套存在二次开启痕迹，说明资料被重新处理。', timeAnchor: '07:20-07:31', evidenceIds: ['clue-envelope-opened', 'testimony-zhoulan-sealed'] },
    { id: 'rp-3', title: '转移', summary: '结论页被抽离并处理，残片最终进入回收桶。', timeAnchor: '07:31-08:00', evidenceIds: ['clue-shred-label'] },
    { id: 'rp-4', title: '掩饰与拖延', summary: '监控空窗与口径反复用于拖延核验，直至 08:17 后被连续证据压实。', timeAnchor: '07:31-08:22', evidenceIds: ['clue-camera-gap-0731', 'testimony-chenxu-noentry'] },
  ],
};
