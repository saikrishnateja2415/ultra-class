const express = require("express");

const {
  getAdminSettings,
  updateAdminProfile,
  changeAdminPassword,
  updateAdminSettings,
} = require("../controllers/adminSettingsController");

const router = express.Router();

router.get(
  "/api/admin/:adminId/settings",
  getAdminSettings
);

router.put(
  "/api/admin/:adminId/profile",
  updateAdminProfile
);

router.put(
  "/api/admin/:adminId/password",
  changeAdminPassword
);

router.put(
  "/api/admin/:adminId/settings",
  updateAdminSettings
);

module.exports = router;