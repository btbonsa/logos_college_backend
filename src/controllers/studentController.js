const db = require('../config/db');

async function createStudentProfile(req, res) {

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const user = req.user.id;

        const { first_name, last_name, gender, date_of_birth } = req.body;

        if (!first_name || !last_name || !gender || !date_of_birth) {
            return res.status(400).json({ message: "all fields are required" });
        }

        const [student] = await connection.query("SELECT user_id FROM students WHERE user_id = ?", [user]);

        if (student.length > 0) {
            return res.status(400).json({ message: "student profile already exists" });
        };

        await connection.query("INSERT INTO students(user_id, first_name, last_name, gender, date_of_birth) VALUES(?, ?, ?, ?, ?)", [user, first_name, last_name, gender, date_of_birth]);

        await connection.commit();
        return res.status(201).json({ message: "student profile created successfully", student: { user_id: user, first_name, last_name, gender, date_of_birth } });

    } catch (error) {
        await connection.rollback();
        console.error("Create student profile error:", error.message, error.sqlMessage);
        return res.status(500).json({ message: "failed to create student profile", error: error.message, sqlMessage: error.sqlMessage });
    } finally {
        connection.release();
    }
}

module.exports = { createStudentProfile };
