import {
  BookOpen,
  Video,
  ChartNoAxesColumn,
  CircleHelp,
  House,
  MessageSquareText,
  NotebookPen,
  UserCircle,
  Award,
  CalendarDays,
} from "lucide-react";

export const studentNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Live Classes", href: "/dashboard/live-classes", icon: Video },
  { label: "Community", href: "/dashboard/community", icon: MessageSquareText },
  { label: "Doubts", href: "/dashboard/doubts", icon: CircleHelp },
  { label: "Assignments", href: "/dashboard/assignments", icon: NotebookPen },
  { label: "Progress", href: "/dashboard/progress", icon: ChartNoAxesColumn },
  { label: "Certificates", href: "/dashboard/certificates", icon: Award },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
] as const;
