import type { CaseDefinition } from '../types';
import { case001Config } from './data';

export const case001: CaseDefinition = {
  meta: {
    id: 'case-001',
    title: '08:17 的空档',
    difficulty: 'tutorial',
    tutorialMode: true,
    order: 1,
    unlocked: true,
  },
  config: case001Config,
};
