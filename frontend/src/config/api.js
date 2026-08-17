export const API_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000`;

export const APP_URL =
  import.meta.env.VITE_APP_URL ||
  window.location.origin;