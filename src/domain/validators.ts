import type { CaseFile } from './types';

export function validateCaseFile(caseFile: CaseFile): string[] {
  const errors: string[] = [];

  if (!caseFile.id.trim()) errors.push('case.id 不能为空');
  if (!caseFile.title.trim()) errors.push(`${caseFile.id}: title 不能为空`);
  if (caseFile.assets && !caseFile.assets.scenes.main) errors.push(`${caseFile.id}: assets.scenes.main 不能为空`);
  if (caseFile.suspects.length === 0) errors.push(`${caseFile.id}: suspects 不能为空`);
  if (caseFile.hotspots.length === 0) errors.push(`${caseFile.id}: hotspots 不能为空`);
  if (caseFile.clues.length === 0) errors.push(`${caseFile.id}: clues 不能为空`);
  if (caseFile.timelineSlots.length === 0) errors.push(`${caseFile.id}: timelineSlots 不能为空`);

  const suspectIds = new Set(caseFile.suspects.map((s) => s.id));
  if (!suspectIds.has(caseFile.solution.culpritId)) {
    errors.push(`${caseFile.id}: solution.culpritId 未指向有效嫌疑人`);
  }

  const clueIds = new Set(caseFile.clues.map((c) => c.id));
  if (!clueIds.has(caseFile.solution.keyLieClueId)) {
    errors.push(`${caseFile.id}: solution.keyLieClueId 未指向有效线索`);
  }

  caseFile.hotspots.forEach((hotspot) => {
    if (hotspot.sceneAsset && !caseFile.assets?.scenes?.[hotspot.sceneAsset]) {
      errors.push(`${caseFile.id}: hotspot ${hotspot.id} 指定的 sceneAsset ${hotspot.sceneAsset} 不存在`);
    }
    hotspot.clueIds.forEach((clueId) => {
      if (!clueIds.has(clueId)) {
        errors.push(`${caseFile.id}: hotspot ${hotspot.id} 引用了不存在的 clue ${clueId}`);
      }
    });
  });

  caseFile.suspects.forEach((suspect) => {
    if (suspect.portraitAsset && !caseFile.assets?.characters?.[suspect.portraitAsset]) {
      errors.push(`${caseFile.id}: suspect ${suspect.id} 指定的 portraitAsset ${suspect.portraitAsset} 不存在`);
    }
  });

  return errors;
}
