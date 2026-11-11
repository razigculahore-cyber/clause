// Mirrors the Pydantic models in api/app/services/chat.py.
export interface Source {
  source: string;
  page: number | null;
  score: number | null;
}

export interface Answer {
  answer: string;
  sources: Source[];
}

export const MAX_QUESTION_LENGTH = 2000;

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

export async function ask(question: string, signal?: AbortSignal): Promise<Answer> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new Error("Can't reach the Clause API. Is the server running on port 8000?");
  }

  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  return (await res.json()) as Answer;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    // FastAPI validation errors: { detail: [{ msg, loc, ... }] }
    if (Array.isArray(body?.detail)) {
      return body.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ");
    }
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    /* non-JSON body */
  }
  return `Request failed (${res.status} ${res.statusText})`;
}
