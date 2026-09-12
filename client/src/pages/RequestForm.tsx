import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRequest } from "../api/requests";
import { assist, safeResourceUrl } from "../api/assist";
import { ApiError, USE_MOCK } from "../api/client";
import { useEventSession, eventKey } from "../hooks/useEvent";
import { CATEGORIES, categoryTag } from "../shared/requests";
import { validateDraft } from "../shared/validation";
import type { ProblemDraft } from "../shared/validation";
import type { Category, FieldErrors } from "../shared/types";
import { Alert, FieldError, css } from "../components/event/UI";
import { IconBrain, IconArrowRight } from "../components/icons";
export default function RequestForm() {
  const session = useEventSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const form = useRef<HTMLFormElement>(null);
  const submission = useRef(crypto.randomUUID());
  const [draft, setDraft] = useState<ProblemDraft>({
    title: "",
    details: "",
    category: "Frontend",
    codeSnippet: "",
    tableLabel: session.tableLabel || "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const send = useMutation({
    mutationFn: () =>
      createRequest(session.eventId, {
        ...draft,
        title: draft.title.trim(),
        details: draft.details.trim(),
        clientRequestId: submission.current,
        primaryTag: categoryTag[draft.category],
        tags: [],
      }),
    onSuccess: (request) => {
      void qc.invalidateQueries({ queryKey: eventKey(session.eventId) });
      navigate(`/event/${session.eventId}/requests/${request.id}`, {
        replace: true,
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) setErrors(error.fieldErrors || {});
    },
  });
  const ai = useMutation({ mutationFn: () => assist(session.eventId, draft) });
  useEffect(() => {
    if (Object.keys(errors).length)
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [errors]);
  const update = (field: keyof ProblemDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    ai.reset();
  };
  const validate = () => {
    const result = validateDraft(draft);
    setErrors(result);
    return !Object.keys(result).length;
  };
  const busy = send.isPending || ai.isPending;
  if (session.eventStatus === "CLOSED")
    return (
      <div className={css.empty}>
        <h1>This event is closed.</h1>
        <Link to={`/event/${session.eventId}`}>Back to your requests</Link>
      </div>
    );
  return (
    <>
      <div className={css.pageHeading}>
        <div>
          <p className={css.eyebrow}>LET'S GET YOU UNSTUCK</p>
          <h1>What's the blocker?</h1>
          <p>A little context gives your mentor a head start.</p>
        </div>
        <Link className={css.textLink} to={`/event/${session.eventId}`}>
          Back to my requests
        </Link>
      </div>
      <div className={css.formGrid}>
        <form
          className={css.panel}
          ref={form}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && validate()) send.mutate();
          }}
        >
          <fieldset className={css.fields} disabled={busy}>
            <div className={css.field}>
              <label htmlFor="title">Request title</label>
              <input
                id="title"
                maxLength={100}
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. API returns 401 in the browser"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "title-error" : undefined}
              />
              <FieldError name="title" errors={errors} />
            </div>
            <div className={css.field}>
              <label htmlFor="details">Problem description</label>
              <textarea
                id="details"
                rows={6}
                maxLength={1000}
                value={draft.details}
                onChange={(e) => update("details", e.target.value)}
                placeholder="What did you expect? What happened instead? What have you tried?"
                aria-invalid={!!errors.details}
                aria-describedby={errors.details ? "details-error" : undefined}
              />
              <FieldError name="details" errors={errors} />
            </div>
            <div className={css.field}>
              <label htmlFor="category">Technology / category</label>
              <select
                id="category"
                value={draft.category}
                onChange={(e) => update("category", e.target.value as Category)}
                aria-invalid={!!errors.category}
                aria-describedby={
                  errors.category ? "category-error" : undefined
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <FieldError name="category" errors={errors} />
            </div>
            <div className={css.field}>
              <label htmlFor="tableLabel">Your table or location</label>
              <input
                id="tableLabel"
                value={draft.tableLabel}
                maxLength={30}
                onChange={(e) => update("tableLabel", e.target.value)}
                aria-invalid={!!errors.tableLabel}
                aria-describedby={
                  errors.tableLabel ? "tableLabel-error" : undefined
                }
              />
              <FieldError name="tableLabel" errors={errors} />
            </div>
            <div className={css.field}>
              <label htmlFor="codeSnippet">
                Code snippet <span>(optional)</span>
              </label>
              <textarea
                id="codeSnippet"
                className={css.codeInput}
                rows={5}
                maxLength={5000}
                spellCheck={false}
                value={draft.codeSnippet}
                onChange={(e) => update("codeSnippet", e.target.value)}
                aria-invalid={!!errors.codeSnippet}
                aria-describedby="snippet-note codeSnippet-error"
              />
              <small id="snippet-note">
                Include the smallest relevant example. Remove secrets and
                credentials before sharing.
              </small>
              <FieldError name="codeSnippet" errors={errors} />
            </div>
            <div className={css.actions}>
              <button
                type="button"
                className={css.secondary}
                onClick={() => {
                  if (validate()) ai.mutate();
                }}
              >
                <IconBrain size={18} />
                {ai.isPending ? "Finding suggestions…" : "Try AI help"}
              </button>
              <button className={css.primary} type="submit">
                {send.isPending ? "Submitting…" : "Ask a mentor"}
                <IconArrowRight size={18} />
              </button>
            </div>
          </fieldset>
          {send.error && <Alert error={send.error} />}
          <p className={css.meta}>
            AI help is optional. You can ask a mentor directly.
          </p>
        </form>
        <aside className={css.aiPanel}>
          <IconBrain size={30} />
          <h2>A starting point, if you want one.</h2>
          <p>
            AI suggestions can help you investigate. Your draft stays here,
            ready to send to a mentor.
          </p>
          {USE_MOCK && (
            <p className={css.demo}>
              Simulated AI responses · No model is called in demo mode.
            </p>
          )}
          {ai.isPending && <p role="status">Looking through your draft…</p>}
          {ai.error && (
            <Alert
              error={ai.error}
              retry={() => {
                if (validate()) ai.mutate();
              }}
            />
          )}
          {ai.data && (
            <div aria-live="polite">
              {ai.data.simulated && !USE_MOCK && (
                <p className={css.demo}>
                  Simulated response from the assist service.
                </p>
              )}
              <h3>Things to try</h3>
              <ol>
                {ai.data.suggestions.slice(0, 3).map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ol>
              {ai.data.resources?.map((resource, i) => {
                const href = safeResourceUrl(resource.url);
                return href ? (
                  <a
                    className={css.resource}
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {resource.title}
                    <IconArrowRight size={15} />
                  </a>
                ) : null;
              })}
              <div className={css.actions}>
                <button
                  type="button"
                  className={css.secondary}
                  disabled={busy}
                  onClick={() =>
                    navigate(`/event/${session.eventId}?help=ai-resolved`)
                  }
                >
                  This helped
                </button>
                <button
                  type="button"
                  className={css.primary}
                  disabled={busy}
                  onClick={() => {
                    if (validate()) send.mutate();
                  }}
                >
                  Ask a mentor
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
