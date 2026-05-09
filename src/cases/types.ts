import type { StageCaseConfig } from '../stage1/types';

export type CaseMeta = {
  id: string;
  title: string;
  difficulty: 'tutorial' | 'normal' | 'hard';
  tutorialMode: boolean;
  order: number;
  unlocked: boolean;
  // T2.8.1: selector card visual fields
  hero?: {
    image: string;
    category: 'scenes' | 'characters' | 'clues';
    altText?: string;
  };
  tagline?: string;
};

export type CaseDefinition = {
  meta: CaseMeta;
  config?: StageCaseConfig;
};
