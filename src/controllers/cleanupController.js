const db = require('../config/db');

async function cleanupOldDrafts(req, res) {
    const connection = await db.getConnection();
    try {
        const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);

        const [result] = await connection.query(
            `DELETE FROM registrations 
             WHERE status = 'DRAFT' 
             AND created_at < ?`,
            [cutoffTime]
        );

        await connection.commit();

        console.log(`Cleanup: Deleted ${result.affectedRows} old DRAFT registrations`);

        return res.status(200).json({
            success: true,
            message: `Deleted ${result.affectedRows} old DRAFT registrations`,
            deleted_count: result.affectedRows
        });

    } catch (error) {
        await connection.rollback();
        console.error("Cleanup error:", error.message, error.sqlMessage);
        return res.status(500).json({
            success: false,
            message: "Failed to cleanup old drafts",
            error: error.message,
            sqlMessage: error.sqlMessage
        });
    } finally {
        connection.release();
    }
}

module.exports = { cleanupOldDrafts };
