import { API_URL } from './config.js';
import { currentToken } from './state.js';

export const fetchWithAuth = async (path, options = {}) => {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${currentToken}`,
      "Content-Type": "application/json",
    },
  });
} 