const express = require("express");

const {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
} = require("../controllers/staffController");

const {
  getLecturerSettings,
  updateLecturerProfile,
  changeLecturerPassword,
} = require(
  "../controllers/lecturerSettingsController"
);

const router = express.Router();


router.get(
  "/lecturer/settings/:userId",
  getLecturerSettings
);

router.put(
  "/lecturer/settings/:userId/profile",
  updateLecturerProfile
);

router.put(
  "/lecturer/settings/:userId/password",
  changeLecturerPassword
);

router.post("/staff", createStaff);

router.get("/staff", getAllStaff);

router.get("/staff/:id", getStaffById);

router.put("/staff/:id", updateStaff);

router.delete("/staff/:id", deleteStaff);

module.exports = router;