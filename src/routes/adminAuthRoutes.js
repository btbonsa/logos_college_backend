const express = require('express');

const { adminLogin } = require('../controllers/adminAuthController');
const { getAllStudents } = require('../controllers/studentController');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');

const router = express.Router();

router.post('/login', adminLogin);
router.get('/students', authenticate, authorize('ADMIN'), getAllStudents);

module.exports = router;
