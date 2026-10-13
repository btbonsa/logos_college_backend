const db = require('../config/db');
const { uploadIMage, deleteImage } = require('../utils/uploadImages');


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
                r.id AS registration_id,
                r.registration_number,
                r.status AS registration_status,
                p.name AS program_name,
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

async function editRegistration(req, res) {
    const connection = await db.getConnection();
    try {
        const { registration_id, program_id, status } = req.body;

        if (!registration_id) {
            return res.status(400).json({ message: "registration_id is required" });
        }

        await connection.beginTransaction();

        const updateFields = [];
        const params = [];

        if (program_id) {
            updateFields.push("program_id = ?");
            params.push(program_id);
        }

        if (status) {
            updateFields.push("status = ?");
            params.push(status);
        }

        if (updateFields.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "at least one field to update is required" });
        }

        params.push(registration_id);

        const query = `UPDATE registrations SET ${updateFields.join(", ")} WHERE id = ?`;
        await connection.query(query, params);

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "registration updated successfully"
        });
    } catch (error) {
        await connection.rollback();
        console.error("Edit registration error:", error.message, error.sqlMessage);
        return res.status(500).json({
            success: false,
            message: "failed to update registration",
            error: error.message,
            sqlMessage: error.sqlMessage
        });
    } finally {
        connection.release();
    }
}

async function suspendStudent(req, res) {
    const connection = await db.getConnection();
    try {
        const { student_id } = req.body;

        if (!student_id) {
            return res.status(400).json({ message: "student_id is required" });
        }

        await connection.beginTransaction();

        const [registrations] = await connection.query(
            "SELECT id FROM registrations WHERE student_id = ?",
            [student_id]
        );

        if (registrations.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "no registration found for this student" });
        }

        await connection.query(
            "UPDATE registrations SET status = 'SUSPENDED' WHERE student_id = ?",
            [student_id]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "student suspended successfully"
        });
    } catch (error) {
        await connection.rollback();
        console.error("Suspend student error:", error.message, error.sqlMessage);
        return res.status(500).json({
            success: false,
            message: "failed to suspend student",
            error: error.message,
            sqlMessage: error.sqlMessage
        });
    } finally {
        connection.release();
    }
}

async function updateStudentProfile(req, res) {
    const connection = await db.getConnection();
    let cloudinaryResult = null;
    try {
        await connection.beginTransaction();

        const user_id = req.user.id;
        const { bio } = req.body;
        const profile_photo = req.file;

        const [students] = await connection.query("SELECT * FROM students WHERE user_id = ?", [user_id]);

        if (students.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "student not found" });
        }

        const student = students[0];

        const [existingProfile] = await connection.query(
            "SELECT * FROM student_profiles WHERE student_id = ?",
            [student.id]
        );

        const updateFields = [];
        const params = [];

        if (profile_photo) {
            cloudinaryResult = await uploadIMage(profile_photo, "college-registration/student-profiles");
            updateFields.push("profile_photo_url = ?");
            params.push(cloudinaryResult.url);

            if (existingProfile.length > 0 && existingProfile[0].profile_photo_url) {
                try {
                    const publicId = existingProfile[0].profile_photo_url.split('/').pop().split('.')[0];
                    await deleteImage(`college-registration/student-profiles/${publicId}`);
                } catch (deleteError) {
                    console.warn("Failed to delete old image:", deleteError.message);
                }
            }
        }

        if (bio !== undefined) {
            updateFields.push("bio = ?");
            params.push(bio);
        }

        if (updateFields.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "at least one field to update is required" });
        }

        if (existingProfile.length > 0) {
            params.push(student.id);
            await connection.query(
                `UPDATE student_profiles SET ${updateFields.join(", ")} WHERE student_id = ?`,
                params
            );
        } else {
            const columnNames = updateFields.map(f => f.split(" = ")[0]);
            const insertParams = [student.id, ...params];
            await connection.query(
                `INSERT INTO student_profiles (student_id, ${columnNames.join(", ")}) VALUES (${insertParams.map(() => "?").join(", ")})`,
                insertParams
            );
        }

        await connection.commit();

        const [updatedProfile] = await connection.query(
            `SELECT s.*, sp.profile_photo_url, sp.bio, sp.updated_at
             FROM students s
             LEFT JOIN student_profiles sp ON s.id = sp.student_id
             WHERE s.user_id = ?`,
            [user_id]
        );

        return res.status(200).json({
            message: "student profile updated successfully",
            student: updatedProfile[0]
        });

    } catch (error) {
        await connection.rollback();
        if (cloudinaryResult && cloudinaryResult.publicId) {
            try {
                await deleteImage(cloudinaryResult.publicId);
            } catch (deleteError) {
                console.warn("Failed to rollback image upload:", deleteError.message);
            }
        }
        console.error("update student profile error:", error.message, error.sqlMessage);
        return res.status(500).json({ message: "failed to update student profile", error: error.message, sqlMessage: error.sqlMessage });
    } finally {
        connection.release();
    }
}

async function getStudentProfile(req, res) {
    try {
        const user_id = req.user.id;

        const [students] = await db.execute(
            `SELECT s.id, s.user_id, s.first_name, s.last_name, s.gender, s.date_of_birth,
                    sp.profile_photo_url, sp.bio, sp.updated_at
             FROM students s
             LEFT JOIN student_profiles sp ON s.id = sp.student_id
             WHERE s.user_id = ?`,
            [user_id]
        );

        if (students.length === 0) {
            return res.status(404).json({ message: "student profile not found" });
        }

        return res.status(200).json({ student: students[0] });

    } catch (error) {
        console.error("get student profile error:", error.message, error.sqlMessage);
        return res.status(500).json({ message: "failed to fetch student profile", error: error.message, sqlMessage: error.sqlMessage });
    }
}

module.exports = { createStudentProfile, getAllStudents, editRegistration, suspendStudent, updateStudentProfile, getStudentProfile };
