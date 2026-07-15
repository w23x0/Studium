export function normalizeUpstreamBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("STUDIUM_UPSTREAM_BASE_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("STUDIUM_UPSTREAM_BASE_URL must use HTTPS.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "STUDIUM_UPSTREAM_BASE_URL must not contain credentials, query, or fragment.",
    );
  }
  if (url.pathname !== "/") {
    throw new Error(
      "STUDIUM_UPSTREAM_BASE_URL must be an origin without an API path such as /v1.",
    );
  }

  return url.origin;
}
