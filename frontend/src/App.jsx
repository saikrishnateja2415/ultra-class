import { useState } from "react";

import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";

import "./App.css";

/*
  Read the previously logged-in user safely.

  If the stored information is missing, damaged or does
  not have a valid token, return null.
*/

const getSavedUser = () => {
  try {
    const token =
      localStorage.getItem("authToken");

    const savedUser =
      localStorage.getItem("ultraClassUser");

    if (!token || !savedUser) {
      return null;
    }

    const parsedUser = JSON.parse(savedUser);

    if (
      !parsedUser?.id ||
      !["admin", "lecturer", "student"].includes(
        parsedUser.role
      )
    ) {
      return null;
    }

    return parsedUser;
  } catch (error) {
    console.error(
      "Unable to restore saved login:",
      error
    );

    localStorage.removeItem("authToken");
    localStorage.removeItem("ultraClassUser");

    return null;
  }
};

function App() {
  const initialUser = getSavedUser();

  const [user, setUser] =
    useState(initialUser);

  const [page, setPage] = useState(
    initialUser?.role || "login"
  );

  /*
    Remove all authentication information when the user
    logs out.
  */

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("ultraClassUser");

    setUser(null);
    setPage("login");
  };

  /*
    Do not allow a dashboard to open unless a valid
    user object exists in the frontend.
  */

  if (page === "admin" && user?.role === "admin") {
    return (
      <AdminDashboard
        user={user}
        logout={logout}
      />
    );
  }

  if (
    page === "lecturer" &&
    user?.role === "lecturer"
  ) {
    return (
      <LecturerDashboard
        user={user}
        logout={logout}
      />
    );
  }

  if (
    page === "student" &&
    user?.role === "student"
  ) {
    return (
      <StudentDashboard
        user={user}
        logout={logout}
      />
    );
  }

  return (
    <Login
      setPage={setPage}
      setUser={setUser}
    />
  );
}

export default App;