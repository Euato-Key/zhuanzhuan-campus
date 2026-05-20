const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

const MIN_INTERVAL_MS = 500;

let lastRequestTime = 0;

async function delayIfNeeded(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function httpGet(url: string, timeoutMs: number = 15000): Promise<string> {
  await delayIfNeeded();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    return await response.text();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new HttpError(`Request timed out after ${timeoutMs}ms`);
    }
    throw new HttpError(`Network error: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function httpGetHeaders(url: string, timeoutMs: number = 15000): Promise<Headers> {
  await delayIfNeeded();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    return response.headers;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new HttpError(`Request timed out after ${timeoutMs}ms`);
    }
    throw new HttpError(`Network error: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}