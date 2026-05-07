import type { CaseDefinition } from '../types';
import type { StageCaseConfig } from '../../stage1/types';
import case002Data from './data.json';

export const case002Definition: CaseDefinition = {
  meta: {
    id: 'case-002',
    title: '08:17 的通话',
    difficulty: 'normal',
    tutorialMode: false,
    order: 2,
    unlocked: true,
  },
  config: case002Data as unknown as StageCaseConfig,
};
