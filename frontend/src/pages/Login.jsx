import { useState } from "react";
import axios from "axios";

import logo from "../assets/logo.png";

const API_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:5000`;

function Login({ setPage, setUser }) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loggingIn, setLoggingIn] =
    useState(false);

  const handleLogin = async () => {
    if (
      !email.trim() ||
      !password.trim()
    ) {
      alert(
        "Please enter your email and password"
      );

      return;
    }

    try {
      setLoggingIn(true);

      const response = await axios.post(
        `${API_URL}/login`,
        {
          email: email.trim(),
          password,
        }
      );

      const loggedInUser =
        response.data.user;

      localStorage.setItem(
        "authToken",
        response.data.token
      );

      localStorage.setItem(
        "ultraClassUser",
        JSON.stringify(loggedInUser)
      );

      setUser(loggedInUser);

      if (loggedInUser.role === "admin") {
        setPage("admin");
      } else if (
        loggedInUser.role === "lecturer"
      ) {
        setPage("lecturer");
      } else {
        setPage("student");
      }
    } catch (error) {
      console.error("Login error:", error);

      alert(
        error.response?.data?.message ||
        "Invalid email or password"
      );
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img
          src={logo}
          alt="Ultra Class Logo"
          className="login-logo"
        />

        <input
          type="email"
          placeholder="Email address"
          value={email}
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !loggingIn
            ) {
              handleLogin();
            }
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !loggingIn
            ) {
              handleLogin();
            }
          }}
        />

        <button
          type="button"
          onClick={handleLogin}
          disabled={loggingIn}
        >
          {loggingIn
            ? "Logging in..."
            : "Login"}
        </button>
      </div>
    </div>
  );
}

export default Login;