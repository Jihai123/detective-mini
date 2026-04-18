import * as Phaser from 'phaser';
import type { CaseFile } from '../../domain/types';

const ASSET_PREFIX = 'case-asset';

export type CaseAssetGroup = 'scenes' | 'characters';

export function makeCaseAssetTextureKey(caseId: string, group: CaseAssetGroup, name: string): string {
  return `${ASSET_PREFIX}:${caseId}:${group}:${name}`;
}

export function preloadCaseAssets(scene: Phaser.Scene, caseFile: CaseFile): void {
  if (!caseFile.assets) return;

  (Object.keys(caseFile.assets) as CaseAssetGroup[]).forEach((group) => {
    const groupAssets = caseFile.assets?.[group] ?? {};
    Object.entries(groupAssets).forEach(([name, path]) => {
      const key = makeCaseAssetTextureKey(caseFile.id, group, name);
      if (!scene.textures.exists(key)) {
        scene.load.image(key, path);
      }
    });
  });
}

export function getCaseAssetTextureKey(caseFile: CaseFile, group: CaseAssetGroup, name: string): string | undefined {
  const path = caseFile.assets?.[group]?.[name];
  if (!path) return undefined;
  return makeCaseAssetTextureKey(caseFile.id, group, name);
}
