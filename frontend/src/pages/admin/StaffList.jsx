import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  FiBookOpen,
  FiEdit2,
  FiSearch,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";

import "./StaffList.css";

function StaffList() {
  const [staffMembers, setStaffMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await axios.get(
        "http://localhost:5000/staff"
      );

      setStaffMembers(response.data);
    } catch (error) {
      console.error("Get staff error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to retrieve staff members."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return staffMembers;
    }

    return staffMembers.filter((staff) => {
      return (
        staff.name?.toLowerCase().includes(search) ||
        staff.email?.toLowerCase().includes(search) ||
        staff.staffId?.toLowerCase().includes(search) ||
        staff.department?.toLowerCase().includes(search) ||
        staff.designation?.toLowerCase().includes(search)
      );
    });
  }, [searchTerm, staffMembers]);

  const handleDelete = async (staff) => {
    const confirmed = window.confirm(
      `Delete ${staff.name}? This will also remove the lecturer login account.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(staff._id);
      setMessage("");

      const response = await axios.delete(
        `http://localhost:5000/staff/${staff._id}`
      );

      setStaffMembers((currentStaff) =>
        currentStaff.filter(
          (staffMember) => staffMember._id !== staff._id
        )
      );

      setMessage(
        response.data.message ||
          "Staff member deleted successfully."
      );

      setMessageType("success");
    } catch (error) {
      console.error("Delete staff error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to delete staff member."
      );

      setMessageType("error");
    } finally {
      setDeletingId("");
    }
  };

  const openEditModal = (staff) => {
    setMessage("");

    setEditingStaff({
      _id: staff._id,
      name: staff.name || "",
      email: staff.email || "",
      staffId: staff.staffId || "",
      department: staff.department || "",
      qualification: staff.qualification || "",
      designation: staff.designation || "Lecturer",
      status: staff.status || "active",
    });
  };

  const closeEditModal = () => {
    if (!updating) {
      setEditingStaff(null);
    }
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditingStaff((currentStaff) => ({
      ...currentStaff,
      [name]: value,
    }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingStaff) {
      return;
    }

    if (
      !editingStaff.name.trim() ||
      !editingStaff.email.trim() ||
      !editingStaff.staffId.trim() ||
      !editingStaff.department.trim()
    ) {
      setMessage("Please complete all required staff fields.");
      setMessageType("error");
      return;
    }

    try {
      setUpdating(true);
      setMessage("");

      const response = await axios.put(
        `http://localhost:5000/staff/${editingStaff._id}`,
        {
          name: editingStaff.name,
          email: editingStaff.email,
          staffId: editingStaff.staffId,
          department: editingStaff.department,
          qualification: editingStaff.qualification,
          designation: editingStaff.designation,
          status: editingStaff.status,
        }
      );

      setStaffMembers((currentStaff) =>
        currentStaff.map((staffMember) =>
          staffMember._id === editingStaff._id
            ? response.data.staff
            : staffMember
        )
      );

      setMessage(
        response.data.message ||
          "Staff member updated successfully."
      );

      setMessageType("success");
      setEditingStaff(null);
    } catch (error) {
      console.error("Update staff error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to update staff member."
      );

      setMessageType("error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <main className="staff-list-page">
      <section className="staff-list-header">
        <div>
          <p className="staff-list-label">Staff Management</p>

          <h2>Staff List</h2>

          <p>
            View and manage lecturers and other academic staff
            accounts.
          </p>
        </div>

        <div className="staff-total-badge">
          <FiUser />
          <span>{staffMembers.length} Staff</span>
        </div>
      </section>

      <section className="staff-list-card">
        <div className="staff-list-toolbar">
          <div className="staff-search-box">
            <FiSearch />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by name, ID, email or department"
            />
          </div>
        </div>

        {message && (
          <div className={`staff-list-message ${messageType}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="staff-list-state">
            Loading staff members...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="staff-list-state">
            {searchTerm
              ? "No staff members match your search."
              : "No staff members have been created yet."}
          </div>
        ) : (
          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Staff ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Assignments</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStaff.map((staff) => (
                  <tr key={staff._id}>
                    <td>
                      <div className="staff-person-cell">
                        <div className="staff-avatar">
                          {staff.name
                            ?.charAt(0)
                            .toUpperCase() || "S"}
                        </div>

                        <div>
                          <strong>{staff.name}</strong>
                          <span>{staff.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>{staff.staffId}</td>

                    <td>{staff.department}</td>

                    <td>{staff.designation}</td>

                    <td>
                      <span
                        className={`staff-status-badge ${
                          staff.status === "active"
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {staff.status}
                      </span>
                    </td>

                    <td>
                      <div className="staff-assignment-count">
                        <FiBookOpen />

                        <span>
                          {staff.subjects?.length || 0} subjects
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="staff-action-buttons">
                        <button
                          type="button"
                          className="staff-action-button edit"
                          title="Edit staff"
                          onClick={() => openEditModal(staff)}
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          type="button"
                          className="staff-action-button delete"
                          title="Delete staff"
                          disabled={deletingId === staff._id}
                          onClick={() => handleDelete(staff)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingStaff && (
        <div
          className="staff-edit-overlay"
          onMouseDown={closeEditModal}
        >
          <form
            className="staff-edit-modal"
            onSubmit={handleUpdate}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="staff-edit-modal-header">
              <div>
                <p className="staff-edit-label">
                  Staff Management
                </p>

                <h3>Edit Staff Member</h3>

                <span>
                  Update the lecturer profile and login
                  information.
                </span>
              </div>

              <button
                type="button"
                className="staff-edit-close"
                onClick={closeEditModal}
                disabled={updating}
                aria-label="Close edit form"
              >
                <FiX />
              </button>
            </div>

            <div className="staff-edit-grid">
              <div className="staff-edit-group">
                <label htmlFor="edit-name">
                  Full Name <span>*</span>
                </label>

                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  value={editingStaff.name}
                  onChange={handleEditChange}
                  placeholder="Enter staff full name"
                />
              </div>

              <div className="staff-edit-group">
                <label htmlFor="edit-staffId">
                  Staff ID <span>*</span>
                </label>

                <input
                  id="edit-staffId"
                  name="staffId"
                  type="text"
                  value={editingStaff.staffId}
                  onChange={handleEditChange}
                  placeholder="Example: STF001"
                />
              </div>

              <div className="staff-edit-group">
                <label htmlFor="edit-email">
                  Email Address <span>*</span>
                </label>

                <input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={editingStaff.email}
                  onChange={handleEditChange}
                  placeholder="lecturer@university.ac.uk"
                />
              </div>

              <div className="staff-edit-group">
                <label htmlFor="edit-department">
                  Department <span>*</span>
                </label>

                <input
                  id="edit-department"
                  name="department"
                  type="text"
                  value={editingStaff.department}
                  onChange={handleEditChange}
                  placeholder="Computer Science"
                />
              </div>

              <div className="staff-edit-group">
                <label htmlFor="edit-qualification">
                  Qualification
                </label>

                <input
                  id="edit-qualification"
                  name="qualification"
                  type="text"
                  value={editingStaff.qualification}
                  onChange={handleEditChange}
                  placeholder="Example: PhD Computer Science"
                />
              </div>

              <div className="staff-edit-group">
                <label htmlFor="edit-designation">
                  Designation
                </label>

                <select
                  id="edit-designation"
                  name="designation"
                  value={editingStaff.designation}
                  onChange={handleEditChange}
                >
                  <option value="Lecturer">Lecturer</option>

                  <option value="Senior Lecturer">
                    Senior Lecturer
                  </option>

                  <option value="Professor">
                    Professor
                  </option>

                  <option value="Teaching Assistant">
                    Teaching Assistant
                  </option>

                  <option value="Administrator">
                    Administrator
                  </option>
                </select>
              </div>

              <div className="staff-edit-group">
                <label htmlFor="edit-status">
                  Status
                </label>

                <select
                  id="edit-status"
                  name="status"
                  value={editingStaff.status}
                  onChange={handleEditChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="staff-edit-actions">
              <button
                type="button"
                className="staff-edit-cancel"
                onClick={closeEditModal}
                disabled={updating}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="staff-edit-save"
                disabled={updating}
              >
                {updating ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default StaffList;