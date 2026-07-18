import { useState } from "react";
import { FiLogOut, FiMenu } from "react-icons/fi";

import AdminSidebar from "./AdminSidebar";
import "./AdminLayout.css";

function AdminLayout({
  user,
  logout,
  activePage,
  setActivePage,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminName = user?.name || "Administrator";

  return (
    <div className="admin-layout">
      <AdminSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
      />

      <div className="admin-main-area">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <FiMenu />
            </button>

            <div>
              <h1>Admin Management</h1>
              <p>
                Manage users, courses, subjects and academic
                assignments
              </p>
            </div>
          </div>

          <div className="admin-topbar-actions">

            <div className="admin-topbar-user">
              <div className="admin-topbar-avatar">
                {adminName.charAt(0).toUpperCase()}
              </div>

              <div>
                <strong>{adminName}</strong>
                <span>Administrator</span>
              </div>
            </div>

            <button
              type="button"
              className="admin-logout-button"
              onClick={logout}
            >
              <FiLogOut />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="admin-page-content">{children}</div>
      </div>
    </div>
  );
}

export default AdminLayout;