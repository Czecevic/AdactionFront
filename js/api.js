import { API_URL } from "./config.js";
import { currentToken } from "./state.js";

export const fetchWithAuth = async (path, options = {}) => {
  const headers = {
    Authorization: `Bearer ${currentToken}`,
    ...(options.method && options.method !== "GET"
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers,
  };

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
};
