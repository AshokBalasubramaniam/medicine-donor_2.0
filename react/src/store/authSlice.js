import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authApi, refreshSession } from "../api";
import { tokenStorage } from "../auth/tokenStorage";

// `token` is the in-memory access token. The name is kept because the
// existing dashboard screens read `state.auth.token`.
const storedRefresh = tokenStorage.getRefreshToken();

const initialState = {
  user: storedRefresh ? tokenStorage.getUser() : null,
  token: null,
  isAuthenticated: false,
  // "checking" while an existing session is restored on page load.
  status: storedRefresh ? "checking" : "ready",
};

/** Restore the session on page load using the stored refresh token. */
export const bootstrapSession = createAsyncThunk(
  "auth/bootstrap",
  async (_, { dispatch, getState }) => {
    if (!tokenStorage.getRefreshToken()) {
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
      tokenStorage.save({ refreshToken: data.refreshToken, user: data.user }, rememberMe);
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
      tokenStorage.save({ refreshToken: data.refreshToken, user: data.user }, false);
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
  const refreshToken = tokenStorage.getRefreshToken();
  tokenStorage.clear();
  dispatch(sessionCleared());
  if (refreshToken) {
    try {
      await authApi.logout(refreshToken);
    } catch {
      // The local session is gone either way.
    }
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

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
