const express = require("express");

const router = express.Router();

const {
  getDashboardStats,
} = require("../controllers/superadmincontroller");


const authenticate = require('../middlewares/authmiddleware');
const authorizeRole = require('../middlewares/rolemiddleware');

router.get(
  "/dashboard",
  authenticate,
  authorizeRole("SUPER_ADMIN"),
  getDashboardStats
);


module.exports = router;