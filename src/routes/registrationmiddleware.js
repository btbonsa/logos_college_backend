const express = require('express');

const { createRegistration, getMyRegistration } = require('../controllers/registerStudent');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');
const router = express.Router();

router.post('/enroll', authenticate, authorize('STUDENT'), createRegistration);
router.get('/my', authenticate, authorize('STUDENT'), getMyRegistration);

module.exports = router;
