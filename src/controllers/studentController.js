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


async function getAllStudents(req, res) {
    try{
        const { program_name, registration_number } = req.query;

        let query = `
            SELECT
                s.id,
                s.user_id,
                s.first_name,
                s.last_name,
                s.gender,
                s.date_of_birth,
                r.registration_number,
                r.status AS registration_status,
                p.name AS program_name,
                p.description AS program_description,
                p.duration AS program_duration,
                p.monthly_fee AS program_fee
            FROM students s
            LEFT JOIN registrations r ON s.id = r.student_id
            LEFT JOIN program p ON r.program_id = p.id
            WHERE 1=1
        `;

        const params = [];

        if (program_name) {
            query += " AND p.name LIKE ?";
            params.push(`%${program_name}%`);
        }

        if (registration_number) {
            query += " AND r.registration_number LIKE ?";
            params.push(`%${registration_number}%`);
        }

        query += " ORDER BY s.id DESC";

        const [students] = await db.execute(query, params);
        return res.status(200).json(students);

    }catch(error){
        console.error("get all students error:", error.message, error.sqlMessage);
        return res.status(500).json({ message: "failed to fetch students", error: error.message, sqlMessage: error.sqlMessage });
    }


}

module.exports = { createStudentProfile, getAllStudents };
