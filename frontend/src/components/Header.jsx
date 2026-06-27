import { useState } from "react";
import logo from "../assets/logo.png";
import "./Header.css";

function Header({ user, logout }) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="common-header">
      <div className="header-left">
        <img
          src={logo}
          alt="Ultra Class"
          className="header-logo"
        />
      </div>

      <div className="header-right">
        <span>Welcome, {user?.name}</span>

        <button
          className="profile-btn"
          onClick={() =>
            setShowProfile(!showProfile)
          }
        >
          {user?.name?.charAt(0).toUpperCase()}
        </button>

        {showProfile && (
          <div className="profile-menu">
            <button>My Profile</button>

            <button onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;