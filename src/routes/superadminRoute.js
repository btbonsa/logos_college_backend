const express = require("express");

const router = express.Router();

const {
  getDashboardStats,
  createAdmin,
} = require("../controllers/superadmincontroller");


const authenticate = require('../middlewares/authmiddleware');
const authorizeRole = require('../middlewares/rolemiddleware');

router.get(
  "/dashboard",
  authenticate,
  authorizeRole("SUPER_ADMIN"),
  getDashboardStats
);

router.post(
  "/create-admin",
  authenticate,
  authorizeRole("SUPER_ADMIN"),
  createAdmin
);


module.exports = router;