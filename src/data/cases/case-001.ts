import type { CaseFile } from '../../domain/types';

export const case001: CaseFile = {
  id: 'case-001',
  title: '8鐐?7鍒嗙殑绌烘。',
  difficulty: 'normal',
  intro: '姝ｅ紡妗堜欢娴嬭瘯鐗堛€?,
  objective: '鎵惧嚭姝ｇ‘绛旀銆?,
  suspects: [
    {
      id: 's1',
      name: '鏋楀摬',
      role: '椤圭洰缁忕悊',
      profile: '璐熻矗椤圭洰鎺ㄨ繘銆?,
      motive: '鎯虫帶鍒舵姤鍛婂唴瀹广€?
    }
  ],
  clues: [
    {
      id: 'c1',
      type: 'testimony',
      title: '鏋楀摬鐨勮瘉璇?,
      content: '鎴戜竴鐩村湪浼氳瀹ゃ€?,
      relatedSuspectIds: ['s1'],
      unlockMode: 'initial',
      importance: 'high'
    }
  ],
  timelineSlots: [
    {
      id: 't1',
      label: '8:18',
      options: ['浼氳瀹?, '妗ｆ鍖?, '鏈煡']
    }
  ],
  extraClueBudget: 0,
  questions: [
    {
      id: 'q1',
      prompt: '鏄皝鎷胯蛋浜嗗疄楠屾姤鍛婏紵',
      type: 'single',
      options: [{ label: '鏋楀摬', value: 's1' }]
    },
    {
      id: 'q2',
      prompt: '鍝潯璇佽瘝鏄叧閿皫瑷€锛?,
      type: 'single',
      options: [{ label: '鏋楀摬鐨勮瘉璇?, value: 'c1' }]
    },
    {
      id: 'q3',
      prompt: '鎶ュ憡鏄浣曡甯﹁蛋鐨勶紵',
      type: 'text',
      acceptableAnswers: ['甯﹁蛋']
    }
  ],
  solution: {
    culpritId: 's1',
    keyLieClueId: 'c1',
    methodAnswer: '甯﹁蛋',
    methodKeywords: ['甯﹁蛋'],
    reasoning: ['杩欐槸涓€涓渶灏忔祴璇曟渚嬨€?]
  },
  hints: [
    { level: 1, text: '鐪嬭瘉璇嶃€? },
    { level: 2, text: '瀵规瘮绾跨储銆? },
    { level: 3, text: '绛旀灏辨槸鏋楀摬銆? }
  ]
};
