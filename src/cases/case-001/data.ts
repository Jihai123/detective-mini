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
    { id: 'clue-envelope-opened', title: '封套二次开启痕迹', description: '封签边缘有新拉扯痕迹，封套并非"一直密封"。', source: 'review_room / desk', isKey: true, image: '/assets/cases/case-001/clues/clue-envelope-opened.jpg', role: 'confrontation', interpretations: { canonical: { label: '封签拉扯痕迹是人为重新开启的直接证明，"封存后未再触碰"的说法不成立。', attacksTestimonyIds: ['r1-s2'] }, misread: { label: '封签边缘磨损可能是运输或存放中的正常损耗，不一定是人为破坏。', attacksTestimonyIds: [] } }, discoveryLayers: [{ layerId: 'layer-1', description: '封签边缘有新拉扯痕迹，封套并非"一直密封"。' }] },
    { id: 'clue-doorlog-0728', title: '07:28 门禁刷卡记录', description: '评审室门终端记录显示 07:28 有一次进入。', source: 'review_room / door_terminal', isKey: true, image: '/assets/cases/case-001/clues/clue-doorlog-0728.jpg', role: 'confrontation', interpretations: { canonical: { label: '07:28 的刷卡记录是周岚亲身进入评审室的硬证据，直接推翻她"未再返回"的口供。', attacksTestimonyIds: ['r2-s1'] }, misread: { label: '07:28 的进入记录是例行设备巡检，职责范围内的行为，不能证明接触了资料。', attacksTestimonyIds: [] } }, discoveryLayers: [{ layerId: 'layer-1', description: '评审室门终端记录显示 07:28 有一次进入。' }] },
    { id: 'clue-camera-gap-0731', title: '07:31 监控短暂空档', description: '走廊监控在 07:31 附近存在几分钟数据缺口。', source: 'hallway_monitor / monitor_node', isKey: true, image: '/assets/cases/case-001/clues/clue-camera-gap-0731.jpg', role: 'confrontation', interpretations: { canonical: { label: '监控空窗精准落在 07:31，与周岚进入室内后的行动时段高度吻合，是关键视线盲区。', attacksTestimonyIds: [] }, misread: { label: '几分钟的数据缺口是监控设备偶发故障，与本案时间线不一定有关联。', attacksTestimonyIds: [] } }, discoveryLayers: [{ layerId: 'layer-1', description: '走廊监控在 07:31 附近存在几分钟数据缺口。' }] },
    { id: 'clue-shred-label', title: '碎纸桶标签残片', description: '茶水间回收桶发现被撕碎的评审标签条。', source: 'pantry_bin / recycle_bin', isKey: true, image: '/assets/cases/case-001/clues/clue-shred-label.jpg', role: 'confrontation', interpretations: { canonical: { label: '评审专用标签出现在茶水间回收桶，说明有人将拆封后的封套标签撕碎并刻意丢弃于此。', attacksTestimonyIds: ['r3-s2'] }, misread: { label: '碎纸残片可能是多人操作中误投，单凭碎纸无法确认拆封行为的主体。', attacksTestimonyIds: [] } }, discoveryLayers: [{ layerId: 'layer-1', description: '茶水间回收桶发现被撕碎的评审标签条。' }] },
  ],
  testimonies: [
    { id: 'testimony-zhoulan-sealed', title: '周岚：资料已提前封存', content: '周岚称资料前一晚已封存，之后没再碰过。', sourceCharacterId: 'zhoulan' },
    { id: 'testimony-zhoulan-0728', title: '周岚：07:28 仅确认设备', content: '周岚承认 07:28 进入评审室，只看空调和投影，未碰资料。', sourceCharacterId: 'zhoulan' },
    { id: 'testimony-chenxu-noentry', title: '陈序：会前未碰纸质资料', content: '陈序表示 08:05 到场后一直在外侧整理演示文件。', sourceCharacterId: 'chenxu' },
    { id: 'testimony-chenxu-witness', title: '陈序：目击周岚前往茶水间', content: '陈序证实在 07:31 前后，亲眼看到周岚从评审区方向走向茶水间，手中似乎拿着东西。', sourceCharacterId: 'chenxu' },
  ],
  characters: [
    { id: 'zhoulan', name: '周岚', role: '项目行政负责人', avatar: '/assets/cases/case-001/characters/zhoulan-avatar.png', portrait: '/assets/cases/case-001/characters/zhoulan-neutral.png', emotionPortraits: { neutral: '/assets/cases/case-001/characters/zhoulan-neutral.png', defensive: '/assets/cases/case-001/characters/zhoulan-defensive.png', collapse: '/assets/cases/case-001/characters/zhoulan-collapse.png' }, dialogueEntryNodeId: 'node-zhoulan-entry' },
    { id: 'chenxu', name: '陈序', role: '演示工程师', avatar: '/assets/cases/case-001/characters/chenxu-avatar.png', portrait: '/assets/cases/case-001/characters/chenxu-neutral.png', emotionPortraits: { neutral: '/assets/cases/case-001/characters/chenxu-neutral.png', serious: '/assets/cases/case-001/characters/chenxu-serious.png' }, dialogueEntryNodeId: 'node-chenxu-entry' },
  ],
  dialogueNodes: [
    { id: 'node-zhoulan-entry', characterId: 'zhoulan', entry: true, emotion: 'neutral', lines: ['发布会资料昨晚就封好了，今天早上我只看了设备。'], effects: [{ type: 'addTestimony', testimonyId: 'testimony-zhoulan-sealed' }], options: [{ id: 'opt-zhoulan-0728', label: '门禁 07:28 的进入记录怎么解释？', to: 'node-zhoulan-0728', unlockCondition: ['clue:clue-doorlog-0728'] }] },
    { id: 'node-zhoulan-0728', characterId: 'zhoulan', emotion: 'tense', lines: ['是我进去确认过空调和投影，但我没有动桌上的资料封套。'], effects: [{ type: 'addTestimony', testimonyId: 'testimony-zhoulan-0728' }], options: [{ id: 'opt-zhoulan-back', label: '回到主问题', to: 'node-zhoulan-entry' }] },
    { id: 'node-chenxu-entry', characterId: 'chenxu', entry: true, emotion: 'neutral', lines: ['我 08:05 左右到场，在外面整理演示内容，没进评审室翻资料。'], effects: [{ type: 'addTestimony', testimonyId: 'testimony-chenxu-noentry' }], options: [{ id: 'opt-chenxu-side', label: '你在走廊看到谁最早到？', to: 'node-chenxu-side', unlockCondition: ['flag:first-contradiction-found'] }] },
    { id: 'node-chenxu-side', characterId: 'chenxu', emotion: 'defensive', lines: ['我看到周岚比我更早在评审区附近，像是在确认什么。'], options: [{ id: 'opt-chenxu-side-witness', label: '你看到她去了哪里？', to: 'node-chenxu-witness', unlockCondition: ['clue:clue-camera-gap-0731'] }, { id: 'opt-chenxu-back', label: '继续调查', to: 'node-chenxu-entry' }] },
    { id: 'node-chenxu-witness', characterId: 'chenxu', emotion: 'serious', lines: ['……等等，我想起来了。07:31 左右，我确实看到周岚从评审区方向往茶水间走去，手里好像拿着什么东西。'], effects: [{ type: 'addTestimony', testimonyId: 'testimony-chenxu-witness' }], options: [{ id: 'opt-chenxu-witness-back', label: '我记下来了', to: 'node-chenxu-entry' }] },
  ],
  scenes: [
    { id: 'review_room', label: '评审室', background: '/assets/cases/case-001/scenes/review_room.jpg', characterIds: ['zhoulan', 'chenxu'], hotspots: [
      { id: 'desk', label: '桌面封套', sceneId: 'review_room', position: { x: 51, y: 67 }, positionMode: 'percent', onInteract: [{ type: 'addClue', clueId: 'clue-envelope-opened' }, { type: 'updateObjective', objective: '追问周岚"封存后未触碰"的说法。' }, { type: 'openOverlay', overlay: 'inspect' }] },
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
    maxMistakesPerRound: 2,
    rounds: [
      {
        id: 'round-1',
        sentences: [
          { id: 'r1-s1', text: '资料昨晚封存之后，我就没有任何理由再返回评审室。', contradictable: false },
          { id: 'r1-s2', text: '那份封套从昨晚到今早，一直保持完好的密封状态，根本没人动过。', contradictable: true, counterEvidenceId: 'clue-envelope-opened' },
        ],
        enterEmotion: 'neutral',
        onCorrectEmotion: 'defensive',
        onCorrectFeedback: '……封条边缘有痕迹？那也不能说明什么。',
        onWrongFeedback: '这条证据跟我的说法没关系，别东拉西扯。',
        onRoundLost: '你连这点都拿不出证据？那就别再浪费时间了。',
      },
      {
        id: 'round-2',
        sentences: [
          { id: 'r2-s1', text: '07:28 那会儿，我在走廊等候区，根本没有进入过评审室。', contradictable: true, counterEvidenceId: 'clue-doorlog-0728' },
          { id: 'r2-s2', text: '我的门禁权限在那个时间段根本没有激活记录。', contradictable: false },
        ],
        enterEmotion: 'defensive',
        onCorrectEmotion: 'defensive',
        onCorrectFeedback: '……陈序？他什么时候路过的，他看清是谁了吗？',
        onWrongFeedback: '门禁记录那种东西证明不了什么，你再找找别的吧。',
        onRoundLost: '你们查不出来的。我该说的都说过了。',
      },
      {
        id: 'round-3',
        sentences: [
          { id: 'r3-s1', text: '进评审室检查设备是职责所在，但整个过程我没有接触任何资料页面。', contradictable: false },
          { id: 'r3-s2', text: '那些评审标签条一直完整贴在封套上，我从来没有撕过任何东西。', contradictable: true, counterEvidenceId: 'clue-shred-label' },
        ],
        enterEmotion: 'defensive',
        onCorrectEmotion: 'collapse',
        onCorrectFeedback: '……那张标签，怎么会在茶水间……\n\n是又怎样。反正，你们想要的答案我都给了。',
        onWrongFeedback: '这种东西能证明什么？别再纠缠。',
        onRoundLost: '就这样吧。我配合了，你们也查过了，还想怎么样？',
      },
    ],
    onAllLost: '周岚保持沉默。她的每一条防线都没能被击穿——也许证据还没有收集齐全。',
    onSuccess: '第一层谎言已经拆穿。但她做这些事的真正动机，还藏在某个地方。',
    // T2.6: 多嫌疑人结构(case-001 单嫌疑人,数据与旧字段镜像,T2.6-B 激活)
    suspects: [
      {
        suspectId: 'zhoulan',
        maxMistakesPerRound: 2,
        rounds: [
          {
            id: 'round-1',
            sentences: [
              { id: 'r1-s1', text: '资料昨晚封存之后，我就没有任何理由再返回评审室。', contradictable: false },
              { id: 'r1-s2', text: '那份封套从昨晚到今早，一直保持完好的密封状态，根本没人动过。', contradictable: true, counterEvidenceId: 'clue-envelope-opened' },
            ],
            enterEmotion: 'neutral',
            onCorrectEmotion: 'defensive',
            onCorrectFeedback: '……封条边缘有痕迹？那也不能说明什么。',
            onWrongFeedback: '这条证据跟我的说法没关系，别东拉西扯。',
            onRoundLost: '你连这点都拿不出证据？那就别再浪费时间了。',
          },
          {
            id: 'round-2',
            sentences: [
              { id: 'r2-s1', text: '07:28 那会儿，我在走廊等候区，根本没有进入过评审室。', contradictable: true, counterEvidenceId: 'clue-doorlog-0728' },
              { id: 'r2-s2', text: '我的门禁权限在那个时间段根本没有激活记录。', contradictable: false },
            ],
            enterEmotion: 'defensive',
            onCorrectEmotion: 'defensive',
            onCorrectFeedback: '……陈序？他什么时候路过的，他看清是谁了吗？',
            onWrongFeedback: '门禁记录那种东西证明不了什么，你再找找别的吧。',
            onRoundLost: '你们查不出来的。我该说的都说过了。',
          },
          {
            id: 'round-3',
            sentences: [
              { id: 'r3-s1', text: '进评审室检查设备是职责所在，但整个过程我没有接触任何资料页面。', contradictable: false },
              { id: 'r3-s2', text: '那些评审标签条一直完整贴在封套上，我从来没有撕过任何东西。', contradictable: true, counterEvidenceId: 'clue-shred-label' },
            ],
            enterEmotion: 'defensive',
            onCorrectEmotion: 'collapse',
            onCorrectFeedback: '……那张标签，怎么会在茶水间……\n\n是又怎样。反正，你们想要的答案我都给了。',
            onWrongFeedback: '这种东西能证明什么？别再纠缠。',
            onRoundLost: '就这样吧。我配合了，你们也查过了，还想怎么样？',
          },
        ],
        onAllLost: '周岚保持沉默。她的每一条防线都没能被击穿——也许证据还没有收集齐全。',
        onSuccess: '第一层谎言已经拆穿。但她做这些事的真正动机，还藏在某个地方。',
      },
    ],
  },
  timelineSlots: [
    { id: 't-0720', label: '07:20 资料送达 / 周岚负责封装', expectedClueId: 'clue-envelope-opened' },
    { id: 't-0728', label: '07:28 周岚进入评审室', expectedClueId: 'clue-doorlog-0728' },
    { id: 't-0731', label: '07:31-07:33 监控空窗', expectedClueId: 'clue-camera-gap-0731' },
    { id: 't-0800', label: '08:00 发现结论页异常', expectedClueId: 'clue-shred-label' },
  ],
  submission: {
    suspects: ['周岚', '陈序'],
    keyLies: ['"资料始终处于封存状态"', '"07:28 仅检查设备且未接触资料"'],
    methods: ['进入评审室后拆封并抽走结论页，再伪装为封套完好', '仅通过口头误导拖延，无实体转移'],
    destinations: ['茶水间回收桶（碎纸混入）', '走廊储物柜'],
    correct: {
      suspect: '周岚',
      keyLie: '"资料始终处于封存状态"',
      method: '进入评审室后拆封并抽走结论页，再伪装为封套完好',
      destination: '茶水间回收桶（碎纸混入）',
    },
  },
  truthReplay: [
    { id: 'rp-1', title: '进入', summary: '周岚在 07:28 进入评审室，行为与其"未再接触"说法冲突。', timeAnchor: '07:28', evidenceIds: ['clue-doorlog-0728', 'testimony-zhoulan-0728'] },
    { id: 'rp-2', title: '拆封', summary: '封套存在二次开启痕迹，说明资料被重新处理。', timeAnchor: '07:20-07:31', evidenceIds: ['clue-envelope-opened', 'testimony-zhoulan-sealed'] },
    { id: 'rp-3', title: '转移', summary: '结论页被抽离并处理，残片最终进入回收桶。', timeAnchor: '07:31-08:00', evidenceIds: ['clue-shred-label'] },
    { id: 'rp-4', title: '掩饰与拖延', summary: '监控空窗与口径反复用于拖延核验，直至 08:17 后被连续证据压实。', timeAnchor: '07:31-08:22', evidenceIds: ['clue-camera-gap-0731', 'testimony-chenxu-noentry'] },
  ],
  // T2.6: data-driven 结局文本(T2.6-B 接入 result 渲染,现阶段仅定义数据)
  endings: {
    success: {
      title: '案件归档',
      body: '你已锁定真相核心：周岚在会前拆封并转移结论页。',
    },
    // TODO(T3): T2.5.1 renderResultBody 无条件分支,失败路径渲染与成功完全相同(历史 bug)。
    // failure 此处显式复制 success 现状,确保 T2.6-B 接入后 case-001 玩家感知不变。
    // T3 重做 result UI 时再分离成功/失败分支文案。
    failure: {
      title: '案件归档',
      body: '你已锁定真相核心：周岚在会前拆封并转移结论页。',
    },
  },
  // T2.6: submissionCorrect 命中 → success,否则 fallback → failure
  endingMatrix: {
    rules: [{ when: { submissionCorrect: true }, endingKey: 'success' }],
    fallback: 'failure',
  },
};
