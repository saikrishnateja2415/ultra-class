const express = require("express");

const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
} = require(
  "../controllers/staffController"
);

const {
  getLecturerSettings,
  updateLecturerProfile,
  changeLecturerPassword,
} = require(
  "../controllers/lecturerSettingsController"
);

const {
  adminOnly,
  lecturerSelfOnly,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

/*
  Lecturer Settings

  A lecturer can access and update only their own
  profile and password.
*/

router.get(
  "/lecturer/settings/:userId",
  ...lecturerSelfOnly,
  getLecturerSettings
);

router.put(
  "/lecturer/settings/:userId/profile",
  ...lecturerSelfOnly,
  updateLecturerProfile
);

router.put(
  "/lecturer/settings/:userId/password",
  ...lecturerSelfOnly,
  changeLecturerPassword
);

/*
  Admin staff management

  Only an authenticated administrator can create,
  view, edit or delete lecturer accounts.
*/

router.post(
  "/staff",
  ...adminOnly,
  createStaff
);

router.get(
  "/staff",
  ...adminOnly,
  getAllStaff
);

router.get(
  "/staff/:id",
  ...adminOnly,
  getStaffById
);

router.put(
  "/staff/:id",
  ...adminOnly,
  updateStaff
);

router.delete(
  "/staff/:id",
  ...adminOnly,
  deleteStaff
);

module.exports = router;