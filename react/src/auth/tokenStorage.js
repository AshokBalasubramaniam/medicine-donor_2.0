// Session persistence.
//
// The refresh token lives in an HttpOnly cookie set by the API, so page
// scripts (and therefore XSS) can never read it. The short-lived access
// token is kept in memory only (Redux state).
//
// This module only stores a non-secret hint that a session cookie probably
// exists, so visitors who never signed in don't trigger a refresh request,
// and so signing out in one tab can sign out the others.

const HINT_KEY = "mds.session";
// Older builds kept the refresh token and profile in web storage.
const LEGACY_REFRESH_KEY = "mds.refreshToken";
const LEGACY_USER_KEY = "mds.user";

function safe(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const local = () => safe(() => window.localStorage);
const session = () => safe(() => window.sessionStorage);

export const sessionHint = {
  has() {
    return safe(() => local()?.getItem(HINT_KEY) === "1", false) || Boolean(peekLegacyRefreshToken());
  },
  mark() {
    safe(() => local()?.setItem(HINT_KEY, "1"));
  },
  clear() {
    safe(() => local()?.removeItem(HINT_KEY));
    removeLegacy();
  },
  KEY: HINT_KEY,
};

function peekLegacyRefreshToken() {
  for (const store of [local(), session()]) {
    const token = safe(() => store?.getItem(LEGACY_REFRESH_KEY));
    if (token) return token;
  }
  return null;
}

function removeLegacy() {
  for (const store of [local(), session()]) {
    safe(() => {
      store?.removeItem(LEGACY_REFRESH_KEY);
      store?.removeItem(LEGACY_USER_KEY);
    });
  }
}

/**
 * A refresh token left in web storage by an older build, if any. Sent once
 * so the server can move the session into the HttpOnly cookie; the stored
 * copy is deleted after the first successful refresh.
 */
export const legacySession = {
  token: peekLegacyRefreshToken,
  clear: removeLegacy,
};

/** Remove credentials left behind by the previous (per-portal) login screens. */
export function clearLegacyCredentials() {
  safe(() => {
    window.localStorage.removeItem("authToken");
    document.cookie = "token=; Max-Age=0; path=/";
    document.cookie = "user=; Max-Age=0; path=/";
  });
}
