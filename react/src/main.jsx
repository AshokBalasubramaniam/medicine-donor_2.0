import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import store from "./store/store";
import { bootstrapSession } from "./store/authSlice";
import { clearLegacyCredentials } from "./auth/tokenStorage";
import "./index.css";

clearLegacyCredentials();
store.dispatch(bootstrapSession());

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <App />
  </Provider>
);
