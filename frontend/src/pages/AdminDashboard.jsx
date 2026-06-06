import { useState } from "react";
import axios from "axios";

function AdminDashboard() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");

  const createUser = async () => {
    try {
      await axios.post("http://localhost:5000/create-user", {
        name,
        email,
        password,
        role,
      });

      alert("User created successfully");

      setName("");
      setEmail("");
      setPassword("");
      setRole("student");
    } catch (error) {
      alert("Error creating user");
      console.log(error);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <h3>Create Lecturer and Student Accounts</h3>
      </div>

      <div className="dashboard-card">
        <h2>Create New User</h2>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <br />
        <br />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <br />
        <br />

        <input
          type="password"
          placeholder="Temporary Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br />
        <br />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
        </select>

        <br />
        <br />

        <button onClick={createUser}>
          Create User
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;