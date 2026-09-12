import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import type { HelpRequest } from "../../shared/types";
import {
  categoryOf,
  dateTime,
  elapsed,
  statusText,
} from "../../shared/requests";
import { useEventSession, useRequestAction } from "../../hooks/useEvent";
import { IconArrowRight, IconClock } from "../icons";
import css from "./Event.module.css";
export { css };
export function message(error: unknown) {
  return error instanceof ApiError
    ? error.code === "ACTIVE_REQUEST"
      ? error.message
      : error.userMessage
    : "Something went wrong. Please try again.";
}
export function Alert({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div role="alert" className={css.error}>
      <p>{message(error)}</p>
      {retry && (
        <button type="button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading({ text = "Loading your event…" }: { text?: string }) {
  return (
    <div className={css.empty} role="status">
      <span className={css.spinner} />
      <p>{text}</p>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={css.empty}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Status({ request }: { request: HelpRequest }) {
  return (
    <span className={css.badge} data-status={request.status}>
      {statusText[request.status]}
    </span>
  );
}
export function FieldError({
  name,
  errors,
}: {
  name: string;
  errors: Record<string, string>;
}) {
  return errors[name] ? (
    <span className={css.fieldError} id={`${name}-error`}>
      {errors[name]}
    </span>
  ) : null;
}
export function RequestActions({ request }: { request: HelpRequest }) {
  const s = useEventSession();
  const mutation = useRequestAction();
  const active = ["WAITING", "CLAIMED", "IN_PROGRESS"].includes(request.status);
  const own = request.requesterId === s.memberId;
  const assigned = request.mentorId === s.memberId;
  const organizer = s.role === "ORGANIZER";
  const actions: Array<{
    action: "claim" | "start" | "resolve" | "release" | "cancel";
    label: string;
  }> = [];
  if (s.eventStatus === "OPEN") {
    if (s.role === "MENTOR" && request.status === "WAITING")
      actions.push({ action: "claim", label: "Claim request" });
    if (
      ((assigned && s.role === "MENTOR") || organizer) &&
      request.status === "CLAIMED"
    )
      actions.push({ action: "start", label: "Start helping" });
    if (
      (assigned && s.role === "MENTOR" && request.status === "IN_PROGRESS") ||
      (organizer && active)
    )
      actions.push({ action: "resolve", label: "Resolve request" });
    if (
      ((assigned && s.role === "MENTOR") || organizer) &&
      ["CLAIMED", "IN_PROGRESS"].includes(request.status)
    )
      actions.push({ action: "release", label: "Release request" });
    if (
      (s.role === "PARTICIPANT" && own && request.status === "WAITING") ||
      (organizer && active)
    )
      actions.push({ action: "cancel", label: "Cancel request" });
  }
  return (
    <>
      <div className={css.actions}>
        {actions.map(({ action, label }) => (
          <button
            type="button"
            className={
              action === "cancel" || action === "release"
                ? css.secondary
                : css.primary
            }
            key={action}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ request, action })}
          >
            {mutation.isPending && mutation.variables?.action === action
              ? "Updating…"
              : label}
          </button>
        ))}
      </div>
      {mutation.error && <Alert error={mutation.error} />}
      <span role="status" className={css.success}>
        {mutation.isSuccess ? "Request updated." : ""}
      </span>
    </>
  );
}
export function RequestCard({
  request,
  mentor = false,
}: {
  request: HelpRequest;
  mentor?: boolean;
}) {
  const s = useEventSession();
  return (
    <article className={css.card}>
      <div className={css.row}>
        <span className={css.eyebrow}>{categoryOf(request)}</span>
        <Status request={request} />
      </div>
      <h2>
        <Link
          to={`/event/${encodeURIComponent(s.eventId)}/requests/${encodeURIComponent(request.id)}`}
        >
          {request.title}
        </Link>
      </h2>
      <p className={css.meta}>
        {mentor
          ? `${request.requesterName} · Table ${request.tableLabel}`
          : `Created ${dateTime(request.createdAt)}`}
      </p>
      {request.mentorName && (
        <p className={css.meta}>Mentor: {request.mentorName}</p>
      )}
      {mentor && request.status === "WAITING" && (
        <p className={css.meta}>
          <IconClock size={15} /> Waiting {elapsed(request.createdAt)}
        </p>
      )}
      {mentor ? (
        <RequestActions request={request} />
      ) : (
        <Link
          className={css.textLink}
          to={`/event/${encodeURIComponent(s.eventId)}/requests/${encodeURIComponent(request.id)}`}
        >
          View request
          <IconArrowRight size={16} />
        </Link>
      )}
    </article>
  );
}
