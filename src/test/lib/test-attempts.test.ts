import { describe, expect, it } from 'vitest';
import { attemptQuestionIds, questionOrderForNewAttempt, scoreSubmission } from '@/lib/test-attempts';

const questions = [
  { id: 'q-sketch', type: 'SKETCH' },
  { id: 'q-num', type: 'NUMERIC' },
  { id: 'q-scq', type: 'SCQ' },
  { id: 'q-mcq', type: 'MCQ' },
];

describe('questionOrderForNewAttempt', () => {
  it('keeps every question for tests built from parts', () => {
    const ids = questionOrderForNewAttempt({ shuffleQuestions: true, questionsToShow: 2, hasParts: true }, questions);
    expect(ids).toEqual(['q-sketch', 'q-num', 'q-scq', 'q-mcq']);
  });

  it('groups flat tests by type and cuts them to questionsToShow', () => {
    const ids = questionOrderForNewAttempt({ shuffleQuestions: false, questionsToShow: 3, hasParts: false }, questions);
    expect(ids).toEqual(['q-scq', 'q-mcq', 'q-num']);
  });
});

describe('attemptQuestionIds', () => {
  it('reads the saved order and ignores anything that is not an id', () => {
    expect(attemptQuestionIds(['a', 2, 'b'])).toEqual(['a', 'b']);
  });

  it('returns null for attempts without a saved order', () => {
    expect(attemptQuestionIds(null)).toBeNull();
    expect(attemptQuestionIds([])).toBeNull();
    expect(attemptQuestionIds({})).toBeNull();
  });
});

describe('scoreSubmission', () => {
  const scq = { id: 'q1', type: 'SCQ', points: 4, correctAnswer: ['B'] };
  const num = { id: 'q2', type: 'NUMERIC', points: 4, correctAnswer: ['12'] };

  it('scores the given questions and drops answers to anything else', () => {
    const result = scoreSubmission([scq, num], { q1: 'B', q2: '7', notShown: 'A' }, { passingScore: 50, showResults: false });
    expect(result).toMatchObject({ score: 50, pointsEarned: 4, totalPoints: 8, isPassed: true, gradingStatus: 'AUTO_GRADED' });
    expect(result.answers).toEqual({ q1: 'B', q2: '7' });
  });

  it('hides the answer key unless the test shows results', () => {
    expect(scoreSubmission([scq], { q1: 'A' }, { passingScore: 50, showResults: false }).questionResults.q1.correctAnswer).toBeUndefined();
    expect(scoreSubmission([scq], { q1: 'A' }, { passingScore: 50, showResults: true }).questionResults.q1.correctAnswer).toEqual(['B']);
  });

  it('leaves sketch attempts pending review and not yet passed', () => {
    const sketch = { id: 'q3', type: 'SKETCH', points: 10, correctAnswer: null };
    const result = scoreSubmission([scq, sketch], { q1: 'B', q3: 'data:image/png;base64,xx' }, { passingScore: 50, showResults: false });
    expect(result).toMatchObject({ score: 100, totalPoints: 14, isPassed: false, gradingStatus: 'PENDING_REVIEW' });
  });
});
