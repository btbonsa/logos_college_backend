const express = require('express');

const { cleanupOldDrafts } = require('../controllers/cleanupController');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');
const router = express.Router();

router.post('/drafts', authenticate, authorize('ADMIN'), cleanupOldDrafts);

module.exports = router;
