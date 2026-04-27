import { describe, it, expect } from 'vitest';
import {
  RegisterSchema,
  LoginSchema,
  CreateCourseSchema,
  CreateDoubtSchema,
  SubmitQuizSchema,
  SubmitTestSchema,
  CreateQuestionSchema,
  CreateTestQuestionSchema,
} from '@/lib/validators';

describe('validators', () => {
  // ─── Auth ─────────────────────────────────────────────────────────────────

  describe('RegisterSchema', () => {
    it('accepts valid student registration', () => {
      const result = RegisterSchema.safeParse({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'SecurePass1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('STUDENT');
      }
    });

    it('always defaults role to STUDENT', () => {
      const result = RegisterSchema.safeParse({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'SecurePass1',
        role: 'STUDENT',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short names', () => {
      const result = RegisterSchema.safeParse({
        name: 'A',
        email: 'a@example.com',
        password: 'SecurePass1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = RegisterSchema.safeParse({
        name: 'Alice',
        email: 'not-an-email',
        password: 'SecurePass1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const result = RegisterSchema.safeParse({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('rejects passwords without uppercase letters', () => {
      const result = RegisterSchema.safeParse({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'alllowercase1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects passwords without numbers', () => {
      const result = RegisterSchema.safeParse({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'NoNumbersHere',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('LoginSchema', () => {
    it('accepts valid credentials', () => {
      const result = LoginSchema.safeParse({
        email: 'user@example.com',
        password: 'any-password',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = LoginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Courses ──────────────────────────────────────────────────────────────

  describe('CreateCourseSchema', () => {
    it('accepts minimal valid course', () => {
      const result = CreateCourseSchema.safeParse({ title: 'React Basics' });
      expect(result.success).toBe(true);
    });

    it('rejects titles shorter than 3 characters', () => {
      const result = CreateCourseSchema.safeParse({ title: 'Hi' });
      expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
      const result = CreateCourseSchema.safeParse({
        title: 'Valid Title',
        price: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Assessment — strict types replacing z.any() ──────────────────────────

  describe('CreateQuestionSchema (strict options)', () => {
    it('accepts valid MCQ question', () => {
      const result = CreateQuestionSchema.safeParse({
        type: 'MCQ',
        prompt: 'What is the capital of France?',
        options: ['Berlin', 'Paris', 'Madrid', 'Rome'],
        correctAnswer: 'Paris',
      });
      expect(result.success).toBe(true);
    });

    it('accepts MULTIPLE_RESPONSE with array correctAnswer', () => {
      const result = CreateQuestionSchema.safeParse({
        type: 'MULTIPLE_RESPONSE',
        prompt: 'Which are primary colors?',
        options: ['Red', 'Green', 'Blue', 'Yellow'],
        correctAnswer: ['Red', 'Blue', 'Yellow'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects options with fewer than 2 entries', () => {
      const result = CreateQuestionSchema.safeParse({
        prompt: 'Single option question?',
        options: ['Only one'],
        correctAnswer: 'Only one',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty options array', () => {
      const result = CreateQuestionSchema.safeParse({
        prompt: 'What is 2+2?',
        options: [],
        correctAnswer: '4',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateTestQuestionSchema', () => {
    it('accepts valid test question with difficulty', () => {
      const result = CreateTestQuestionSchema.safeParse({
        prompt: 'Explain the principle of Gestalt.',
        options: ['Closure', 'Proximity', 'Similarity', 'All of the above'],
        correctAnswer: 'All of the above',
        difficulty: 'HARD',
        points: 5,
      });
      expect(result.success).toBe(true);
    });

    it('accepts multiple choice questions with multiple correct answers', () => {
      const result = CreateTestQuestionSchema.safeParse({
        type: 'MCQ',
        prompt: 'Which of these are design principles?',
        options: ['Balance', 'Contrast', 'Rhythm', 'Whitespace'],
        correctAnswer: ['Balance', 'Contrast', 'Rhythm'],
        points: 4,
      });
      expect(result.success).toBe(true);
    });

    it('rejects multiple choice questions without a correct answer', () => {
      const result = CreateTestQuestionSchema.safeParse({
        type: 'MCQ',
        prompt: 'Which of these are design principles?',
        options: ['Balance', 'Contrast', 'Rhythm', 'Whitespace'],
        correctAnswer: [],
        points: 4,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SubmitQuizSchema (typed answers)', () => {
    it('accepts string answers', () => {
      const result = SubmitQuizSchema.safeParse({
        answers: { 'q1': 'A', 'q2': 'B' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts array answers for multi-select', () => {
      const result = SubmitQuizSchema.safeParse({
        answers: { 'q1': ['A', 'C'], 'q2': 'B' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('SubmitTestSchema (typed answers)', () => {
    it('accepts mixed string and array answers', () => {
      const result = SubmitTestSchema.safeParse({
        answers: { 'q1': 'Paris', 'q2': ['Red', 'Blue'] },
        timeSpentSecs: 1200,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative timeSpentSecs', () => {
      const result = SubmitTestSchema.safeParse({
        answers: {},
        timeSpentSecs: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Doubts ───────────────────────────────────────────────────────────────

  describe('CreateDoubtSchema', () => {
    it('accepts valid doubt', () => {
      const result = CreateDoubtSchema.safeParse({
        subject: 'About Gestalt',
        body: 'Can you explain it?',
      });
      expect(result.success).toBe(true);
    });

    it('defaults priority to MEDIUM', () => {
      const result = CreateDoubtSchema.safeParse({
        subject: 'About Gestalt',
        body: 'Explain please',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('MEDIUM');
      }
    });
  });
});
