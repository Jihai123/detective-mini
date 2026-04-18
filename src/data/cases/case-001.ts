import type { CaseFile } from '../../domain/types';

export const case001: CaseFile = {
  id: 'case-001',
  title: '08:17 的空档',
  difficulty: 'normal',
  intro:
    '实验报告在楼层交接前失踪。监控有盲区，证词互相矛盾。请在有限线索中锁定真相。',
  objective: '找出拿走报告的人、识别关键谎言、还原作案路径。',
  suspects: [
    {
      id: 'c1-s1',
      name: '林澈',
      role: '项目经理',
      profile: '负责项目进度，能自由进出资料室。',
      motive: '担心报告暴露延期责任，试图拖延审查。'
    },
    {
      id: 'c1-s2',
      name: '宋遥',
      role: '数据分析师',
      profile: '负责报告最终核对，8 点后在工位整理图表。',
      motive: '动机较弱，更多是流程配合方。'
    },
    {
      id: 'c1-s3',
      name: '顾衡',
      role: '设备工程师',
      profile: '负责机房巡检，行动轨迹跨越多个区域。',
      motive: '与报告结论关联不大，嫌疑中等。'
    }
  ],
  clues: [
    {
      id: 'c1-c1',
      type: 'testimony',
      title: '林澈证词',
      content: '08:10 到 08:25 我一直在会议室开会，没去资料室。',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'initial',
      importance: 'high'
    },
    {
      id: 'c1-c2',
      type: 'digital',
      title: '会议室签到平板',
      content: '林澈签到时间为 08:22。此前无签到记录。',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'initial',
      importance: 'high'
    },
    {
      id: 'c1-c3',
      type: 'timeline',
      title: '走廊监控摘要',
      content: '08:16-08:19 监控盲区前后出现林澈身影，手持文件袋。',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'initial',
      importance: 'medium'
    },
    {
      id: 'c1-c4',
      type: 'physical',
      title: '资料室门把痕迹',
      content: '检测到新近擦拭痕迹，纤维与林澈西装袖口一致。',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'extra',
      importance: 'medium'
    },
    {
      id: 'c1-c5',
      type: 'digital',
      title: '电梯门禁日志',
      content: '08:18 林澈卡片在资料室楼层触发，08:21 返回会议层。',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'extra',
      importance: 'high'
    }
  ],
  timelineSlots: [
    { id: 'c1-t1', label: '08:10-08:17', options: ['会议室', '资料室', '工位区'] },
    { id: 'c1-t2', label: '08:17-08:22', options: ['会议室', '资料室', '监控盲区'] }
  ],
  extraClueBudget: 2,
  questions: [
    {
      id: 'q1',
      prompt: '谁拿走了实验报告？',
      type: 'single',
      options: [
        { label: '林澈', value: 'c1-s1' },
        { label: '宋遥', value: 'c1-s2' },
        { label: '顾衡', value: 'c1-s3' }
      ]
    },
    {
      id: 'q2',
      prompt: '哪条证据最能证明关键谎言？',
      type: 'single',
      options: [
        { label: '林澈证词', value: 'c1-c1' },
        { label: '会议室签到平板', value: 'c1-c2' },
        { label: '走廊监控摘要', value: 'c1-c3' },
        { label: '资料室门把痕迹', value: 'c1-c4' },
        { label: '电梯门禁日志', value: 'c1-c5' }
      ]
    },
    {
      id: 'q3',
      prompt: '请描述作案方式。',
      type: 'text',
      acceptableAnswers: ['利用监控盲区拿走报告再回到会议室', '先去资料室取走报告后补签到掩饰']
    }
  ],
  solution: {
    culpritId: 'c1-s1',
    keyLieClueId: 'c1-c2',
    methodAnswer: '林澈利用 08:17 附近盲区去资料室拿走报告后回会议室补签到',
    methodKeywords: ['盲区', '资料室', '拿走', '报告', '补签到'],
    reasoning: [
      '签到平板显示林澈并非全程在会议室，其证词与客观数据冲突。',
      '监控与门禁信息拼接后形成完整移动轨迹。',
      '额外线索进一步排除他人并锁定接触痕迹。'
    ]
  },
  hints: [
    { level: 1, text: '先看“时间”是否自洽：口供与签到时间有没有冲突？' },
    { level: 2, text: '盲区前后画面与门禁日志结合能还原移动路径。' },
    { level: 3, text: '关键不是“谁有动机”，而是谁在 08:17 附近具备行动窗口。' }
  ]
};
