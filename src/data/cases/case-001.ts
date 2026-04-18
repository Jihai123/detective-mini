import type { CaseFile } from '../../domain/types';

export const case001: CaseFile = {
  id: 'case-001',
  title: '正式档案：08:17 的空档',
  difficulty: 'normal',
  assets: {
    scenes: {
      main: '/assets/cases/case-001/scenes/meeting_room.jpg',
      hallway: '/assets/cases/case-001/scenes/hallway.jpg',
      archive: '/assets/cases/case-001/scenes/archive_room.jpg'
    },
    characters: {
      linlan: '/assets/cases/case-001/characters/linlan.png',
      songhao: '/assets/cases/case-001/characters/songhao.png',
      guwen: '/assets/cases/case-001/characters/guwen.png'
    }
  },
  archiveSubtitle: 'B7 报告原件失踪 / 审查前关键三分钟',
  archiveMeta: {
    type: '核心报告转移',
    location: '北港生物研发中心 6 层',
    incidentWindow: '2026-04-02 08:10 - 08:22',
    threatLevel: 'high'
  },
  briefing: {
    intro:
      'B7 抗体稳定性报告是审查会唯一纸质原件。08:30 审查开始前，报告在 08:17 左右失踪，导致拨款评估中止。',
    objective: '在审查前时间窗口内，建立“谁在何时何地做了什么”的闭环证据链并提交结案推理。',
    sections: [
      {
        headline: '为什么重要',
        body: '报告决定项目是否继续获得季度预算。若延期责任被实锤，项目经理将被撤换。'
      },
      {
        headline: '调查目标',
        body: '识别关键谎言、标记关键证据链、填完整时间线并解释作案路径。'
      },
      {
        headline: '人员关系',
        body: '林澈掌控会议流程；宋遥掌控数据附件；顾衡掌握设备与部分门禁权限。'
      }
    ]
  },
  suspects: [
    {
      id: 'c1-s1',
      name: '林澈',
      role: '项目经理',
      portraitAsset: 'linlan',
      identity: '负责审查会主持与报告交付。',
      relationToCase: '对报告中“延期归责”段落最敏感。',
      nightAction: '称 08:10 起一直在会议室调试简报。',
      suspiciousPoint: '签到记录显示他 08:22 才首次在会议室出现。',
      motive: '若报告按原样提交，延期主责将落在他身上。',
      relations: ['与宋遥在数据解释上存在分歧', '可调用资料室与会议层门禁']
    },
    {
      id: 'c1-s2',
      name: '宋遥',
      role: '数据分析师',
      portraitAsset: 'songhao',
      identity: '负责图表与实验批次说明。',
      relationToCase: '报告的技术附件由她维护。',
      nightAction: '08:12-08:22 在工位持续处理附件并在群里更新。',
      suspiciousPoint: '08:16-08:18 聊天短暂无响应。',
      motive: '担心报告被驳回影响评优，但无直接掩盖延期需求。',
      relations: ['与林澈多次争论是否公开原始数据', '能接触电子版但无资料室纸档权限']
    },
    {
      id: 'c1-s3',
      name: '顾衡',
      role: '设备工程师',
      portraitAsset: 'guwen',
      identity: '负责机房和冷链设备巡检。',
      relationToCase: '与报告内容关联较弱，掌握部分楼层通行。',
      nightAction: '在机房处理报警，08:20 后进入电梯厅。',
      suspiciousPoint: '机房日志有补录痕迹，但可由系统延迟写入解释。',
      motive: '不希望设备异常被追责，可能回避问责但与报告失踪链条不闭合。',
      relations: ['可证明宋遥在工位区在线', '与林澈工作往来较少']
    }
  ],
  hotspots: [
    {
      id: 'c1-h1',
      label: '会议室签到台',
      region: '会议室入口',
      sceneAsset: 'main',
      description: '平板记录每次签到时间与设备编号。',
      discoveryText: '林澈首次签到时间为 08:22，晚于其“08:10 在场”口供。',
      clueIds: ['c1-c1'],
      conversationIds: ['c1-talk-1']
    },
    {
      id: 'c1-h2',
      label: '走廊监控拼帧',
      region: '盲区前后两节点',
      sceneAsset: 'hallway',
      description: '盲区前后摄像头时间轴可拼接。',
      discoveryText: '08:16 林澈携文件袋进入盲区，08:19 从资料室方向返回。',
      clueIds: ['c1-c2'],
      conversationIds: ['c1-talk-2']
    },
    {
      id: 'c1-h3',
      label: '资料室门把与碎纸机',
      region: '资料室内外',
      sceneAsset: 'archive',
      description: '门把纤维、碎纸屑均可送检。',
      discoveryText: '发现与林澈外套同源纤维，以及报告封面同批纸纤维。',
      clueIds: ['c1-c3', 'c1-c4'],
      conversationIds: []
    },
    {
      id: 'c1-h4',
      label: '协作聊天与工位终端',
      region: '工位区',
      sceneAsset: 'main',
      description: '聊天记录与终端键鼠活动可交叉验证。',
      discoveryText: '宋遥 08:18 追问“原件谁拿走了”，终端日志显示其在席。',
      clueIds: ['c1-c5'],
      conversationIds: ['c1-talk-3']
    },
    {
      id: 'c1-h5',
      label: '电梯与门禁联动',
      region: '楼层联动日志',
      sceneAsset: 'hallway',
      description: '可还原工牌跨层闭环路径。',
      discoveryText: '08:18-08:21 林澈工牌形成“会议层→资料室→会议层”闭环。',
      clueIds: ['c1-c6'],
      conversationIds: [],
      isOptional: true
    }
  ],
  conversations: [
    {
      id: 'c1-talk-1',
      suspectId: 'c1-s1',
      title: '林澈：签到解释',
      unlockedBy: 'c1-h1',
      lines: ['“我在会场里忙，忘了先按签到。”', '“08:22 只是补签，不代表我不在。”']
    },
    {
      id: 'c1-talk-2',
      suspectId: 'c1-s1',
      title: '林澈：盲区追问',
      unlockedBy: 'c1-h2',
      lines: ['“我只是去拿备用激光笔。”', '“文件袋？那是会议资料，没去资料室。”']
    },
    {
      id: 'c1-talk-3',
      suspectId: 'c1-s2',
      title: '宋遥：工位口供',
      unlockedBy: 'c1-h4',
      lines: ['“我当时在导出图表，看到桌上原件突然不见才发消息。”', '“林澈回来后才说‘先别追问，会议要开始’。”']
    }
  ],
  clues: [
    {
      id: 'c1-c1',
      category: 'record',
      title: '会议室签到平板',
      summary: '林澈 08:22 才首次签到。',
      detail: '签到日志不可回写，直接推翻“08:10 一直在会议室”的陈述。',
      relatedSuspectIds: ['c1-s1'],
      discoveredBy: 'c1-h1',
      keyEvidenceCandidate: true
    },
    {
      id: 'c1-c2',
      category: 'surveillance',
      title: '走廊监控节点摘要',
      summary: '林澈在盲区前后携带文件袋往返。',
      detail: '08:16 进入盲区时文件袋扁平，08:19 返回时袋体鼓起。',
      relatedSuspectIds: ['c1-s1'],
      discoveredBy: 'c1-h2',
      keyEvidenceCandidate: true
    },
    {
      id: 'c1-c3',
      category: 'physical',
      title: '资料室门把纤维',
      summary: '门把检出与林澈外套同源纤维。',
      detail: '采样时间 08:25，纤维新鲜附着，支持其近时段接触资料室。',
      relatedSuspectIds: ['c1-s1'],
      discoveredBy: 'c1-h3',
      keyEvidenceCandidate: true
    },
    {
      id: 'c1-c4',
      category: 'physical',
      title: '碎纸机纸纤维取样',
      summary: '检出报告封面同批纸纤维。',
      detail: '封面被处理但正文未完全销毁，符合“急促掩盖”特征。',
      relatedSuspectIds: ['c1-s1'],
      discoveredBy: 'c1-h3',
      keyEvidenceCandidate: false
    },
    {
      id: 'c1-c5',
      category: 'testimony',
      title: '协作聊天截取',
      summary: '宋遥 08:18 报告原件失踪并上传空桌照片。',
      detail: '聊天时间与终端活动一致，形成其在工位的不在场侧证。',
      relatedSuspectIds: ['c1-s2'],
      discoveredBy: 'c1-h4',
      keyEvidenceCandidate: true
    },
    {
      id: 'c1-c6',
      category: 'extra',
      title: '电梯-门禁联动日志',
      summary: '林澈工牌形成跨层闭环路径。',
      detail: '08:18 下行至资料室层，08:21 返回会议层，路径唯一且无代刷痕迹。',
      relatedSuspectIds: ['c1-s1'],
      discoveredBy: 'c1-h5',
      keyEvidenceCandidate: true
    }
  ],
  timelineSlots: [
    { id: 'c1-t1', label: '08:10-08:14', options: ['会议室', '工位区', '机房'] },
    { id: 'c1-t2', label: '08:14-08:17', options: ['会议室', '监控盲区', '工位区', '机房'] },
    { id: 'c1-t3', label: '08:17-08:22', options: ['会议室', '资料室', '电梯厅', '工位区'] }
  ],
  hints: ['林澈口供与客观记录存在首个矛盾点。', '把监控节点与跨层门禁拼成闭环。', '结论要同时解释“失踪”和“补签”。'],
  solution: {
    culpritId: 'c1-s1',
    keyLieClueId: 'c1-c1',
    methodKeywords: ['盲区', '资料室', '拿走', '补签', '闭环'],
    evidenceChain: ['c1-c1', 'c1-c2', 'c1-c6'],
    canonicalTimeline: ['08:16 林澈携文件袋离开会议区', '08:18 工牌抵达资料室层', '08:21 返回会议层并准备补签', '08:22 完成首次签到掩饰离场'],
    truthSegments: [
      '林澈利用 08:17 前后的监控盲区离开会议区，前往资料室转移原件。',
      '返回后通过 08:22 补签制造“我一直在场”的叙事。',
      '宋遥与顾衡虽各有瑕疵，但均无法构成完整“机会+动机+路径”三要素。'
    ],
    expectedTimeline: {
      'c1-s1': { 'c1-t1': '会议室', 'c1-t2': '监控盲区', 'c1-t3': '资料室' },
      'c1-s2': { 'c1-t1': '工位区', 'c1-t2': '工位区', 'c1-t3': '工位区' },
      'c1-s3': { 'c1-t1': '机房', 'c1-t2': '机房', 'c1-t3': '电梯厅' }
    }
  }
};
