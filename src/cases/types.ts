import type { StageCaseConfig } from '../stage1/types';

export type CaseMeta = {
  id: string;
  title: string;
  difficulty: 'tutorial' | 'normal' | 'hard';
  tutorialMode: boolean;
  order: number;
  unlocked: boolean;
};

export type CaseDefinition = {
  meta: CaseMeta;
  config: StageCaseConfig;
};
