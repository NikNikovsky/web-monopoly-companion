// API configuration
// For local development: use localhost:3000
// For production: use Railway backend URL (set via environment variable)

export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchJSON(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function postJSON(endpoint, data) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}
