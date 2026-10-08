const db = require('../config/db');

async function getPublicprograms(req, res) {
    try {
        const [programs] = await db.query("SELECT id, name, description, duration, monthly_fee AS fee FROM program WHERE status = 'ACTIVE'");
        return res.status(200).json({ success: true, programs });
    } catch (error) {
        console.error("get programs error", error.message);
        return res.status(500).json({ message: "failed to fetch programs", error: error.message });
    }
}

module.exports = { getPublicprograms };