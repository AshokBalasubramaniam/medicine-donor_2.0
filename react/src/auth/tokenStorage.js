// Persists the refresh token and a cached copy of the user profile.
//
// The short-lived access token is kept in memory only (Redux state), so it is
// never written to storage. "Remember me" puts the refresh token in
// localStorage (survives browser restarts); otherwise sessionStorage is used
// and the session ends when the tab is closed.

const REFRESH_KEY = "mds.refreshToken";
const USER_KEY = "mds.user";

function safe(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const stores = () => [
  safe(() => window.localStorage),
  safe(() => window.sessionStorage),
].filter(Boolean);

/** The storage that currently holds the session, if any. */
function activeStore() {
  return stores().find((s) => safe(() => s.getItem(REFRESH_KEY))) || null;
}

export const tokenStorage = {
  save({ refreshToken, user }, remember) {
    this.clear();
    const store = remember ? safe(() => window.localStorage) : safe(() => window.sessionStorage);
    if (!store) return;
    safe(() => {
      store.setItem(REFRESH_KEY, refreshToken);
      store.setItem(USER_KEY, JSON.stringify(user));
    });
  },

  /** Replace the refresh token after rotation, keeping the same storage. */
  update({ refreshToken, user }) {
    const store = activeStore() || safe(() => window.sessionStorage);
    if (!store) return;
    safe(() => {
      if (refreshToken) store.setItem(REFRESH_KEY, refreshToken);
      if (user) store.setItem(USER_KEY, JSON.stringify(user));
    });
  },

  getRefreshToken() {
    const store = activeStore();
    return store ? safe(() => store.getItem(REFRESH_KEY)) : null;
  },

  getUser() {
    const store = activeStore();
    const raw = store ? safe(() => store.getItem(USER_KEY)) : null;
    return raw ? safe(() => JSON.parse(raw)) : null;
  },

  clear() {
    for (const s of stores()) {
      safe(() => {
        s.removeItem(REFRESH_KEY);
        s.removeItem(USER_KEY);
      });
    }
  },

  REFRESH_KEY,
};

/** Remove credentials left behind by the previous (per-portal) login screens. */
export function clearLegacyCredentials() {
  safe(() => {
    window.localStorage.removeItem("authToken");
    document.cookie = "token=; Max-Age=0; path=/";
    document.cookie = "user=; Max-Age=0; path=/";
  });
}
