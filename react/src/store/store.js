import { configureStore } from "@reduxjs/toolkit";
import authReducer, { sessionCleared, tokenRefreshed } from "./authSlice";
import { configureAuth } from "../api";
import { tokenStorage } from "../auth/tokenStorage";

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

configureAuth({
  getAccessToken: () => store.getState().auth.token,
  onRefreshed: (payload) => store.dispatch(tokenRefreshed(payload)),
  onExpired: () => store.dispatch(sessionCleared()),
});

// Logging out in one tab ends "remember me" sessions in the other tabs too.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (
      event.key === tokenStorage.REFRESH_KEY &&
      !event.newValue &&
      store.getState().auth.isAuthenticated
    ) {
      store.dispatch(sessionCleared());
    }
  });
}

export default store;
