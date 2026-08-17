import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

import App from "./App.jsx";
import { API_URL } from "./config/api";

import "./index.css";

axios.defaults.baseURL = API_URL;

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
        ""
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
        ""
      );
    }

    return config;
  },
  (error) =>
    Promise.reject(error)
);

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