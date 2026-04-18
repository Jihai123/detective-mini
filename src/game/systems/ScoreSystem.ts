import type { CaseFile, PlayerAnswers, CaseResult } from '../../domain/types';

type ScoreInput = {
  caseFile: CaseFile;
  answers: PlayerAnswers;
  usedHints: number;
  usedExtraClues: number;
  elapsedSeconds: number;
};

export function evaluateCase(input: ScoreInput): CaseResult {
  const { caseFile, answers, usedHints, usedExtraClues, elapsedSeconds } = input;

  const culpritCorrect = answers.culpritId === caseFile.solution.culpritId;
  const lieCorrect = answers.keyLieClueId === caseFile.solution.keyLieClueId;
  const methodCorrect = isMethodAnswerCorrect(
    answers.methodAnswer ?? '',
    caseFile.solution.methodKeywords,
    caseFile.questions
  );

  const culpritScore = culpritCorrect ? 40 : 0;
  const lieScore = lieCorrect ? 20 : 0;
  const methodScore = methodCorrect ? 20 : 0;

  const timeBonus = calcTimeBonus(caseFile.difficulty, elapsedSeconds);
  const hintBonus = calcHintBonus(usedHints);
  const extraClueBonus = calcExtraClueBonus(caseFile.extraClueBudget, usedExtraClues);

  const totalScore =
    culpritScore +
    lieScore +
    methodScore +
    timeBonus +
    hintBonus +
    extraClueBonus;

  return {
    totalScore,
    rating: getRating(totalScore),
    breakdown: {
      culprit: culpritScore,
      lie: lieScore,
      method: methodScore,
      timeBonus,
      hintBonus,
      extraClueBonus
    },
    isPerfect: culpritCorrect && lieCorrect && methodCorrect && usedHints === 0,
    correct: {
      culprit: culpritCorrect,
      lie: lieCorrect,
      method: methodCorrect
    }
  };
}

function isMethodAnswerCorrect(
  answer: string,
  keywords: string[],
  questions: CaseFile['questions']
): boolean {
  const normalized = normalizeText(answer);
  const hitCount = keywords.filter((k) => normalized.includes(normalizeText(k))).length;

  if (hitCount >= Math.min(3, keywords.length)) {
    return true;
  }

  const textQuestion = questions.find((q) => q.type === 'text');
  if (textQuestion && textQuestion.type === 'text') {
    return textQuestion.acceptableAnswers.some((candidate) =>
      fuzzyIncludes(normalized, normalizeText(candidate))
    );
  }

  return false;
}

function calcTimeBonus(
  difficulty: CaseFile['difficulty'],
  elapsedSeconds: number
): number {
  if (difficulty === 'tutorial') {
    if (elapsedSeconds <= 180) return 10;
    if (elapsedSeconds <= 300) return 7;
    if (elapsedSeconds <= 420) return 4;
    return 0;
  }

  if (difficulty === 'normal') {
    if (elapsedSeconds <= 360) return 10;
    if (elapsedSeconds <= 540) return 7;
    if (elapsedSeconds <= 720) return 4;
    return 0;
  }

  if (elapsedSeconds <= 480) return 10;
  if (elapsedSeconds <= 720) return 7;
  if (elapsedSeconds <= 900) return 4;
  return 0;
}

function calcHintBonus(usedHints: number): number {
  if (usedHints <= 0) return 5;
  if (usedHints === 1) return 3;
  if (usedHints === 2) return 1;
  return 0;
}

function calcExtraClueBonus(maxBudget: number, usedExtraClues: number): number {
  if (usedExtraClues <= 0) return 5;
  if (usedExtraClues < maxBudget) return 3;
  if (usedExtraClues === maxBudget) return 1;
  return 0;
}

function getRating(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

function normalizeText(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '');
}

function fuzzyIncludes(input: string, target: string): boolean {
  return input.includes(target) || target.includes(input);
}
