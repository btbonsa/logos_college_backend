const express = require('express');

const {getPublicprograms} = require('../controllers/programs');

const router = express.Router();

router.get('/', getPublicprograms);

module.exports = router;