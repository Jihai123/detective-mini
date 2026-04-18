import type { CaseFile } from '../../domain/types';

export const tutorialCase: CaseFile = {
  id: 'tutorial-001',
  title: '教学档案：评审室失页事件',
  difficulty: 'tutorial',
  archiveSubtitle: 'A-11 评审流程异常 / 纸质结论页失踪',
  archiveMeta: {
    type: '会议资料失窃',
    location: '启明设计院 A 栋 11 层',
    incidentWindow: '2026-03-11 07:20 - 07:40',
    threatLevel: 'low'
  },
  briefing: {
    intro:
      '周一 08:00 的城市更新终审前，唯一纸质结论页在会前 20 分钟消失。会议无法开始，外部评委已在路上。',
    objective: '重建会前 07:20-07:40 的行动链，确认谁转移了结论页、为何撒谎，以及如何完成转移。',
    sections: [
      {
        headline: '事件背景',
        body: '评审结论页决定项目是否进入签约阶段。若结论页缺失，项目将延期至少两周。'
      },
      {
        headline: '调查重点',
        body: '核对口供与门禁、监控、物证是否一致；优先锁定“独处窗口”。'
      },
      {
        headline: '涉事关系概览',
        body: '周岚负责纸质资料保管；陈序负责汇报；两人都急于按时开会。'
      }
    ]
  },
  suspects: [
    {
      id: 't-s1',
      name: '周岚',
      role: '行政助理',
      identity: '负责会务、门禁借卡、评审资料封装。',
      relationToCase: '最后接触资料夹的人。',
      nightAction: '07:25 后往返评审室与茶水间，称自己“全程在摆纸杯”。',
      suspiciousPoint: '门禁显示 07:28 单独进入评审室两分钟。',
      motive: '若结论页被当众宣读，她前一晚漏盖章会被追责。',
      relations: ['与陈序会前多次争执“是否按时开会”', '可独立接触评审室门禁']
    },
    {
      id: 't-s2',
      name: '陈序',
      role: '产品经理',
      identity: '负责面对外部评委的最终陈述。',
      relationToCase: '需要结论页开场，但不直接保管原件。',
      nightAction: '在走廊与客户通话，反复催促“马上开会”。',
      suspiciousPoint: '催开会态度激进，疑似回避追问。',
      motive: '项目延期会影响季度奖金，但缺乏独处操作时间。',
      relations: ['与周岚因流程拖延发生口角', '依赖行政准备纸质材料']
    }
  ],
  hotspots: [
    {
      id: 't-h1',
      label: '评审室桌面',
      region: '中央会议桌',
      description: '蓝色资料夹放在桌角，标签胶有新撕痕。',
      discoveryText: '资料夹中间页顺序完整，唯独结论页缺口整齐，像被预先抽走。',
      clueIds: ['t-c1'],
      conversationIds: []
    },
    {
      id: 't-h2',
      label: '门禁终端',
      region: '评审室门外',
      description: '刷卡终端保留最近 30 分钟记录。',
      discoveryText: '07:28-07:30 仅周岚工牌触发开门与离开。',
      clueIds: ['t-c2'],
      conversationIds: ['t-talk-1']
    },
    {
      id: 't-h3',
      label: '走廊监控节点',
      region: '茶水间拐角',
      description: '监控每 5 秒一帧，能看到手持物体轮廓。',
      discoveryText: '07:29 周岚夹着深蓝资料板离开评审室，直接进茶水间。',
      clueIds: ['t-c3'],
      conversationIds: ['t-talk-2']
    },
    {
      id: 't-h4',
      label: '茶水间回收箱',
      region: '水槽旁',
      description: '回收箱上层有刚揉皱又摊开的纸张。',
      discoveryText: '找到结论页复印件和蓝色纤维，像临时转移失败后回收。',
      clueIds: ['t-c4'],
      conversationIds: [],
      isOptional: true
    }
  ],
  conversations: [
    {
      id: 't-talk-1',
      suspectId: 't-s1',
      title: '周岚：门禁追问',
      unlockedBy: 't-h2',
      lines: ['“我只是回去确认投影线，真的没动资料。”', '“07:28 那次？就两分钟，来不及做别的。”']
    },
    {
      id: 't-talk-2',
      suspectId: 't-s2',
      title: '陈序：走廊对话',
      unlockedBy: 't-h3',
      lines: ['“我在电话里催客户别迟到，不可能进评审室。”', '“周岚出来时手里确实夹着板子，我以为是签到表。”']
    }
  ],
  clues: [
    {
      id: 't-c1',
      category: 'record',
      title: '资料夹缺页痕迹',
      summary: '结论页被完整抽离，非意外掉页。',
      detail: '缺页断口平直，夹内顺序未乱，显示操作者熟悉资料结构。',
      relatedSuspectIds: ['t-s1'],
      discoveredBy: 't-h1',
      keyEvidenceCandidate: true
    },
    {
      id: 't-c2',
      category: 'record',
      title: '评审室门禁日志',
      summary: '07:28-07:30 仅周岚进出评审室。',
      detail: '该时间段无陪同人员，无其他工牌触发门禁，直接冲突其“未再进入”口供。',
      relatedSuspectIds: ['t-s1'],
      discoveredBy: 't-h2',
      keyEvidenceCandidate: true
    },
    {
      id: 't-c3',
      category: 'surveillance',
      title: '走廊监控摘要',
      summary: '周岚带资料板离开评审室后进入茶水间。',
      detail: '画面时间戳 07:29:11，手持物与评审资料板尺寸一致。',
      relatedSuspectIds: ['t-s1'],
      discoveredBy: 't-h3',
      keyEvidenceCandidate: true
    },
    {
      id: 't-c4',
      category: 'physical',
      title: '回收箱复印件与纤维',
      summary: '找到结论页复印件与文件夹同源纤维。',
      detail: '纸面有二次折叠痕，像短时藏匿后处理失败。',
      relatedSuspectIds: ['t-s1'],
      discoveredBy: 't-h4',
      keyEvidenceCandidate: true
    }
  ],
  timelineSlots: [
    { id: 't1', label: '07:25-07:30', options: ['评审室', '茶水间', '走廊'] },
    { id: 't2', label: '07:30-07:35', options: ['评审室', '茶水间', '走廊'] }
  ],
  hints: ['优先找出谁拥有“无人同在”的两分钟。', '把口供与门禁时间逐字比对。', '监控负责补全转移路径。'],
  solution: {
    culpritId: 't-s1',
    keyLieClueId: 't-c2',
    methodKeywords: ['两分钟', '评审室', '抽走', '茶水间', '转移'],
    evidenceChain: ['t-c2', 't-c3', 't-c4'],
    canonicalTimeline: ['07:28 周岚独自进评审室', '07:29 周岚携资料板离开', '07:30 进入茶水间处理文件'],
    truthSegments: [
      '周岚为掩盖漏盖章风险，在会前窗口回评审室抽走结论页。',
      '她利用茶水间短时藏匿并尝试处理痕迹，导致复印件和纤维残留。',
      '陈序催会虽激进，但没有形成完整机会链。'
    ],
    expectedTimeline: {
      't-s1': { t1: '评审室', t2: '茶水间' },
      't-s2': { t1: '走廊', t2: '走廊' }
    }
  }
};
