
const db = require('../config/db');

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
        WHERE role IN ('ADMIN', 'SUPER_ADMIN')
          AND status = 'ACTIVE'`,
        [title, message, type, registrationId, paymentId]
    );

    return result.affectedRows;
}

module.exports = { notifyAdmins };
