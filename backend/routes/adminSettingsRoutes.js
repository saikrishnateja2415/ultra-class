const express = require("express");

const {
  getAdminSettings,
  updateAdminProfile,
  changeAdminPassword,
  updateAdminSettings,
} = require(
  "../controllers/adminSettingsController"
);

const {
  adminOnly,
} = require(
  "../middleware/authMiddleware"
);

const router = express.Router();

router.get(
  "/api/admin/:adminId/settings",
  ...adminOnly,
  getAdminSettings
);

router.put(
  "/api/admin/:adminId/profile",
  ...adminOnly,
  updateAdminProfile
);

router.put(
  "/api/admin/:adminId/password",
  ...adminOnly,
  changeAdminPassword
);

router.put(
  "/api/admin/:adminId/settings",
  ...adminOnly,
  updateAdminSettings
);

module.exports = router;