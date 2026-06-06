import { useState } from "react";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import LecturerDashboard from "./pages/LecturerDashboard";
import StudentDashboard from "./pages/StudentDashboard";

import "./App.css";

function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);

  const logout = () => {
    setUser(null);
    setPage("login");
  };

  if (page === "admin") {
    return <AdminDashboard user={user} logout={logout} />;
  }

  if (page === "lecturer") {
    return <LecturerDashboard user={user} logout={logout} />;
  }

  if (page === "student") {
    return <StudentDashboard user={user} logout={logout} />;
  }

  return <Login setPage={setPage} setUser={setUser} />;
}

export default App;