import type { CaseFile } from '../../domain/types';

export const case001: CaseFile = {
  id: 'case-001',
  title: '正式案：08:17 的空档',
  difficulty: 'normal',
  intro:
    '周四 08:30，北港生物研发中心准备向审查组提交“B7 抗体稳定性报告”。报告原件在 08:17 前后离奇失踪，楼层监控刚好有 3 分钟盲区。',
  objective: '锁定拿走报告的人，识别关键谎言，并重建 08:10-08:22 的行动时间线。',
  location: '北港生物研发中心 6 层会议区、资料室与电梯厅',
  incidentTime: '08:10 - 08:22',
  background:
    '该报告决定项目能否继续拨款。若报告中的延期责任被确认，项目经理林澈将承担主要责任。会前团队成员分别在会议室、工位区和机房活动，所有人都称自己“按流程办事”。',
  suspects: [
    {
      id: 'c1-s1',
      name: '林澈',
      role: '项目经理',
      profile: '统筹审查流程，可随时进出会议区与资料室。',
      relation: '对报告内容最敏感，直接关联延期责任。',
      alibi: '称 08:10-08:25 一直在会议室准备简报，未离开。',
      suspiciousPoint: '签到平板显示他 08:22 才第一次签到。',
      motive: '希望延后审查，争取时间修改关键数据说明。'
    },
    {
      id: 'c1-s2',
      name: '宋遥',
      role: '数据分析师',
      profile: '负责报告图表核对，08:00 后在工位区导出附件。',
      relation: '报告技术内容主要由她完成。',
      alibi: '称 08:12-08:22 没离开工位，和测试同事在线沟通。',
      suspiciousPoint: '聊天记录中有 2 分钟空档未回应消息。',
      motive: '若报告被驳回会影响季度评优，但缺乏直接收益。'
    },
    {
      id: 'c1-s3',
      name: '顾衡',
      role: '设备工程师',
      profile: '负责冷柜和机房巡检，常跨楼层移动。',
      relation: '与报告内容关联较弱，但掌握部分门禁权限。',
      alibi: '称自己在 6 层机房排查报警，直到 08:24 才回会议区。',
      suspiciousPoint: '机房日志写入时间有手动补录痕迹。',
      motive: '担心设备停机责任被追问，可能尝试转移注意力。'
    }
  ],
  clues: [
    {
      id: 'c1-c1',
      type: 'testimony',
      title: '林澈口供',
      content: '“我从 08:10 就在会议室，报告一直在资料夹里，没离开过。”',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'initial',
      importance: 'high'
    },
    {
      id: 'c1-c2',
      type: 'digital',
      title: '会议室签到平板',
      content: '林澈 08:22 才完成签到；宋遥签到 08:11；顾衡无会议签到记录。',
      relatedSuspectIds: ['c1-s1', 'c1-s2', 'c1-s3'],
      unlockMode: 'initial',
      importance: 'high'
    },
    {
      id: 'c1-c3',
      type: 'timeline',
      title: '走廊监控节点',
      content: '08:16 林澈拿深灰文件袋经过监控，08:19 从盲区另一侧返回，手中袋子鼓起。',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'initial',
      importance: 'high'
    },
    {
      id: 'c1-c4',
      type: 'physical',
      title: '资料室门把纤维',
      content: '门把残留新鲜布纤维，与林澈外套袖口材质一致，检测时间为 08:25。',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'initial',
      importance: 'medium'
    },
    {
      id: 'c1-c5',
      type: 'digital',
      title: '协作聊天记录',
      content: '08:18 宋遥在群里追问“报告原件谁拿走了？”并附会议室空桌照片。',
      relatedSuspectIds: ['c1-s2'],
      unlockMode: 'initial',
      importance: 'medium'
    },
    {
      id: 'c1-c6',
      type: 'extra',
      title: '电梯与门禁联动日志',
      content: '08:18 林澈工牌触发“会议层→资料室层”，08:21 返回会议层，路径完整闭环。',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'extra',
      importance: 'high'
    },
    {
      id: 'c1-c7',
      type: 'extra',
      title: '碎纸机取样',
      content: '资料室旁碎纸机中检出报告封面的同批纸纤维，但正文未被完全销毁。',
      relatedSuspectIds: ['c1-s1'],
      unlockMode: 'extra',
      importance: 'medium'
    }
  ],
  timelineSlots: [
    { id: 'c1-t1', label: '08:10-08:14', options: ['会议室', '工位区', '机房'] },
    { id: 'c1-t2', label: '08:14-08:17', options: ['会议室', '监控盲区', '资料室'] },
    { id: 'c1-t3', label: '08:17-08:22', options: ['会议室', '资料室', '电梯厅'] }
  ],
  extraClueBudget: 2,
  questions: [
    {
      id: 'q1',
      prompt: '谁拿走了 B7 报告原件？',
      type: 'single',
      options: [
        { label: '林澈', value: 'c1-s1' },
        { label: '宋遥', value: 'c1-s2' },
        { label: '顾衡', value: 'c1-s3' }
      ]
    },
    {
      id: 'q2',
      prompt: '哪条线索最能证明关键谎言？',
      type: 'single',
      options: [
        { label: '林澈口供', value: 'c1-c1' },
        { label: '会议室签到平板', value: 'c1-c2' },
        { label: '走廊监控节点', value: 'c1-c3' },
        { label: '资料室门把纤维', value: 'c1-c4' },
        { label: '协作聊天记录', value: 'c1-c5' },
        { label: '电梯与门禁联动日志', value: 'c1-c6' }
      ]
    },
    {
      id: 'q3',
      prompt: '请描述作案方式。',
      type: 'text',
      acceptableAnswers: ['利用监控盲区去资料室拿走报告再补签到', '先离开会议室取走报告后伪装一直在场']
    }
  ],
  solution: {
    culpritId: 'c1-s1',
    keyLieClueId: 'c1-c2',
    methodAnswer: '林澈借 08:17 盲区离开会议室，去资料室拿走报告后回会场补签到制造不在场证明',
    methodKeywords: ['盲区', '离开会议室', '资料室', '拿走', '补签到'],
    expectedTimeline: {
      'c1-s1': {
        'c1-t1': '会议室',
        'c1-t2': '监控盲区',
        'c1-t3': '资料室'
      },
      'c1-s2': {
        'c1-t1': '工位区',
        'c1-t2': '工位区',
        'c1-t3': '会议室'
      },
      'c1-s3': {
        'c1-t1': '机房',
        'c1-t2': '机房',
        'c1-t3': '电梯厅'
      }
    },
    reasoning: [
      '林澈声称“全程在会议室”，但签到时间晚于其口供起点，谎言成立。',
      '监控节点与门禁联动日志能拼接出“会议室→盲区→资料室→会议室”的短时路径。',
      '物证纤维与碎纸机取样说明他在资料室处理过报告原件，其他两人缺乏同等机会链条。'
    ]
  },
  hints: [
    { level: 1, text: '先判断谁的口供与客观时间不一致。' },
    { level: 2, text: '把签到、监控、门禁按时间顺序拼起来看。' },
    { level: 3, text: '08:17 的盲区不是证据空白，而是行动窗口。' }
  ]
};
