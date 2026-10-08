const express = require('express');

const {getPendingPayment, reviewPayment } = require('../controllers/adminPayment');

const authenticate = require('../middlewares/authmiddleware');
const authorizeRole = require('../middlewares/rolemiddleware');

const router = express.Router();

router.get('/pending', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), getPendingPayment);
router.patch('/:id/review', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), reviewPayment);


module.exports = router;
