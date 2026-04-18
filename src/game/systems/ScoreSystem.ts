import type { CaseFile, CaseResult, InvestigationState } from '../../domain/types';

type ScoreInput = {
  caseFile: CaseFile;
  state: InvestigationState;
};

export function evaluateCase(input: ScoreInput): CaseResult {
  const { caseFile, state } = input;
  const elapsedSeconds = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));

  const culpritCorrect = state.culpritId === caseFile.solution.culpritId;
  const lieCorrect = state.keyLieClueId === caseFile.solution.keyLieClueId;
  const methodCorrect = isMethodCorrect(state.methodTheory, caseFile.solution.methodKeywords);

  const totalCells = caseFile.timelineSlots.length * caseFile.suspects.length;
  const filledCells = caseFile.suspects.reduce(
    (sum, suspect) => sum + Object.keys(state.timelineSelections[suspect.id] ?? {}).length,
    0
  );
  const completion = totalCells === 0 ? 0 : filledCells / totalCells;

  let correctCells = 0;
  caseFile.suspects.forEach((suspect) => {
    caseFile.timelineSlots.forEach((slot) => {
      const actual = state.timelineSelections[suspect.id]?.[slot.id];
      const expected = caseFile.solution.expectedTimeline[suspect.id]?.[slot.id];
      if (actual && expected && actual === expected) correctCells += 1;
    });
  });
  const accuracy = totalCells === 0 ? 0 : correctCells / totalCells;

  const chainHits = caseFile.solution.evidenceChain.filter((id) => state.selectedKeyEvidence.has(id)).length;
  const keyEvidenceScore = Math.round((chainHits / Math.max(1, caseFile.solution.evidenceChain.length)) * 15);

  const culpritScore = culpritCorrect ? 30 : 0;
  const lieScore = lieCorrect ? 20 : 0;
  const methodScore = methodCorrect ? 20 : 0;
  const timelineScore = Math.round(accuracy * 10 + completion * 5);
  const efficiency = getEfficiencyBonus(caseFile.difficulty, elapsedSeconds);

  const totalScore = culpritScore + lieScore + methodScore + keyEvidenceScore + timelineScore + efficiency;

  return {
    totalScore,
    rating: getRating(totalScore),
    elapsedSeconds,
    timelineAccuracy: accuracy,
    timelineCompletion: completion,
    correct: {
      culprit: culpritCorrect,
      lie: lieCorrect,
      method: methodCorrect
    },
    breakdown: {
      culprit: culpritScore,
      lie: lieScore,
      method: methodScore,
      keyEvidence: keyEvidenceScore,
      timeline: timelineScore,
      efficiency
    }
  };
}

function isMethodCorrect(answer: string, keywords: string[]): boolean {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return false;
  const hits = keywords.filter((k) => normalized.includes(k.toLowerCase())).length;
  return hits >= Math.min(3, keywords.length);
}

function getEfficiencyBonus(difficulty: CaseFile['difficulty'], elapsed: number): number {
  if (difficulty === 'tutorial') {
    if (elapsed <= 360) return 10;
    if (elapsed <= 540) return 6;
    return 2;
  }
  if (difficulty === 'normal') {
    if (elapsed <= 600) return 10;
    if (elapsed <= 840) return 6;
    return 2;
  }
  if (elapsed <= 900) return 10;
  if (elapsed <= 1200) return 6;
  return 2;
}

function getRating(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S';
  if (score >= 78) return 'A';
  if (score >= 66) return 'B';
  if (score >= 54) return 'C';
  return 'D';
}
