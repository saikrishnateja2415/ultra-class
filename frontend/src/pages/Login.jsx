import { useState } from "react";
import axios from "axios";
import logo from "../assets/logo.png";

function Login({ setPage, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/login", {
        email,
        password,
      });

      const user = res.data.user;
      setUser(user);

      if (user.role === "admin") {
        setPage("admin");
      } else if (user.role === "lecturer") {
        setPage("lecturer");
      } else {
        setPage("student");
      }
    } catch (err) {
      alert("Invalid Login");
      console.log(err);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logo} alt="Ultra Class Logo" className="login-logo" />

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
}

export default Login;