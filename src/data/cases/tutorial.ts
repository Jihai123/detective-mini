import type { CaseFile } from '../../domain/types';

export const tutorialCase: CaseFile = {
  id: 'tutorial-001',
  title: '教学案：消失的评审表',
  difficulty: 'tutorial',
  intro:
    '评审会议开始前，唯一一份纸质评审表不见了。你需要在最短时间内识别关键谎言并给出结论。',
  objective: '找出拿走评审表的人、关键谎言，以及其作案方式。',
  suspects: [
    {
      id: 't-s1',
      name: '周岚',
      role: '行政助理',
      profile: '负责会议资料整理，熟悉档案柜与会场流程。',
      motive: '担心评审结果对自己不利，想拖延流程。'
    },
    {
      id: 't-s2',
      name: '陈序',
      role: '产品经理',
      profile: '会前一直在准备汇报文稿。',
      motive: '希望会议尽快开始，动机较弱。'
    }
  ],
  clues: [
    {
      id: 't-c1',
      type: 'testimony',
      title: '周岚证词',
      content: '我一直在茶水间整理纸杯，没进过会议室。',
      relatedSuspectIds: ['t-s1'],
      unlockMode: 'initial',
      importance: 'high'
    },
    {
      id: 't-c2',
      type: 'digital',
      title: '门禁记录',
      content: '07:08 周岚门卡刷开会议室门，停留 2 分钟。',
      relatedSuspectIds: ['t-s1'],
      unlockMode: 'initial',
      importance: 'high'
    },
    {
      id: 't-c3',
      type: 'physical',
      title: '茶水间垃圾桶',
      content: '发现被揉皱的评审表封页，页角有“会后归档”字样。',
      relatedSuspectIds: ['t-s1'],
      unlockMode: 'extra',
      importance: 'medium'
    }
  ],
  timelineSlots: [
    {
      id: 't-t1',
      label: '07:05-07:10',
      options: ['会议室', '茶水间', '走廊']
    }
  ],
  extraClueBudget: 1,
  questions: [
    {
      id: 'q1',
      prompt: '是谁拿走了评审表？',
      type: 'single',
      options: [
        { label: '周岚', value: 't-s1' },
        { label: '陈序', value: 't-s2' }
      ]
    },
    {
      id: 'q2',
      prompt: '哪条证据揭示了关键谎言？',
      type: 'single',
      options: [
        { label: '周岚证词', value: 't-c1' },
        { label: '门禁记录', value: 't-c2' },
        { label: '茶水间垃圾桶', value: 't-c3' }
      ]
    },
    {
      id: 'q3',
      prompt: '请简述作案方式。',
      type: 'text',
      acceptableAnswers: ['提前进入会议室拿走评审表', '拿走评审表并藏到茶水间']
    }
  ],
  solution: {
    culpritId: 't-s1',
    keyLieClueId: 't-c2',
    methodAnswer: '提前进入会议室拿走评审表并暂时藏匿',
    methodKeywords: ['提前', '会议室', '拿走', '评审表', '藏'],
    reasoning: [
      '门禁记录直接否定了“没进会议室”的说法。',
      '周岚具备接触资料与接近会议室的便利条件。',
      '额外线索显示评审表曾被临时处理并转移。'
    ]
  },
  hints: [
    { level: 1, text: '先核对嫌疑人的口供与客观记录是否一致。' },
    { level: 2, text: '重点关注“谁有机会单独接触会议室资料”。' },
    { level: 3, text: '门禁记录是本案最关键的突破口。' }
  ]
};
