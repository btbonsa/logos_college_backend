const express = require('express');

const { createClassSchedule } = require('../controllers/classScheduleController');
const { getMyClassSchedule } = require('../controllers/classScheduleController');

const authenticate = require('../middlewares/authmiddleware');
const authorizeRole = require('../middlewares/rolemiddleware');

const router = express.Router();

router.post('/', authenticate, authorizeRole('ADMIN'), createClassSchedule);
router.get('/', authenticate, authorizeRole('STUDENT'), getMyClassSchedule);


module.exports = router;
