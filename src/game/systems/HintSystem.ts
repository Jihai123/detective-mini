import type { CaseFile, HintTier } from '../../domain/types';

export class HintSystem {
  private usedLevels: number[] = [];

  constructor(private caseFile: CaseFile) {}

  public canUseHint(): boolean {
    return this.usedLevels.length < this.caseFile.hints.length;
  }

  public getUsedHintCount(): number {
    return this.usedLevels.length;
  }

  public getNextHint(): HintTier | null {
    if (!this.canUseHint()) {
      return null;
    }

    const nextLevel = this.usedLevels.length + 1;
    const hint = this.caseFile.hints.find((h) => h.level === nextLevel);

    if (!hint) {
      return null;
    }

    this.usedLevels.push(nextLevel);
    return hint;
  }

  public reset(): void {
    this.usedLevels = [];
  }
}
