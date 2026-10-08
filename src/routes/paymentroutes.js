const express = require('express');

const { createPayment, getPayments } = require('../controllers/paymentController');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');
const upload = require('../middlewares/uploadmiddleware');

const router = express.Router();

router.post('/', authenticate, authorize('STUDENT'), upload.single('payment_proof'), createPayment);
router.get('/all-payments', authenticate, authorize('ADMIN'), getPayments);

module.exports = router;