import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

import App from "./App.jsx";
import "./index.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000`;

/*
  This interceptor performs two tasks:

  1. Adds the JWT token to protected requests.
  2. Replaces old localhost backend URLs with the
     configured network or production API URL.

  This allows older components to continue working
  without changing every Axios request individually.
*/

axios.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("authToken");

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    if (
      typeof config.url === "string" &&
      config.url.startsWith(
        "http://localhost:5000"
      )
    ) {
      config.url = config.url.replace(
        "http://localhost:5000",
        API_URL
      );
    }

    if (
      typeof config.url === "string" &&
      config.url.startsWith(
        "http://127.0.0.1:5000"
      )
    ) {
      config.url = config.url.replace(
        "http://127.0.0.1:5000",
        API_URL
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/*
  Clear invalid authentication data if the backend
  reports that the token is missing, invalid or expired.
*/

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401
    ) {
      localStorage.removeItem(
        "authToken"
      );

      localStorage.removeItem(
        "ultraClassUser"
      );
    }

    return Promise.reject(error);
  }
);

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <App />
  </StrictMode>
);