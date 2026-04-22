import { case001Config } from '../data/cases/case-001';
import type { ConditionExpr, DialogueNode, HotspotConfig, StageCaseConfig } from './types';

function validateCondition(condition: ConditionExpr | undefined, caseId: string, field: string): void {
  if (!condition) return;
  if (Array.isArray(condition)) return;
  if ('op' in condition) {
    if (condition.op !== 'OR' || !Array.isArray(condition.conditions)) throw new Error(`${caseId}: ${field} 条件格式非法`);
    return;
  }
  if (!Array.isArray(condition.or)) throw new Error(`${caseId}: ${field} 兼容条件格式非法`);
}

function validateHotspot(hotspot: HotspotConfig, caseId: string): void {
  if (!hotspot.id || !hotspot.label || !hotspot.sceneId) throw new Error(`${caseId}: hotspot 字段缺失`);
  if (hotspot.positionMode !== 'percent') throw new Error(`${caseId}: hotspot.positionMode 仅支持 percent`);
  if (typeof hotspot.position?.x !== 'number' || typeof hotspot.position?.y !== 'number') throw new Error(`${caseId}: hotspot.position 缺失`);
  validateCondition(hotspot.unlockCondition, caseId, `hotspot ${hotspot.id} unlockCondition`);
  if (!Array.isArray(hotspot.onInteract) || hotspot.onInteract.length === 0) throw new Error(`${caseId}: hotspot ${hotspot.id} 缺少 onInteract`);
}

function validateDialogueNode(node: DialogueNode, caseId: string): void {
  if (!node.id || !node.characterId || !Array.isArray(node.lines) || !Array.isArray(node.options)) throw new Error(`${caseId}: dialogueNode 字段缺失`);
  validateCondition(node.condition, caseId, `dialogueNode ${node.id} condition`);
  validateCondition(node.unlockCondition, caseId, `dialogueNode ${node.id} unlockCondition`);
}

export function validateCaseConfig(input: unknown): asserts input is StageCaseConfig {
  if (!input || typeof input !== 'object') throw new Error('案件配置必须为对象');
  const c = input as Partial<StageCaseConfig>;
  if (!c.id || !c.title || !c.summary || !c.timeRange || !c.location) throw new Error('案件基础字段缺失');
  if (!Array.isArray(c.scenes) || !Array.isArray(c.clues) || !Array.isArray(c.characters) || !Array.isArray(c.dialogueNodes)) throw new Error(`${c.id}: 列表字段缺失`);
  if (!c.confrontation || !Array.isArray(c.confrontation.rounds)) throw new Error(`${c.id}: confrontation 缺失`);
  if (!Array.isArray(c.timelineSlots) || !c.submission || !Array.isArray(c.truthReplay)) throw new Error(`${c.id}: 阶段6字段缺失`);

  c.scenes.forEach((scene) => {
    if (!scene.id || !scene.background || !scene.label) throw new Error(`${c.id}: scene 缺少 id/label/background`);
    validateCondition(scene.unlockCondition, c.id!, `scene ${scene.id} unlockCondition`);
    scene.hotspots.forEach((hotspot) => validateHotspot(hotspot, c.id!));
  });

  c.dialogueNodes.forEach((node) => validateDialogueNode(node, c.id!));
  c.confrontation.rounds.forEach((round) => {
    if (!round.id || !Array.isArray(round.sentences) || round.sentences.length === 0) throw new Error(`${c.id}: confrontation round 字段缺失`);
  });
}

export function loadCaseConfig(caseId: string): StageCaseConfig {
  const map: Record<string, unknown> = {
    [case001Config.id]: case001Config,
  };
  const selected = map[caseId] ?? case001Config;
  validateCaseConfig(selected);
  return selected;
}
