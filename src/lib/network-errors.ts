const NETWORK_ERROR_PATTERN = /fetch failed|failed to fetch|network request failed|no route to host|host unreachable|network error|unable to resolve host|failed to connect|connection timed out|timed out|socketexception|enetunreach|ehostunreach|err_internet_disconnected|err_network_changed/i;

export const NO_INTERNET_MESSAGE = "No internet connection. Check your connection and try again.";

export function isNetworkError(error: unknown): boolean {
  const candidate = error as { message?: unknown; cause?: { message?: unknown } } | null;
  const message = [candidate?.message, candidate?.cause?.message]
    .filter((part): part is string => typeof part === "string")
    .join(" ");
  return NETWORK_ERROR_PATTERN.test(message);
}

export function getPlayLandErrorMessage(error: unknown, fallback: string): string {
  if (isNetworkError(error)) return NO_INTERNET_MESSAGE;
  return error instanceof Error && error.message ? error.message : fallback;
}
