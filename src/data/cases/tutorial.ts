import type { CaseFile } from '../../domain/types';

export const tutorialCase: CaseFile = {
  id: 'tutorial-001',
  title: '鏁欑▼妗?,
  difficulty: 'tutorial',
  intro: '杩欐槸鏁欑▼妗堛€?,
  objective: '鎵惧嚭姝ｇ‘绛旀銆?,
  suspects: [
    {
      id: 's1',
      name: '鍛ㄥ矚',
      role: '琛屾斂鍔╃悊',
      profile: '璐熻矗鏁寸悊鏉愭枡銆?,
      motive: '鏈夋帴瑙︽枃浠舵満浼氥€?
    }
  ],
  clues: [
    {
      id: 'c1',
      type: 'testimony',
      title: '鍛ㄥ矚鐨勮瘉璇?,
      content: '鎴戞病鏈夎繘鍔炲叕瀹ゃ€?,
      relatedSuspectIds: ['s1'],
      unlockMode: 'initial',
      importance: 'high'
    }
  ],
  timelineSlots: [
    {
      id: 't1',
      label: '7:10',
      options: ['鍔炲叕瀹?, '璧板粖', '鏈煡']
    }
  ],
  extraClueBudget: 0,
  questions: [
    {
      id: 'q1',
      prompt: '鏄皝鎷胯蛋浜嗚瘎瀹¤〃锛?,
      type: 'single',
      options: [{ label: '鍛ㄥ矚', value: 's1' }]
    },
    {
      id: 'q2',
      prompt: '鍝潯璇佽瘝鏄叧閿皫瑷€锛?,
      type: 'single',
      options: [{ label: '鍛ㄥ矚鐨勮瘉璇?, value: 'c1' }]
    },
    {
      id: 'q3',
      prompt: '璇勫琛ㄦ槸濡備綍琚甫璧扮殑锛?,
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
    { level: 3, text: '绛旀灏辨槸鍛ㄥ矚銆? }
  ]
};
