const express = require('express');

const {getPendingPayment, reviewPayment, getAllPayments } = require('../controllers/adminPayment');
const { getAllStudents } = require('../controllers/studentController');

const authenticate = require('../middlewares/authmiddleware');
const authorizeRole = require('../middlewares/rolemiddleware');

const router = express.Router();

router.get('/pending', authenticate, authorizeRole('ADMIN'), getPendingPayment);
router.get('/all-payments', authenticate, authorizeRole('ADMIN'), getAllPayments);
router.patch('/:id/review', authenticate, authorizeRole('ADMIN'), reviewPayment);
router.get('/students', authenticate, authorizeRole('ADMIN'), getAllStudents);


module.exports = router;
