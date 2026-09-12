import type { Category, FieldErrors } from "./types";
import { CATEGORIES } from "./requests";
export interface ProblemDraft {
  title: string;
  details: string;
  category: Category;
  codeSnippet: string;
  tableLabel: string;
}
export function validateDraft(draft: ProblemDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.title.trim().length < 5 || draft.title.trim().length > 100)
    errors.title = "Use a title between 5 and 100 characters.";
  if (draft.details.trim().length < 20 || draft.details.trim().length > 1000)
    errors.details = "Describe the problem in 20–1,000 characters.";
  if (!CATEGORIES.includes(draft.category))
    errors.category = "Choose a category.";
  if (draft.codeSnippet.length > 5000)
    errors.codeSnippet = "Keep the snippet under 5,000 characters.";
  if (!draft.tableLabel.trim() || draft.tableLabel.trim().length > 30)
    errors.tableLabel = "Enter your table or location (up to 30 characters).";
  return errors;
}
export function validateJoin(input: {
  eventCode: string;
  displayName: string;
  role: string;
  mentorInvite: string;
  organizerInvite?: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.eventCode.trim() || input.eventCode.trim().length > 40)
    errors.eventCode = "Enter an event code (up to 40 characters).";
  if (
    input.displayName.trim().length < 2 ||
    input.displayName.trim().length > 40
  )
    errors.displayName = "Use a display name between 2 and 40 characters.";
  if (input.role === "MENTOR" && !input.mentorInvite.trim())
    errors.mentorInvite = "Enter the mentor invitation from your organizer.";
  if (input.role === "ORGANIZER" && !(input.organizerInvite ?? "").trim())
    errors.organizerInvite = "Enter the organizer invitation for this event.";
  return errors;
}
