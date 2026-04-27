export type AssignmentResource = {
  title: string;
  type: string;
  detail: string;
};

export type AssignmentRubricItem = {
  label: string;
  score: string;
  weight: number;
  tone: string;
};

export type AssignmentTask = {
  slug: string;
  title: string;
  course: string;
  deadline: string;
  status: string;
  statusColor?: string;
  module: string;
  estimatedTime: string;
  points: string;
  format: string;
  submissionType: string;
  difficulty: string;
  progress: number;
  description: string;
  objective: string;
  overview: string[];
  deliverables: string[];
  checklist: string[];
  resources: AssignmentResource[];
  rubric: AssignmentRubricItem[];
  supportNote: string;
};

export const upcomingAssignments: AssignmentTask[] = [
  {
    slug: "wireframe-final-project",
    title: "Wireframe Final Project",
    course: "UI/UX Design Masterclass",
    deadline: "Today, 11:59 PM",
    status: "Priority",
    statusColor: "#ff3d00",
    module: "Module 6",
    estimatedTime: "2 hours",
    points: "100 pts",
    format: "Figma or PDF",
    submissionType: "Single upload",
    difficulty: "Advanced",
    progress: 68,
    description:
      "Create a complete low-fidelity dashboard wireframe that maps information hierarchy, actions, and navigation.",
    objective:
      "Translate a product brief into a clear wireframe system with decision-ready layout structure.",
    overview: [
      "Design a complete desktop dashboard layout for a learning product.",
      "Focus on structure, spacing, and feature grouping before visual styling.",
      "Use clean hierarchy so a reviewer can understand the flow in under 30 seconds.",
    ],
    deliverables: [
      "One desktop wireframe covering dashboard, list, and detail states",
      "A short note explaining your layout decisions",
      "Clickable flow for primary navigation",
    ],
    checklist: [
      "Primary navigation is consistent across the flow",
      "Cards and panels have a clear scanning order",
      "Call-to-action buttons are prominent and purposeful",
      "Submission includes a short rationale",
    ],
    resources: [
      { title: "Wireframe Starter Kit", type: "Figma File", detail: "Ready-to-edit layout primitives and grid templates" },
      { title: "Hierarchy Checklist", type: "PDF", detail: "Quick review list for structure and visual balance" },
      { title: "Mentor Walkthrough", type: "Video", detail: "18 min breakdown of a high-scoring sample submission" },
    ],
    rubric: [
      { label: "Information hierarchy", score: "35%", weight: 86, tone: "bg-[#38c1ff]" },
      { label: "Navigation clarity", score: "25%", weight: 74, tone: "bg-[#111827]" },
      { label: "Task flow coverage", score: "20%", weight: 68, tone: "bg-[#fec600]" },
      { label: "Presentation quality", score: "20%", weight: 80, tone: "bg-[#4caf50]" },
    ],
    supportNote:
      "Keep the frame count lean. One thoughtful flow beats multiple disconnected screens.",
  },
  {
    slug: "react-component-library",
    title: "React Component Library",
    course: "Advanced React Development",
    deadline: "Tomorrow, 8:00 PM",
    status: "Pending",
    statusColor: "#fec600",
    module: "Module 4",
    estimatedTime: "3 hours",
    points: "120 pts",
    format: "Git repo link",
    submissionType: "Repository + notes",
    difficulty: "Intermediate",
    progress: 42,
    description:
      "Build a reusable component set with buttons, cards, inputs, and a small usage demo.",
    objective:
      "Practice abstraction, consistency, and prop design in a production-style component library.",
    overview: [
      "Create reusable components with clean, predictable APIs.",
      "Document intended usage through a demo screen or README.",
      "Prioritize consistency in spacing, state handling, and variants.",
    ],
    deliverables: [
      "At least four reusable React components",
      "One demo page that showcases the library",
      "A README describing props and design decisions",
    ],
    checklist: [
      "All components accept meaningful props",
      "Interactive states are implemented",
      "The demo page reflects real usage",
      "The code is organized for reuse",
    ],
    resources: [
      { title: "Component API Guide", type: "Article", detail: "Patterns for naming props and organizing variants" },
      { title: "Starter Sandbox", type: "Repo", detail: "Minimal setup with routing and Tailwind already configured" },
      { title: "Code Review Notes", type: "Doc", detail: "Common mistakes to avoid in reusable UI systems" },
    ],
    rubric: [
      { label: "Reusability", score: "30%", weight: 78, tone: "bg-[#38c1ff]" },
      { label: "Code structure", score: "30%", weight: 82, tone: "bg-[#111827]" },
      { label: "Variant coverage", score: "20%", weight: 65, tone: "bg-[#fec600]" },
      { label: "Documentation", score: "20%", weight: 70, tone: "bg-[#4caf50]" },
    ],
    supportNote:
      "Aim for boringly reliable APIs. Clear component contracts matter more than clever abstractions.",
  },
];

export const pendingAssignments: AssignmentTask[] = [
  {
    slug: "color-theory-quiz",
    title: "Color Theory Quiz",
    course: "Typography Fundamentals",
    deadline: "April 1, 2026",
    status: "To Do",
    module: "Module 2",
    estimatedTime: "45 minutes",
    points: "40 pts",
    format: "Interactive quiz",
    submissionType: "Auto submit",
    difficulty: "Beginner",
    progress: 18,
    description:
      "Answer a timed quiz focused on contrast, harmony, hierarchy, and accessibility choices in typography.",
    objective:
      "Strengthen your decision-making around type pairings and color use in editorial and product UI.",
    overview: [
      "This task is designed to test practical color-and-type instincts.",
      "Questions are scenario-based, so read each prompt like a design brief.",
      "You only get one submission, so review each answer before finalizing.",
    ],
    deliverables: [
      "Complete the 18-question quiz",
      "Write a short reflection on two incorrect answers after submission",
      "Upload one screenshot of your final score summary",
    ],
    checklist: [
      "Attempt the quiz in one uninterrupted sitting",
      "Use the reflection prompt after reviewing your results",
      "Check contrast ratios where relevant",
      "Submit before the due date lock",
    ],
    resources: [
      { title: "Contrast Quick Guide", type: "Cheat Sheet", detail: "WCAG contrast ranges and pair examples" },
      { title: "Typography Review Deck", type: "Slides", detail: "Recap of lecture concepts tied to the quiz" },
      { title: "Practice Questions", type: "Worksheet", detail: "Warm-up prompts before the timed attempt" },
    ],
    rubric: [
      { label: "Accuracy", score: "50%", weight: 84, tone: "bg-[#38c1ff]" },
      { label: "Reflection quality", score: "20%", weight: 66, tone: "bg-[#111827]" },
      { label: "Concept retention", score: "30%", weight: 72, tone: "bg-[#fec600]" },
    ],
    supportNote:
      "Use the practice sheet once, then take the real quiz without second-screening resources.",
  },
  {
    slug: "prototype-animation",
    title: "Prototype Animation",
    course: "UI/UX Design Masterclass",
    deadline: "April 3, 2026",
    status: "In Progress",
    module: "Module 5",
    estimatedTime: "90 minutes",
    points: "80 pts",
    format: "Figma prototype link",
    submissionType: "Link + preview",
    difficulty: "Intermediate",
    progress: 57,
    description:
      "Create a short interaction prototype that demonstrates transitions, timing, and motion hierarchy.",
    objective:
      "Use motion intentionally to guide attention, support navigation, and improve interface clarity.",
    overview: [
      "Build a focused interaction flow rather than a full product prototype.",
      "Keep transitions meaningful and consistent with the product tone.",
      "Your prototype should feel deliberate, not overloaded with effects.",
    ],
    deliverables: [
      "One interaction flow with at least three connected screens",
      "Motion notes explaining easing and timing choices",
      "A shareable prototype link",
    ],
    checklist: [
      "Screen-to-screen motion is consistent",
      "Microinteractions reinforce the task goal",
      "Transition timing feels intentional",
      "Prototype link is public and functional",
    ],
    resources: [
      { title: "Motion Principles Sheet", type: "PDF", detail: "Timing, easing, and hierarchy examples" },
      { title: "Prototype Review Video", type: "Video", detail: "Mentor walkthrough of strong vs weak motion choices" },
      { title: "Interaction Prompt Pack", type: "Doc", detail: "Scenario ideas for your prototype story" },
    ],
    rubric: [
      { label: "Interaction clarity", score: "35%", weight: 80, tone: "bg-[#38c1ff]" },
      { label: "Motion quality", score: "35%", weight: 76, tone: "bg-[#111827]" },
      { label: "Narrative flow", score: "30%", weight: 69, tone: "bg-[#4caf50]" },
    ],
    supportNote:
      "If a transition does not improve clarity, remove it. Motion should explain, not decorate.",
  },
  {
    slug: "responsive-grid-layout",
    title: "Responsive Grid Layout",
    course: "Advanced React Development",
    deadline: "April 5, 2026",
    status: "To Do",
    module: "Module 3",
    estimatedTime: "2.5 hours",
    points: "90 pts",
    format: "Deployed page + repo",
    submissionType: "URL + source code",
    difficulty: "Intermediate",
    progress: 24,
    description:
      "Build a responsive card dashboard that adapts from mobile to desktop without breaking hierarchy.",
    objective:
      "Practice layout systems, breakpoint thinking, and responsiveness under realistic constraints.",
    overview: [
      "You will create one dashboard screen with adaptive grid behavior.",
      "Focus on consistent spacing and strong mobile usability.",
      "Use semantic structure and avoid layout hacks that do not scale.",
    ],
    deliverables: [
      "A deployed responsive dashboard page",
      "Source code repository",
      "Short notes describing breakpoint decisions",
    ],
    checklist: [
      "Layout reads clearly on mobile, tablet, and desktop",
      "Cards keep consistent spacing and alignment",
      "Typography scales without overlap",
      "Submission includes both URL and repo",
    ],
    resources: [
      { title: "Responsive Spacing Guide", type: "Doc", detail: "Practical breakpoint and spacing heuristics" },
      { title: "Grid Examples", type: "Repo", detail: "Reference layouts for common dashboard patterns" },
      { title: "QA Checklist", type: "PDF", detail: "Fast checks for overflow, wrapping, and card density" },
    ],
    rubric: [
      { label: "Responsive behavior", score: "40%", weight: 82, tone: "bg-[#38c1ff]" },
      { label: "Layout consistency", score: "30%", weight: 78, tone: "bg-[#111827]" },
      { label: "Implementation quality", score: "30%", weight: 74, tone: "bg-[#fec600]" },
    ],
    supportNote:
      "Design from the smallest viewport first, then let the layout earn extra space gracefully.",
  },
];

export const pastAssignments = [
  {
    title: "Intro to CSS Variables",
    course: "Web Fundamentals",
    score: "10/10",
    date: "Mar 25, 2026",
  },
  {
    title: "Figma Components",
    course: "UI/UX Design Masterclass",
    score: "8.5/10",
    date: "Mar 22, 2026",
  },
];

export const assignmentTaskSlugs = [
  ...upcomingAssignments.map((assignment) => assignment.slug),
  ...pendingAssignments.map((assignment) => assignment.slug),
];

export function getAssignmentTaskBySlug(slug: string) {
  return [...upcomingAssignments, ...pendingAssignments].find(
    (assignment) => assignment.slug === slug,
  );
}
