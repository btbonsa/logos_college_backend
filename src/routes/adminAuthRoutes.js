const express = require('express');

const { adminLogin } = require('../controllers/adminAuthController');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');

const router = express.Router();

router.post('/login', adminLogin);

module.exports = router;
