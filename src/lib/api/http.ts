// fetch with bounded exponential-backoff retry.
//
// Used by the dose-schedule and reminder-delivery calls: mobile patients drop
// off the network constantly, so every request gets a few quiet retries before
// the caller falls back to local state.

export interface RetryOptions {
  /** Total attempts, including the first. */
  attempts?: number;
  /** Base backoff in ms; doubles each attempt. */
  backoffMs?: number;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(
  input: string,
  init: RequestInit = {},
  opts: RetryOptions = {},
): Promise<Response> {
  const attempts = opts.attempts ?? 3;
  const backoff = opts.backoffMs ?? 400;
  const timeout = opts.timeoutMs ?? 8000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      // Retry transient server/network failures only; 4xx is the caller's problem.
      if (res.status >= 500 || res.status === 429) {
        throw new Error(`${init.method ?? "GET"} ${input} → ${res.status}`);
      }
      return res;
    } catch (err) {
      lastError = err;
      opts.onRetry?.(attempt, err);
      if (attempt < attempts) await sleep(backoff * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("request failed");
}

export async function fetchJsonWithRetry<T>(
  input: string,
  init?: RequestInit,
  opts?: RetryOptions,
): Promise<T> {
  const res = await fetchWithRetry(input, init, opts);
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${input} → ${res.status}`);
  return (await res.json()) as T;
}
