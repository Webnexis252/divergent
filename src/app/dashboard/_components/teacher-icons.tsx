"use client";

import {
  CalendarDays,
  ChartNoAxesColumn,
  CircleCheck,
  CircleHelp,
  Clock,
  House,
  Library,
  MessageSquareText,
  NotebookPen,
  PenTool,
  Reply,
  Settings,
  Star,
  TriangleAlert,
  UserCircle,
  Users,
  Video,
} from "lucide-react";

/**
 * Teacher dashboard icons. All come from Lucide, the same set as the rest of
 * the app, and use the same glyphs as the student sidebar for shared concepts
 * (Dashboard, Calendar, Doubts, Assignments, ...).
 */

type IconProps = { className?: string };

export function DashboardIcon({ className }: IconProps) {
  return <House className={className} />;
}

export function DoubtIcon({ className }: IconProps) {
  return <CircleHelp className={className} />;
}

export function ClassControlIcon({ className }: IconProps) {
  return <Video className={className} />;
}

export function AnalyticsIcon({ className }: IconProps) {
  return <ChartNoAxesColumn className={className} />;
}

export function ProfileIcon({ className }: IconProps) {
  return <UserCircle className={className} />;
}

export function StatIcon({
  icon,
  className,
}: {
  icon: "clock" | "star" | "students" | "resolve";
  className?: string;
}) {
  if (icon === "clock") return <Clock className={className} />;
  if (icon === "star") return <Star className={className} />;
  if (icon === "students") return <Users className={className} />;
  return <CircleCheck className={className} />;
}

export function AssignmentsIcon({ className }: IconProps) {
  return <NotebookPen className={className} />;
}

export function SketchIcon({ className }: IconProps) {
  return <PenTool className={className} />;
}

export function ResourcesIcon({ className }: IconProps) {
  return <Library className={className} />;
}

export function CalendarIcon({ className }: IconProps) {
  return <CalendarDays className={className} />;
}

export function CommunityIcon({ className }: IconProps) {
  return <MessageSquareText className={className} />;
}

export function SettingsIcon({ className }: IconProps) {
  return <Settings className={className} />;
}

export function SidebarNavIcon({
  icon,
  className,
}: {
  icon: "dashboard" | "calendar" | "doubts" | "classes" | "assignments" | "analytics" | "profile" | "sketch" | "resources" | "community" | "settings";
  className?: string;
}) {
  if (icon === "calendar") return <CalendarIcon className={className} />;
  if (icon === "doubts") return <DoubtIcon className={className} />;
  if (icon === "classes") return <ClassControlIcon className={className} />;
  if (icon === "assignments") return <AssignmentsIcon className={className} />;
  if (icon === "analytics") return <AnalyticsIcon className={className} />;
  if (icon === "profile") return <ProfileIcon className={className} />;
  if (icon === "sketch") return <SketchIcon className={className} />;
  if (icon === "resources") return <ResourcesIcon className={className} />;
  if (icon === "community") return <CommunityIcon className={className} />;
  if (icon === "settings") return <SettingsIcon className={className} />;
  return <DashboardIcon className={className} />;
}

export function StudentsIcon() {
  return <Users className="h-3 w-3 text-[#8b8b8b]" />;
}

export function ReplyIcon() {
  return <Reply className="h-4 w-4 text-[#22c55e]" />;
}

export function WarningIcon() {
  return <TriangleAlert className="h-4 w-4 text-[#f59e0b]" />;
}
