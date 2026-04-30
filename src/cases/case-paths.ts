export function getCaseAssetPath(
  caseId: string,
  category: 'scenes' | 'characters' | 'clues' | 'audio',
  filename: string,
): string {
  return `/assets/cases/${caseId}/${category}/${filename}`;
}

export const FALLBACK_PATHS = {
  scene: '/assets/cases/case-001/scenes/scene-fallback.jpg',
  portrait: '/assets/cases/case-001/characters/portrait-fallback.png',
} as const;
