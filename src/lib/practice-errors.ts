type PracticeError = {
  status?: number;
  message?: string;
  data?: { message?: string };
  text?: string;
};

const friendlyMessage = (message: string) => {
  const clean = message
    .replace(/^Request failed:\s*\d+\s*[-:]?\s*/i, "")
    .trim();
  if (!clean) return "Something went wrong. Please try again.";

  try {
    const parsed = JSON.parse(clean) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    // The server may return a plain text message instead of JSON.
  }

  return clean.replace(/^\{"success":\s*false,\s*"message":\s*"?/, "").replace(/"?\}\s*$/, "");
};

export function getPracticeErrorMessage(
  reason: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  const error = (reason && typeof reason === "object" ? reason : {}) as PracticeError;
  const status = Number(error.status);

  if (status === 401) return "Please sign in to use Practice.";
  if (status === 404) {
    const message = friendlyMessage(error.data?.message ?? error.message ?? error.text ?? "");
    return message || "No questions are ready for practice yet.";
  }
  if (status >= 500) return "Practice is having trouble right now. Please try again soon.";

  const rawMessage = error.data?.message ?? error.message ?? error.text;
  if (/fetch failed|network request failed|no route to host|host unreachable|network error/i.test(rawMessage ?? "")) {
    return "We couldn't load Practice right now. Please check your connection and try again.";
  }
  if (rawMessage) {
    const message = friendlyMessage(rawMessage);
    if (message && !/^request failed\b/i.test(message)) return message;
  }

  return fallback;
}
