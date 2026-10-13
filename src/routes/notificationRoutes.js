const express = require('express');

const authenticate = require('../middlewares/authmiddleware');
const authorize = require('../middlewares/rolemiddleware');

const {
    getNotifications,
    markAsRead,
    markAllAsRead
} = require('../controllers/notificationController');

const router = express.Router();

router.get(
    '/',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    getNotifications
);

router.put(
    '/:id/read',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    markAsRead
);

router.put(
    '/read-all',
    authenticate,
    authorize('ADMIN', 'SUPER_ADMIN'),
    markAllAsRead
);

module.exports = router;
