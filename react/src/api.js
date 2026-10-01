import axios from "axios";
import { legacySession, sessionHint } from "./auth/tokenStorage";

// Backend origin, e.g. https://medicine-donor-api.onrender.com (set in
// .env / the hosting dashboard). Empty in development: requests go to
// /api and Vite proxies them to the local backend (see vite.config.js).
const API_ORIGIN = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const API_BASE_URL = `${API_ORIGIN}/api`;

const API = axios.create({ baseURL: API_BASE_URL });

// Separate client for token endpoints so they never go through the
// refresh-and-retry interceptor below. `withCredentials` sends the HttpOnly
// refresh cookie (also when the API is on another origin), and the
// X-Requested-With header is required by the API for cookie-based calls
// (a cross-site form can't send it).
const AUTH = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
  headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
});

// ---------------------------------------------------------------------------
// Session wiring. The store registers callbacks here (see store/store.js) so
// this module does not import the store and create a circular dependency.
// ---------------------------------------------------------------------------

let auth = {
  getAccessToken: () => null,
  onRefreshed: () => {},
  onExpired: () => {},
};

export function configureAuth(handlers) {
  auth = { ...auth, ...handlers };
}

function normalizeError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  let normalized = { status, error: "Network error. Please check your connection." };
  if (typeof data === "string" && /^\s*</.test(data)) {
    // An HTML page instead of JSON: the request didn't reach the API
    // (usually VITE_API_URL is missing, so the static host answered).
    normalized = {
      status,
      error:
        status === 404
          ? "Can’t reach the server. Please try again later."
          : `Server error (${status || "network"}). Please try again later.`,
    };
    if (import.meta.env.PROD && !API_ORIGIN) {
      console.error("VITE_API_URL is not set: API requests are going to the frontend host.");
    }
  } else if (data) {
    if (typeof data === "string") normalized = { status, error: data };
    else if (data.error) normalized = { status, error: data.error };
    else if (data.message) normalized = { status, error: data.message };
    else normalized = { status, error: JSON.stringify(data) };
  }
  return normalized;
}

function tokenExpiresSoon(token, withinSeconds = 30) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp * 1000 - Date.now() < withinSeconds * 1000;
  } catch {
    return true;
  }
}

let refreshInFlight = null;

async function doRefresh() {
  // The refresh token travels in the HttpOnly cookie. A token stored by an
  // older build is sent once so the server can move it into the cookie.
  const legacy = legacySession.token();
  const { data } = await AUTH.post("/refresh", legacy ? { refreshToken: legacy } : {});
  legacySession.clear();
  sessionHint.mark();
  auth.onRefreshed({ accessToken: data.accessToken, user: data.user });
  return data.accessToken;
}

/**
 * Exchanges the refresh token for a new token pair. Concurrent callers share
 * one request, and a Web Lock serialises refreshes across tabs so two tabs
 * never spend the same (single-use) refresh token.
 */
export function refreshSession() {
  if (!refreshInFlight) {
    const run = () => doRefresh();
    const locked =
      typeof navigator !== "undefined" && navigator.locks?.request
        ? navigator.locks.request("mds-token-refresh", run)
        : run();

    refreshInFlight = locked
      .catch((err) => {
        // Only end the session when the server rejected the token; a
        // network blip should not sign the user out.
        const rejected = err?.status === 401 || [400, 401, 403].includes(err?.response?.status);
        if (rejected) {
          sessionHint.clear();
          auth.onExpired();
        }
        throw err?.response || err?.request ? normalizeError(err) : err;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Attach the current access token to every request (overriding any token a
// caller passed in, which may be stale), refreshing it first if it is about
// to expire.
API.interceptors.request.use(async (config) => {
  let token = auth.getAccessToken();
  if (token && tokenExpiresSoon(token) && sessionHint.has()) {
    try {
      token = await refreshSession();
    } catch {
      token = null;
    }
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, refresh once and replay the request. Errors are normalised so
// callers always get { error, status }.
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    if (
      error?.response?.status === 401 &&
      original &&
      !original._retried &&
      sessionHint.has()
    ) {
      original._retried = true;
      try {
        const token = await refreshSession();
        original.headers.Authorization = `Bearer ${token}`;
        return API(original);
      } catch {
        // fall through to the normalised error
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

// ------------------------------------------------------------------- auth

export const authApi = {
  async login({ identifier, password, rememberMe }) {
    try {
      const { data } = await AUTH.post("/login", { identifier, password, rememberMe });
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
  async register({ name, email, phone, password, accountType }) {
    try {
      const { data } = await AUTH.post("/register", { name, email, phone, password, accountType });
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
  async logout() {
    await AUTH.post("/logout", {});
  },
  async me() {
    const { data } = await API.get("/auth/me");
    return data;
  },
  async forgotPassword(email) {
    try {
      const { data } = await AUTH.post("/forgot-password", { email });
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
  async resetPassword({ email, otp, newPassword }) {
    try {
      const { data } = await AUTH.post("/reset-password", { email, otp, newPassword });
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
};

// ------------------------------------------------------------ app endpoints
// The request interceptor attaches the current access token to every call.

// Open, approved cases for donors (donor-safe fields only).
export const getOpenCases = async () => {
  const res = await API.get("/adminpage/getpatients");
  return res.data;
};

export const getPatientDetails = async () => {
  const res = await API.get("/patientdetails");
  return res.data;
};

export const updatePatientDetails = async (updatedData) => {
  // FormData: let the browser set the multipart boundary.
  const res = await API.put("/patientdetails/update", updatedData);
  return res.data;
};


/** One page of patients for the admin lists (filtered and sorted server-side). */
export const adminListPatients = async ({ status, q = "", sort = "newest", page = 1, limit = 24 }, signal) => {
  const res = await API.get("/adminpage/patients", { params: { status, q, sort, page, limit }, signal });
  return res.data;
};

/** Counts per status plus money raised / still needed. */
export const adminPatientStats = async () => {
  const res = await API.get("/adminpage/stats");
  return res.data;
};

export const getPatientById = async (id) => {
  const res = await API.get(`/adminpage/patients/${id}`);
  return res.data;
};


export const registerdoctor = async (payload) => {
  const res = await API.post("/admin/registerdoctor", payload, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
};

export const listDoctors = async () => {
  const res = await API.get("/admin/doctors");
  return res.data;
};

export const updateDoctor = async (id, payload) => {
  const res = await API.put(`/admin/doctors/${id}`, payload);
  return res.data;
};

export const deleteDoctor = async (id) => {
  const res = await API.delete(`/admin/doctors/${id}`);
  return res.data;
};

export const adminUpdatePatient = async (id, payload) => {
  const res = await API.put(`/admin/updatepatient/${id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export async function createOrder(amount_rupees, patient_id) {
  const res = await API.post("/create_order", { amount_rupees, patient_id });
  return res.data;
}

export const getMyDonations = async () => {
  const res = await API.get("/donor/mydonations");
  return res.data;
};

export async function verifyPayment(payload) {
  const res = await API.post("/verify_payment", payload);
  return res.data;
}

export const getAllPayments = async () => {
  try {
    const res = await API.get("/getdonation");
    return res.data;
  } catch (error) {
    return {
      error: error.error || "Failed to fetch payments",
      status: error.status,
    };
  }
};
