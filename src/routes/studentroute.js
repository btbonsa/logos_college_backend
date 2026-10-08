const express = require('express');

const { createStudentProfile } = require('../controllers/studentController');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');
const router = express.Router();

router.post('/profile', authenticate, authorize('STUDENT'), createStudentProfile);

module.exports = router;
