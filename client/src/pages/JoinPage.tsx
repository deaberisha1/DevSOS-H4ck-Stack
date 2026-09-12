import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/brand/Logo";
import { useJoin } from "../hooks/useSession";
import { homePathFor } from "../shared/navigation";
import { validateJoin } from "../shared/validation";
import type { FieldErrors, Role } from "../shared/types";
import { USE_MOCK } from "../api/client";
import { Alert, FieldError, css } from "../components/event/UI";
import { IconArrowRight, IconUsers, IconKey } from "../components/icons";
const ROLE_CHOICES: Array<{ value: Role; label: string; hint: string }> = [
  {
    value: "PARTICIPANT",
    label: "Participant",
    hint: "Ask for help from your table",
  },
  { value: "MENTOR", label: "Mentor", hint: "Pick up requests you can answer" },
  {
    value: "ORGANIZER",
    label: "Organizer",
    hint: "Run the room and see everyone",
  },
];

export default function JoinPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mutation = useJoin();
  const form = useRef<HTMLFormElement>(null);
  const [eventCode, setCode] = useState(
    params.get("code") || params.get("eventCode") || "",
  );
  const [displayName, setName] = useState("");
  const [role, setRole] = useState<Role>("PARTICIPANT");
  const [invite, setInvite] = useState("");
  const [table, setTable] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const inviteField = role === "ORGANIZER" ? "organizerInvite" : "mentorInvite";
  useEffect(() => {
    if (Object.keys(errors).length)
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [errors]);
  return (
    <main id="main" className={css.joinPage}>
      <div className={css.joinIntro}>
        <Link to="/" aria-label="DevSOS home">
          <Logo size={42} />
        </Link>
        <div>
          <p className={css.eyebrow}>YOUR NEXT BREAKTHROUGH STARTS HERE</p>
          <h1>
            Find your event.
            <br />
            <em>Find your people.</em>
          </h1>
          <p>
            Ask a question, share what you know, and keep the whole room
            building.
          </p>
          <IconUsers size={70} />
        </div>
        <Link className={css.textLink} to="/how-it-works">
          See how DevSOS works
          <IconArrowRight size={18} />
        </Link>
      </div>
      <div className={css.joinForm}>
        <form
          ref={form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (mutation.isPending) return;
            const fields = validateJoin({
              eventCode,
              displayName,
              role,
              mentorInvite: role === "MENTOR" ? invite : "",
              organizerInvite: role === "ORGANIZER" ? invite : "",
            });
            if (table.trim().length > 30)
              fields.tableLabel = "Use at most 30 characters.";
            setErrors(fields);
            if (Object.keys(fields).length) return;
            mutation.mutate(
              {
                eventCode: eventCode.trim(),
                displayName: displayName.trim(),
                requestedRole: role,
                tableLabel: table.trim() || undefined,
                mentorInvite: role === "MENTOR" ? invite.trim() : undefined,
                organizerInvite:
                  role === "ORGANIZER" ? invite.trim() : undefined,
              },
              {
                onSuccess: (session) =>
                  navigate(homePathFor(session), { replace: true }),
                onError: (error) => setErrors(error.fieldErrors || {}),
              },
            );
          }}
        >
          <IconKey size={27} />
          <h2>Join your event</h2>
          <p className={css.muted}>Enter the code shared by your organizer.</p>
          {USE_MOCK && (
            <p className={css.demo}>
              Demo event <strong>HACKSTACK</strong> · mentor invitation{" "}
              <strong>MENTOR</strong> · organizer invitation{" "}
              <strong>ORGANIZER</strong>. Use SERVERERROR as the event code to
              preview a server failure.
            </p>
          )}
          <fieldset disabled={mutation.isPending} className={css.fields}>
            <div className={css.field}>
              <label htmlFor="eventCode">Event code</label>
              <input
                id="eventCode"
                autoComplete="off"
                value={eventCode}
                maxLength={40}
                onChange={(e) => setCode(e.target.value)}
                aria-invalid={!!errors.eventCode}
                aria-describedby={
                  errors.eventCode ? "eventCode-error" : undefined
                }
              />
              <FieldError name="eventCode" errors={errors} />
            </div>
            <div className={css.field}>
              <label htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                autoComplete="nickname"
                value={displayName}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.displayName}
                aria-describedby={
                  errors.displayName ? "displayName-error" : undefined
                }
              />
              <FieldError name="displayName" errors={errors} />
            </div>
            <fieldset className={css.roleChoice}>
              <legend>How are you joining?</legend>
              {ROLE_CHOICES.map((choice) => (
                <label key={choice.value}>
                  <input
                    type="radio"
                    name="role"
                    value={choice.value}
                    checked={role === choice.value}
                    onChange={() => {
                      setRole(choice.value);
                      setInvite("");
                      setErrors({});
                      mutation.reset();
                    }}
                  />
                  <span>
                    {choice.label}
                    <small>{choice.hint}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            {role !== "PARTICIPANT" && (
              <div className={css.field}>
                <label htmlFor={inviteField}>
                  {role === "MENTOR"
                    ? "Mentor invitation"
                    : "Organizer invitation"}
                </label>
                <input
                  id={inviteField}
                  type="password"
                  autoComplete="off"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  aria-invalid={!!errors[inviteField]}
                  aria-describedby={`invite-note ${inviteField}-error`}
                />
                <small id="invite-note">
                  {role === "MENTOR"
                    ? "Your organizer supplies this invitation."
                    : "Organizer invitations are issued with the event."}{" "}
                  Access is confirmed by the event server, never by this form.
                </small>
                <FieldError name={inviteField} errors={errors} />
              </div>
            )}
            <div className={css.field}>
              <label htmlFor="tableLabel">
                {role === "PARTICIPANT"
                  ? "Table or location"
                  : "Where to find you"}{" "}
                <span>(optional for joining)</span>
              </label>
              <input
                id="tableLabel"
                value={table}
                maxLength={30}
                onChange={(e) => setTable(e.target.value)}
                placeholder="e.g. B4"
                aria-invalid={!!errors.tableLabel}
                aria-describedby={
                  errors.tableLabel ? "tableLabel-error" : undefined
                }
              />
              <FieldError name="tableLabel" errors={errors} />
            </div>
            <button className={css.primary} type="submit">
              {mutation.isPending ? "Joining your event…" : "Join event"}
              <IconArrowRight size={18} />
            </button>
          </fieldset>
          {mutation.error && <Alert error={mutation.error} />}
          <p className={css.meta}>
            No account required. Your event session determines which screens you
            can access.
          </p>
        </form>
      </div>
    </main>
  );
}
