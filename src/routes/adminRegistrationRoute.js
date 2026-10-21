const express = require('express');

const { getAllRegistrations } = require('../controllers/adminRegistrationController');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');
const router = express.Router();

router.get('/registrations', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getAllRegistrations);

module.exports = router;
