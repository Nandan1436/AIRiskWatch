import axios from "axios";
import { API_BASE_URL } from "../config/env";

const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ?? error.message ?? "Unexpected error";
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
