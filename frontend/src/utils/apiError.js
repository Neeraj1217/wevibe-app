export function getApiErrorMessage(err, fallback = "Request failed") {
  const status = err?.response?.status;
  const msg = err?.response?.data?.error;

  if (status === 401) return "Please log in to continue";
  if (status === 403) return msg || "You are not allowed to do that";
  if (status === 503) return msg || "Service temporarily unavailable. Try again shortly.";
  if (status >= 500) return msg || "Server error. Please try again.";

  return msg || fallback;
}
