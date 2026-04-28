export const homeAssets = {
  hero: "https://api.dicebear.com/9.x/shapes/svg?seed=b871ef08-da92-499c-a590-439bbc8af7ca",
  structured: "https://api.dicebear.com/9.x/shapes/svg?seed=95034b75-9992-4e0c-84c1-936642e21639",
  live: "https://api.dicebear.com/9.x/shapes/svg?seed=8f4b09a4-aec1-44b8-9774-9a8468bccea2",
  community: "https://api.dicebear.com/9.x/shapes/svg?seed=a19d357c-4846-4960-ae22-5a65c425bde5",
  progress: "https://api.dicebear.com/9.x/shapes/svg?seed=b3efa5c7-5873-4f2c-8ef5-b07e6100d182",
  dashboard: "https://api.dicebear.com/9.x/shapes/svg?seed=7bcda481-9b8b-469e-8e3b-3c20858e2e39",
  enroll: "https://api.dicebear.com/9.x/shapes/svg?seed=3ab5b827-d218-4c9e-8053-424f2f2e6106",
  attend: "https://api.dicebear.com/9.x/shapes/svg?seed=8ea4665a-d152-4793-ae2c-6822d21a0b6c",
  track: "https://api.dicebear.com/9.x/shapes/svg?seed=919ed21a-d30a-4bd6-8181-708ab74025fc",
} as const;

export const homeNav = [
  { label: "Programs", href: "#programs" },
  { label: "Experience", href: "#experience" },
  { label: "Workflow", href: "#workflow" },
] as const;

export const programTracks = ["UCEED", "NID", "NIFT"] as const;

export const platformHighlights = [
  {
    title: "Structured exam prep",
    description:
      "Guided modules, timed practice, and clear study sequencing so you always know what to work on next.",
    image: homeAssets.structured,
  },
  {
    title: "Live critique and mentoring",
    description:
      "Classes stay interactive with live reviews, mentor feedback, and room to ask questions while the work is still fresh.",
    image: homeAssets.live,
  },
  {
    title: "Community momentum",
    description:
      "Peers, discussions, and doubt solving keep the pace up without turning the product into noise.",
    image: homeAssets.community,
  },
  {
    title: "Progress you can actually use",
    description:
      "One dashboard for deadlines, recordings, quizzes, and streaks so prep feels coordinated instead of fragmented.",
    image: homeAssets.progress,
  },
] as const;

export const workflowSteps = [
  {
    title: "Choose the right track",
    description:
      "Start with the exam path that matches your goal, then enter a focused program instead of a generic course library.",
    image: homeAssets.enroll,
  },
  {
    title: "Show up live",
    description:
      "Attend classes, get real-time critique, and keep your weekly rhythm intact with one calendar and one classroom flow.",
    image: homeAssets.attend,
  },
  {
    title: "Measure what moves",
    description:
      "Review assignments, quiz progress, and upcoming work from the same surface so improvement stays visible.",
    image: homeAssets.track,
  },
] as const;
