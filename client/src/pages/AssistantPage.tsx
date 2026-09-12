import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { assistChat, safeResourceUrl } from "../api/assist";
import type { AssistMessage, AssistReply } from "../api/assist";
import { USE_MOCK } from "../api/client";
import { useEventSession } from "../hooks/useEvent";
import { CATEGORIES } from "../shared/requests";
import type { Category } from "../shared/types";
import { Alert, css } from "../components/event/UI";
import {
  IconArrowRight,
  IconBrain,
  IconCheck,
  IconHandRaised,
  IconShield,
  IconUsers,
} from "../components/icons";
import own from "./AssistantPage.module.css";

interface Turn extends AssistMessage {
  /** Present on agent turns that came back with a step list. */
  suggestions?: string[];
  resources?: { title: string; url: string }[];
  escalate?: boolean;
}

const OPENING: Turn = {
  role: "agent",
  content:
    "Tell me what you are stuck on — what you expected, what happened instead, and anything you have already tried. I will suggest what to check next, and if it is not getting anywhere I will say so and help you hand it to a mentor.",
};

export default function AssistantPage() {
  const session = useEventSession();
  const [turns, setTurns] = useState<Turn[]>([OPENING]);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<Category>("Frontend");
  const listEnd = useRef<HTMLDivElement>(null);

  const ask = useMutation<AssistReply, Error, Turn[]>({
    mutationFn: (history) =>
      assistChat(session.eventId, {
        category,
        messages: history.map(({ role, content }) => ({ role, content })),
      }),
    onSuccess: (reply) =>
      setTurns((prev) => [
        ...prev,
        {
          role: "agent",
          content: reply.reply,
          suggestions: reply.suggestions,
          resources: reply.resources,
          escalate: reply.escalate,
        },
      ]),
  });

  // Keep the newest turn in view without stealing focus from the composer.
  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: "nearest" });
  }, [turns.length, ask.isPending]);

  function send() {
    const text = draft.trim();
    if (!text || ask.isPending) return;
    const history: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(history);
    setDraft("");
    ask.mutate(history);
  }

  const newRequest = `/event/${session.eventId}/new`;

  return (
    <>
      <div className={css.pageHeading}>
        <div>
          <p className={css.eyebrow}>AI ASSISTANT</p>
          <h1>
            Think it through.
            <br />
            <em>Then ask a human.</em>
          </h1>
          <p>
            A first pass at your blocker, any time of night. It never replaces a
            mentor — it helps you arrive with a clearer question.
          </p>
        </div>
        <Link className={css.secondary} to={newRequest}>
          <IconHandRaised size={18} />
          Ask a mentor instead
        </Link>
      </div>

      <div className={own.layout}>
        <section className={own.thread} aria-label="Conversation with the assistant">
          <div className={own.threadTop}>
            <span className={own.threadTitle}>
              <IconBrain size={16} />
              DevSOS assistant
            </span>
            <label className={css.meta}>
              Topic{" "}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <ul className={own.messages}>
            {turns.map((turn, i) => (
              <li
                key={i}
                className={`${own.turn} ${turn.role === "user" ? own.turnUser : ""}`}
              >
                <span className={own.who}>
                  {turn.role === "user" ? (
                    <>
                      <IconUsers size={12} />
                      You
                    </>
                  ) : (
                    <>
                      <IconBrain size={12} />
                      Assistant
                    </>
                  )}
                </span>
                <div
                  className={`${own.bubble} ${turn.role === "user" ? own.bubbleUser : ""}`}
                >
                  {turn.content}
                  {turn.suggestions && turn.suggestions.length > 0 && (
                    <ol className={own.steps}>
                      {turn.suggestions.map((step, n) => (
                        <li key={n}>{step}</li>
                      ))}
                    </ol>
                  )}
                  {turn.resources?.map((resource, n) => {
                    const href = safeResourceUrl(resource.url);
                    return href ? (
                      <a
                        key={n}
                        className={own.resource}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {resource.title}
                        <IconArrowRight size={14} />
                      </a>
                    ) : null;
                  })}
                  {turn.escalate && (
                    <div className={own.escalate}>
                      <p>
                        This one looks like it wants a person. You now have a
                        description and a list of what you ruled out — paste it
                        straight into a request.
                      </p>
                      <Link className={css.primary} to={newRequest}>
                        Ask a mentor
                        <IconArrowRight size={16} />
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            ))}
            {ask.isPending && (
              <li className={own.turn}>
                <span className={own.who}>
                  <IconBrain size={12} />
                  Assistant
                </span>
                <p className={own.thinking} role="status">
                  <span className={css.spinner} />
                  Reading what you wrote…
                </p>
              </li>
            )}
            <div ref={listEnd} />
          </ul>

          {ask.error ? (
            <div className={own.threadError}>
              {/* The failed turn is still the last thing in the thread, so a
                  retry sends exactly what the member already typed. */}
              <Alert error={ask.error} retry={() => ask.mutate(turns)} />
            </div>
          ) : null}

          <div className={own.composer}>
            <label htmlFor="assistant-input">Describe your blocker</label>
            <textarea
              id="assistant-input"
              value={draft}
              maxLength={1000}
              placeholder="Our login call returns 401 in the browser but works in Postman. Same token, same URL…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter starts a new line.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className={own.composerRow}>
              <button
                type="button"
                className={css.primary}
                disabled={!draft.trim() || ask.isPending}
                onClick={send}
              >
                {ask.isPending ? "Thinking…" : "Send"}
                <IconArrowRight size={16} />
              </button>
              <p className={own.composerHint}>
                Enter sends · Shift + Enter for a new line · {1000 - draft.length}{" "}
                characters left
              </p>
            </div>
          </div>
        </section>

        <aside className={own.rail}>
          <div className={own.railCard}>
            <IconCheck size={26} />
            <h2>Get a better answer</h2>
            <ul className={own.railList}>
              <li>
                <IconCheck size={15} />
                Paste the exact error text, not a paraphrase of it.
              </li>
              <li>
                <IconCheck size={15} />
                Say what you expected and what happened instead.
              </li>
              <li>
                <IconCheck size={15} />
                Mention what you already tried so it does not repeat you.
              </li>
              <li>
                <IconCheck size={15} />
                One problem per conversation.
              </li>
            </ul>
          </div>

          <div className={own.railCard}>
            <IconHandRaised size={26} />
            <h2>When to stop and ask a person</h2>
            <p>
              If two rounds have not moved you, a mentor will be faster. The
              assistant will say so itself — and your conversation is already
              most of a good request.
            </p>
            <Link className={css.textLink} to={newRequest}>
              Ask a mentor
              <IconArrowRight size={16} />
            </Link>
          </div>

          <p className={own.privacy}>
            <IconShield size={18} />
            <strong>What happens to this</strong>
            The conversation stays on this screen and is not added to the mentor
            queue. Nothing you type here is shown to other teams.
            {USE_MOCK && " In demo mode no model is called at all."}
          </p>
        </aside>
      </div>
    </>
  );
}
