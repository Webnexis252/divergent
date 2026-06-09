import { z } from 'zod';
import { QUESTION_CATEGORY_OPTIONS } from '@/lib/test-question-sections';

/**
 * Zod validation schemas for the Divergent Classes LMS.
 * All API routes use these schemas to validate request bodies.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  phone: z.string().optional(),
  // Public registration only allows STUDENT. The API route enforces this
  // server-side regardless of what is sent, but we define it here for type safety.
  role: z.enum(['STUDENT']).default('STUDENT'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Courses ─────────────────────────────────────────────────────────────────
export const CreateCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  overviewContent: z.string().optional(),
  thumbnail: z.string().optional(),
  price: z.number().min(0).optional(),
  originalPrice: z.number().min(0).optional(),
  pricingType: z.enum(['PAID', 'FREE']).default('FREE'),
  teacherIds: z.array(z.string().cuid('Invalid teacher ID')).optional(),
  totalHours: z.number().min(0).optional().nullable(),
  lessonCount: z.number().min(0).optional().nullable(),
  courseRating: z.number().min(0).max(5).optional().nullable(),
  autoCalculateRating: z.boolean().default(true),
  enrolledStudents: z.number().min(0).optional().nullable(),
  autoUpdateEnrolled: z.boolean().default(true),
  learningOutcomes: z.any().optional(),
  features: z.any().optional(),
  testimonials: z.any().optional(),
  faqs: z.any().optional(),
  category: z.string().optional().nullable(),
  courseLevel: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  visibility: z.string().default('PUBLIC'),
  publishDate: z.string().optional().nullable().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid ISO date' }),
  emiPlans: z.array(
    z.object({
      label: z.string().min(1),
      amount: z.number().min(0),
      dueDays: z.number().int().min(0),
    })
  ).optional().nullable(),
});
export const UpdateCourseSchema = CreateCourseSchema.partial().extend({
  isPublished: z.boolean().optional(),
  teacherIds: z.array(z.string().cuid('Invalid teacher ID')).optional().nullable(),
});

export const CreateChapterSchema = z.object({
  title: z.string().min(1, 'Chapter title is required'),
  order: z.number().int().min(0).default(0),
});

export const CreateLessonSchema = z.object({
  title: z.string().min(1, 'Lesson title is required'),
  contentType: z.enum(['VIDEO', 'PDF', 'TEXT']).default('VIDEO'),
  contentUrl: z.string().url().optional(),
  bodyText: z.string().optional(),
  order: z.number().int().min(0).default(0),
  isFreePreview: z.boolean().default(false),
});

export const CreateAssignmentSchema = z.object({
  courseId: z.string().cuid('Invalid course ID').optional().nullable(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  deadline: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date string',
    }),
  points: z.number().int().min(0).default(0),
  attachmentUrl: z.string().optional().nullable(),
});

// ─── Doubts ──────────────────────────────────────────────────────────────────
export const CreateDoubtSchema = z.object({
  subject: z.string().min(3, 'Subject is required'),
  body: z.string().min(1, 'Please describe your doubt in detail'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  attachmentUrl: z.string().url().optional().nullable(),
});
export const ReplyDoubtSchema = z.object({
  body: z.string().min(1, 'Reply cannot be empty'),
  attachmentUrl: z.string().url().optional(),
});
export const AssignMentorSchema = z.object({
  mentorId: z.string().cuid('Invalid mentor ID'),
});

// ─── Community Hub ───────────────────────────────────────────────────────────
export const CreateChannelSchema = z.object({
  name: z.string().min(2, 'Channel name needs at least 2 characters'),
  description: z.string().optional(),
  type: z.enum(['TEXT', 'ANNOUNCEMENT', 'RESOURCE']).default('TEXT'),
  isPrivate: z.boolean().default(false),
});
export const CreateMessageSchema = z.object({
  body: z.string().min(1, 'Message cannot be empty'),
  attachmentUrl: z.string().url().optional(),
});

// ─── Assessment System ───────────────────────────────────────────────────────

export const CreateQuestionSchema = z.object({
  type: z.enum(['SCQ', 'MCQ', 'MULTIPLE_RESPONSE', 'SKETCH', 'NUMERIC']),
  category: z.enum(['CONCEPT', 'VISUALIZATION', 'OBSERVATION', 'PRACTICAL']),
  prompt: z.string().min(1, 'Prompt is required'),
  explanation: z.string().optional(),
  options: z.any().optional(),
  correctAnswer: z.any(),
  imageUrl: z.string().optional(),
  referenceImage: z.string().optional(),
  points: z.number().int().min(0),
  negativeMarks: z.number().min(0).default(0),
  allowPartialMarking: z.boolean().default(false),
  difficulty: z.string().optional(),
  partId: z.string().optional(),
  sectionId: z.string().optional(),
  groupId: z.string().optional(),
}).superRefine((data, ctx) => {
  const choiceTypes = ['SCQ', 'MCQ', 'MULTIPLE_RESPONSE'];
  if (choiceTypes.includes(data.type)) {
    const opts = data.options.map((o: string) => o.trim()).filter(Boolean);
    if (opts.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Choice questions need at least 2 options',
      });
    }
  }
});

export const CreateQuizSchema = z.object({
  title: z.string().min(3, 'Quiz title required'),
  passingScore: z.number().int().min(0).max(100).default(50),
  questions: z.array(CreateQuestionSchema).optional(),
});

export const SubmitQuizSchema = z.object({
  answers: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string())]),
  ),
});

// ─── Course Tests / Exams ────────────────────────────────────────────────────
export const CreateTestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  type: z.enum(['COURSE_EXAM', 'MOCK_TEST']).default('COURSE_EXAM'),
  durationMins: z.number().int().min(1, 'Duration must be at least 1 minute'),
  passingScore: z.number().int().min(0, 'Passing score must be non-negative'),
  maxAttempts: z.number().int().min(1, 'Max attempts must be at least 1'),
  chapterId: z.string().optional(),
});

export const CreateTestPartSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  durationMins: z.number().int().min(1).optional(),
  order: z.number().int().optional(),
});

export const CreateTestSectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  questionType: z.enum(['SCQ', 'MCQ', 'MULTIPLE_RESPONSE', 'SKETCH', 'NUMERIC']),
  order: z.number().int().optional(),
});

export const CreateTestQuestionGroupSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  order: z.number().int().optional(),
});

export const CreateCourseTestSchema = z.object({
  courseId: z.string().cuid('Invalid course ID'),
  chapterId: z.string().cuid('Invalid chapter ID').optional().nullable(),
  title: z.string().min(3, 'Test title must be at least 3 characters'),
  description: z.string().optional(),
  type: z
    .enum(['CHAPTER_TEST', 'COURSE_EXAM', 'MOCK_TEST', 'PLACEMENT_TEST'])
    .default('COURSE_EXAM'),
  durationMins: z
    .number()
    .int()
    .min(1, 'Duration must be at least 1 minute')
    .default(60),
  passingScore: z.number().int().min(0).max(100).default(50),
  maxAttempts: z.number().int().min(-1).default(1), // -1 = unlimited
  shuffleQuestions: z.boolean().default(true),
  showResults: z.boolean().default(true),
  questionsToShow: z.number().int().min(1).optional().nullable(),
  availableFrom: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date',
    }),
  availableUntil: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date',
    }),
});

export const UpdateCourseTestSchema = CreateCourseTestSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export const CreateTestQuestionSchema = z.object({
  type: z
    .enum(['SCQ', 'MCQ', 'SKETCH', 'NUMERIC'])
    .default('SCQ'),
  category: z
    .enum(QUESTION_CATEGORY_OPTIONS)
    .default('CONCEPT'),
  prompt: z.string().min(5, 'Question prompt is required'),
  explanation: z.string().optional(),
  options: z.array(z.string()).default([]),              // SCQ/MCQ: options list; SKETCH/NUMERIC: empty
  correctAnswer: z.union([z.string(), z.array(z.string())]).default([]), // SCQ/NUMERIC: string; MCQ: string[]; SKETCH: []
  imageUrl: z.string().optional().nullable(),
  referenceImage: z.string().optional().nullable(),     // SKETCH only: teacher's reference sketch
  points: z.number().int().min(1).default(1),
  negativeMarks: z.number().min(0).default(0),
  order: z.number().int().default(0),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
}).superRefine((data, ctx) => {
  const options = data.options.map((option) => option.trim()).filter(Boolean);
  const correctAnswers = Array.isArray(data.correctAnswer)
    ? data.correctAnswer.map((answer) => answer.trim()).filter(Boolean)
    : [data.correctAnswer.trim()].filter(Boolean);

  if (data.type === 'SCQ') {
    if (options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Single Choice questions need at least 2 options',
      });
    }
    if (correctAnswers.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctAnswer'],
        message: 'Single Choice questions must have exactly 1 correct answer',
      });
    }
  }

  if (data.type === 'MCQ') {
    if (options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Multiple Choice questions need at least 2 options',
      });
    }
    if (correctAnswers.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctAnswer'],
        message: 'Multiple Choice questions need at least 1 correct answer',
      });
    }
  }

  if (data.type === 'SCQ' || data.type === 'MCQ') {
    for (const answer of correctAnswers) {
      if (!options.includes(answer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctAnswer'],
          message: 'Correct answers must match the available options',
        });
        break;
      }
    }
  }

  if (data.type === 'NUMERIC' && correctAnswers.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['correctAnswer'],
      message: 'Numerical questions need exactly 1 correct answer',
    });
  }
});

export const StartTestSchema = z.object({
  // No body needed — we just create an attempt for the authenticated user
});

export const SubmitTestSchema = z.object({
  answers: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string())]),
  ),
  timeSpentSecs: z.number().int().min(0).optional(),
});

// ─── Progress Tracking ───────────────────────────────────────────────────────
export const UpdateLessonProgressSchema = z.object({
  isCompleted: z.boolean().optional(),
  watchTimeAdded: z.number().int().min(0).optional(), // added seconds
});

// ─── Live Classes ────────────────────────────────────────────────────────────
export const CreateLiveClassSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  startTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid start time — please provide a valid ISO date string',
    }),
  duration: z.number().int().min(5, 'Duration must be at least 5 minutes'),
  teacherId: z.string().optional(),
  // Accept empty string as "no URL provided" to avoid spurious url() failures
  meetingUrl: z
    .string()
    .url('Meeting URL must be a valid URL')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const MarkAttendanceSchema = z.object({
  status: z.enum(['JOIN', 'LEAVE']),
});

// ─── Gamification ────────────────────────────────────────────────────────────
export const CreateBadgeSchema = z.object({
  name: z.string().min(2, 'Badge name required'),
  description: z.string().min(5, 'Description required'),
  imageUrl: z.string().url().optional(),
  xpReward: z.number().int().min(0).default(0),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
export type CreateChapterInput = z.infer<typeof CreateChapterSchema>;
export type CreateLessonInput = z.infer<typeof CreateLessonSchema>;
export type CreateDoubtInput = z.infer<typeof CreateDoubtSchema>;
export type ReplyDoubtInput = z.infer<typeof ReplyDoubtSchema>;
export type AssignMentorInput = z.infer<typeof AssignMentorSchema>;
export type CreateChannelInput = z.infer<typeof CreateChannelSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type CreateQuizInput = z.infer<typeof CreateQuizSchema>;
export type SubmitQuizInput = z.infer<typeof SubmitQuizSchema>;
export type UpdateLessonProgressInput = z.infer<typeof UpdateLessonProgressSchema>;
export type CreateLiveClassInput = z.infer<typeof CreateLiveClassSchema>;
export type MarkAttendanceInput = z.infer<typeof MarkAttendanceSchema>;
export type CreateBadgeInput = z.infer<typeof CreateBadgeSchema>;
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
export type CreateCourseTestInput = z.infer<typeof CreateCourseTestSchema>;
export type UpdateCourseTestInput = z.infer<typeof UpdateCourseTestSchema>;
export type CreateTestQuestionInput = z.infer<typeof CreateTestQuestionSchema>;
export type SubmitTestInput = z.infer<typeof SubmitTestSchema>;
