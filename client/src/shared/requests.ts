import type { Category, HelpRequest, Tag } from "./types";
export const CATEGORIES: readonly Category[] = [
  "Frontend",
  "Backend",
  "Git",
  "Deployment",
  "Other",
];
export function categoryOf(request: HelpRequest): Category {
  if (request.category) return request.category;
  if (request.primaryTag === "Backend" || request.primaryTag === "Database")
    return "Backend";
  if (request.primaryTag === "Git" || request.primaryTag === "Deployment")
    return request.primaryTag;
  return "Frontend";
}
export const categoryTag: Record<Category, Tag> = {
  Frontend: "UI",
  Backend: "Backend",
  Git: "Git",
  Deployment: "Deployment",
  Other: "Other",
};
export const statusText = {
  WAITING: "Waiting",
  CLAIMED: "Claimed",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
};
export function elapsed(created: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(created).getTime()) / 1000),
  );
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
export function dateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
