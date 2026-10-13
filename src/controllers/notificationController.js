const db = require('../config/db');

async function getNotifications(req, res) {
    try {
        const userId = req.user.id;

        const [notifications] = await db.query(
            `SELECT 
                n.id,
                n.title,
                n.message,
                n.type,
                n.created_at,
                n.is_read,
                n.related_registration_id,
                n.related_payment_id,
                r.registration_number,
                p.amount,
                p.status AS payment_status
            FROM notifications n
            LEFT JOIN registrations r ON n.related_registration_id = r.id
            LEFT JOIN payments p ON n.related_payment_id = p.id
            WHERE n.recipient_user_id = ?
            ORDER BY n.created_at DESC
            LIMIT 50`,
            [userId]
        );

        const [unreadCount] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE recipient_user_id = ? AND is_read = FALSE',
            [userId]
        );

        return res.status(200).json({
            notifications,
            unread_count: unreadCount[0].count
        });
    } catch (error) {
        console.error('Get notifications error:', error.message, error.sqlMessage);
        return res.status(500).json({ message: 'Failed to fetch notifications' });
    }
}

async function markAsRead(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [result] = await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND recipient_user_id = ?',
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        return res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification as read error:', error.message, error.sqlMessage);
        return res.status(500).json({ message: 'Failed to mark notification as read' });
    }
}

async function markAllAsRead(req, res) {
    try {
        const userId = req.user.id;

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE recipient_user_id = ?',
            [userId]
        );

        return res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications as read error:', error.message, error.sqlMessage);
        return res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
}

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead
};
