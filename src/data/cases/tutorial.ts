import type { CaseFile } from '../../domain/types';

export const tutorialCase: CaseFile = {
  id: 'tutorial-001',
  title: '教学案：评审室里少了一页结论',
  difficulty: 'tutorial',
  intro:
    '周一早晨 07:30，启明设计院 A 栋 11 层评审室。城市更新项目要在 08:00 对外汇报，纸质评审表最后一页却在会前消失，会议被迫中断。',
  objective: '找出拿走评审结论页的人、识别关键谎言，并说明她如何转移文件。',
  location: '启明设计院 A 栋 11 层评审室与茶水间',
  incidentTime: '07:20 - 07:40',
  background:
    '这份评审表只打印一份，包含项目去留意见。若在会上被读出，行政助理周岚负责的资料归档失误将被追责。两名当事人都声称自己忙于会前准备，没人碰过资料夹。',
  suspects: [
    {
      id: 't-s1',
      name: '周岚',
      role: '行政助理',
      profile: '负责会议资料收发，熟悉评审室钥匙和归档流程。',
      relation: '直接保管纸质资料，是最后一位接触资料夹的人。',
      alibi: '称 07:25 后一直在茶水间摆放纸杯，没有再进评审室。',
      suspiciousPoint: '门禁显示她在 07:28 曾独自进出评审室 2 分钟。',
      motive: '担心结论页暴露自己前一晚漏盖章，想争取补救时间。'
    },
    {
      id: 't-s2',
      name: '陈序',
      role: '产品经理',
      profile: '负责 08:00 的现场汇报，手里有电子备份。',
      relation: '需要结论页开场，但并不负责纸质原件。',
      alibi: '称自己一直在走廊与客户通话，07:30 才进入评审室。',
      suspiciousPoint: '曾催促会务“快点开会”，态度急躁。',
      motive: '希望按时开会，动机偏弱。'
    }
  ],
  clues: [
    {
      id: 't-c1',
      type: 'testimony',
      title: '周岚口供记录',
      content: '“我从 07:25 到开会前都在茶水间，没再进评审室。”',
      relatedSuspectIds: ['t-s1'],
      unlockMode: 'initial',
      importance: 'high'
    },
    {
      id: 't-c2',
      type: 'digital',
      title: '评审室门禁日志',
      content: '07:28 周岚工牌刷开评审室门，07:30 再次刷卡离开，期间无他人进入。',
      relatedSuspectIds: ['t-s1'],
      unlockMode: 'initial',
      importance: 'high'
    },
    {
      id: 't-c3',
      type: 'physical',
      title: '茶水间回收桶',
      content: '回收桶最上层有被揉皱又展开的结论页复印件，边缘沾到同款蓝色文件夹纤维。',
      relatedSuspectIds: ['t-s1'],
      unlockMode: 'extra',
      importance: 'medium'
    },
    {
      id: 't-c4',
      type: 'timeline',
      title: '走廊监控截帧',
      content: '07:29 周岚从评审室出来时手里夹着深蓝色资料板，之后直接进入茶水间。',
      relatedSuspectIds: ['t-s1'],
      unlockMode: 'initial',
      importance: 'medium'
    }
  ],
  timelineSlots: [
    {
      id: 't-t1',
      label: '07:25-07:30',
      options: ['评审室', '茶水间', '走廊']
    },
    {
      id: 't-t2',
      label: '07:30-07:35',
      options: ['评审室', '茶水间', '走廊']
    }
  ],
  extraClueBudget: 1,
  questions: [
    {
      id: 'q1',
      prompt: '谁转移了评审结论页？',
      type: 'single',
      options: [
        { label: '周岚', value: 't-s1' },
        { label: '陈序', value: 't-s2' }
      ]
    },
    {
      id: 'q2',
      prompt: '哪条线索直接击破关键谎言？',
      type: 'single',
      options: [
        { label: '周岚口供记录', value: 't-c1' },
        { label: '评审室门禁日志', value: 't-c2' },
        { label: '茶水间回收桶', value: 't-c3' },
        { label: '走廊监控截帧', value: 't-c4' }
      ]
    },
    {
      id: 'q3',
      prompt: '请简述作案方式。',
      type: 'text',
      acceptableAnswers: ['先进评审室抽走结论页再藏到茶水间', '借短时间回到评审室取走纸张后转移']
    }
  ],
  solution: {
    culpritId: 't-s1',
    keyLieClueId: 't-c2',
    methodAnswer: '周岚趁会前空档回评审室抽走结论页并在茶水间暂时藏匿',
    methodKeywords: ['空档', '评审室', '抽走', '结论页', '茶水间'],
    expectedTimeline: {
      't-s1': {
        't-t1': '评审室',
        't-t2': '茶水间'
      },
      't-s2': {
        't-t1': '走廊',
        't-t2': '走廊'
      }
    },
    reasoning: [
      '门禁日志与口供发生直接冲突，周岚并非全程在茶水间。',
      '监控截帧显示她离开评审室后马上进入茶水间，具备转移文件路径。',
      '回收桶中的复印件说明文件被临时处理过，符合“先拿走再藏匿”的行为逻辑。'
    ]
  },
  hints: [
    { level: 1, text: '先核对“她说自己在哪”与门禁记录是否一致。' },
    { level: 2, text: '会前 07:28 这两分钟是本案唯一无人同在的窗口。' },
    { level: 3, text: '关键线索在门禁日志，额外线索只负责补强路径。' }
  ]
};
