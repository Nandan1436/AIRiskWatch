import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { AUTH_LOGOUT_EVENT, AUTH_STORAGE_KEY } from "../constants";

const apiClient = axios.create({ baseURL: API_BASE_URL });

function readToken(): string | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw).token ?? null) : null;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A rejected token means the session is over; a 401 from the sign-in
    // form itself (no token sent) is just a wrong password.
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
    }
    const detail = error.response?.data?.detail;
    // FastAPI 422 responses carry a list of validation errors, not a string.
    const message = Array.isArray(detail)
      ? (detail[0]?.msg ?? "Invalid request")
      : (detail ?? error.message ?? "Unexpected error");
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
