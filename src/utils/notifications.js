
const db = require('../config/db');

/**
 * Create a notification for every active ADMIN.
 * Pass an existing transaction connection when available.
 */
async function notifyAdmins({
    title,
    message,
    type,
    registrationId = null,
    paymentId = null,
    connection = db,
}) {
    const [result] = await connection.query(
        `INSERT INTO notifications (
            recipient_user_id,
            title,
            message,
            type,
            related_registration_id,
            related_payment_id
        )
        SELECT
            id, ?, ?, ?, ?, ?
        FROM users
        WHERE role = 'ADMIN'
          AND status = 'ACTIVE'`,
        [title, message, type, registrationId, paymentId]
    );

    return result.affectedRows;
}

module.exports = { notifyAdmins };
