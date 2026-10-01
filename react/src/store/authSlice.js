import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authApi, refreshSession } from "../api";
import { sessionHint } from "../auth/tokenStorage";

// `token` is the in-memory access token; the refresh token is an HttpOnly
// cookie the page can't read. The user profile comes from the server on
// every page load (nothing personal is cached in storage).
const mayHaveSession = sessionHint.has();

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  // "checking" while an existing session is restored on page load.
  status: mayHaveSession ? "checking" : "ready",
};

/** Restore the session on page load from the refresh cookie. */
export const bootstrapSession = createAsyncThunk(
  "auth/bootstrap",
  async (_, { dispatch, getState }) => {
    if (!sessionHint.has()) {
      dispatch(sessionCleared());
      return;
    }
    try {
      await refreshSession();
    } catch {
      // Token rejected (already cleared) or server unreachable: continue signed out.
      if (getState().auth.status === "checking") dispatch(sessionCleared());
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ identifier, password, rememberMe }, { dispatch, rejectWithValue }) => {
    try {
      const data = await authApi.login({ identifier, password, rememberMe });
      sessionHint.mark();
      dispatch(sessionStarted({ accessToken: data.accessToken, user: data.user }));
      return data.user;
    } catch (err) {
      return rejectWithValue(err?.error || "Unable to log in. Please try again.");
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const data = await authApi.register(payload);
      sessionHint.mark();
      dispatch(sessionStarted({ accessToken: data.accessToken, user: data.user }));
      return data.user;
    } catch (err) {
      return rejectWithValue({
        message: err?.error || "Unable to create your account. Please try again.",
        status: err?.status,
      });
    }
  }
);

/**
 * Logs out on this device: revokes the refresh token server-side (best
 * effort) and clears local state. Exported as `logout` so existing screens
 * that `dispatch(logout())` get the full logout behaviour.
 */
export const logout = createAsyncThunk("auth/logout", async (_, { dispatch }) => {
  sessionHint.clear();
  dispatch(sessionCleared());
  try {
    // Revokes the session server-side and clears the cookie.
    await authApi.logout();
  } catch {
    // The local session is gone either way.
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionStarted(state, { payload }) {
      state.user = payload.user;
      state.token = payload.accessToken;
      state.isAuthenticated = true;
      state.status = "ready";
    },
    tokenRefreshed(state, { payload }) {
      state.token = payload.accessToken;
      if (payload.user) state.user = payload.user;
      state.isAuthenticated = true;
      state.status = "ready";
    },
    sessionCleared(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = "ready";
    },
  },
});

export const { sessionStarted, tokenRefreshed, sessionCleared } = authSlice.actions;
export default authSlice.reducer;

