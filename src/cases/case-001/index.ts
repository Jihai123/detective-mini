import type { CaseDefinition } from '../types';
import type { StageCaseConfig } from '../../stage1/types';
import case001Data from './data.json';

export const case001: CaseDefinition = {
  meta: {
    id: 'case-001',
    title: '08:17 的空档',
    difficulty: 'tutorial',
    tutorialMode: true,
    order: 1,
    unlocked: true,
  },
  config: case001Data as unknown as StageCaseConfig,
};
