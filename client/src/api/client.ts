import type { ApiErrorBody, FieldErrors } from "../shared/types";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

/**
 * Every failure the UI has to render. `userMessage` is the copy from the
 * error table in the spec; `fieldErrors` is only ever populated on 400.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly userMessage: string;
  readonly fieldErrors?: FieldErrors;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    fieldErrors?: FieldErrors;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors;
    this.userMessage = userMessageFor(init.status, init.message);
  }

  /** 401: the session is gone — guards send the member back to Join. */
  get isUnauthenticated() {
    return this.status === 401;
  }
  /** 409: another mentor got there first. Refetch, never auto-retry. */
  get isConflict() {
    return this.status === 409;
  }
  /** 404: the request is gone from this queue. Refetch. */
  get isGone() {
    return this.status === 404;
  }
  /** Network/timeout — we do not know whether the write landed. */
  get isOffline() {
    return this.status === 0;
  }
}

function userMessageFor(status: number, serverMessage: string): string {
  switch (status) {
    case 0:
      return "Can't reach the server. Check your connection and try again.";
    case 400:
      return serverMessage || "Please check the highlighted fields.";
    case 401:
      return "Your session ended. Please join the event again.";
    case 403:
      return "You don't have permission for this action";
    case 404:
      return "This request is no longer available";
    case 409:
      return "Another mentor took this request";
    case 429:
      return "Too many attempts, try again in a moment";
    default:
      return status >= 500
        ? "Something went wrong on the server. Try again in a moment."
        : serverMessage || "Something went wrong.";
  }
}

// --- CSRF -----------------------------------------------------------------
// The token comes from GET /api/session and is sent on every mutation.
// It lives in memory only: nothing about the session touches localStorage.
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}
export function getCsrfToken() {
  return csrfToken;
}

// --- transport ------------------------------------------------------------
export interface RawResponse {
  status: number;
  body: unknown;
}

export type Transport = (
  method: string,
  path: string,
  body: unknown,
  headers: Record<string, string>,
) => Promise<RawResponse>;

const httpTransport: Transport = async (method, path, body, headers) => {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    // Network failure: no status, no way to know if a write landed.
    throw new ApiError({ status: 0, code: "NETWORK", message: "Network error" });
  }
  if (res.status === 204) return { status: 204, body: null };
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  return { status: res.status, body: parsed };
};

// The mock is imported lazily so it never lands in a production bundle, and
// every request awaits the resolution so nothing can slip out over real HTTP
// during the first tick.
let transportReady: Promise<Transport> = USE_MOCK
  ? import("./mock/mockServer").then((m) => m.mockTransport)
  : Promise.resolve(httpTransport);

/** Swaps the transport in tests. Nothing outside src/api/ may call this. */
export function setTransport(next: Transport) {
  transportReady = Promise.resolve(next);
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ApiErrorBody).error?.code === "string"
  );
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  const isMutation = method !== "GET" && method !== "HEAD";
  if (isMutation && csrfToken) headers["X-CSRF-Token"] = csrfToken;

  // Never log bodies: they carry details text, invitation codes and tokens.
  const res = await (await transportReady)(method, path, body, headers);

  if (res.status >= 200 && res.status < 300) return res.body as T;

  if (isErrorBody(res.body)) {
    throw new ApiError({
      status: res.status,
      code: res.body.error.code,
      message: res.body.error.message,
      fieldErrors: res.body.error.fieldErrors,
    });
  }
  throw new ApiError({
    status: res.status,
    code: "UNKNOWN",
    message: `Request failed (${res.status})`,
  });
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export function toQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}
