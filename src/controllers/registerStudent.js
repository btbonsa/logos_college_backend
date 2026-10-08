const db = require('../config/db');



async function createRegistration(req, res) {

    const connection = await db.getConnection();
    try {
        const user = req.user.id;
        const { program_id } = req.body;

        if (!program_id) {
            return res.status(400).json({ message: "program_id is required" });
        }

        await connection.beginTransaction();


        const [student] = await connection.query("SELECT id FROM students WHERE user_id = ?", [user]);

        if (student.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "student profile does not exist" });

        }

        const studentId = student[0].id;

        const [program] = await connection.query("SELECT id , name , monthly_fee FROM program WHERE id = ? AND status = 'ACTIVE'", [program_id]);

        if (program.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "program not found or inactive" });
        }

        const [exstingRegistration] = await connection.query("SELECT id, registration_number, status FROM registrations WHERE student_id = ? AND program_id = ? AND status NOT IN ('CANCELLED')", [studentId, program_id]);

        if (exstingRegistration.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "student already registered for this program" });
        }

        const registrationNumber = `REG-${Date.now()}-${studentId}`;

        const [result] = await connection.query("INSERT INTO registrations (student_id, program_id, registration_number, status) VALUES (?, ?, ?, 'PENDING')", [studentId, program_id, registrationNumber]);

        await connection.commit();
        return res.status(201).json({
            message: "student registered successfully", registration: {
                id: result.insertId,
                registration_number: registrationNumber,
                student_id: studentId,
                program_id: program_id,
                course: program[0].name,
                fee: program[0].monthly_fee,
                status: "PENDING"
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error("Registration error:", error.message, error.sqlMessage);
        return res.status(500).json({ message: "failed to register student", error: error.message, sqlMessage: error.sqlMessage });
    } finally {
        connection.release();
    }

}

async function getMyRegistration(req, res) {
    
  try {
    const studentUserId = req.user.id;

    const [registrations] = await db.query(
      `
      SELECT
        r.id,
        r.registration_number,
        r.status AS registration_status,
        r.created_at AS registration_date,
        s.first_name,
        s.last_name,

        p.id AS program_id,
        p.name AS program_name,
        p.description AS program_description,
        p.duration AS program_duration,
        p.monthly_fee AS program_fee,

        pay.id AS payment_id,
        pay.amount AS payment_amount,
        pay.payment_method,
        pay.transaction_references,
        pay.screenShoot_url,
        pay.status AS payment_status,
        pay.rejected_reason,
        pay.created_at AS payment_date,
        pay.reviewed_at AS payment_reviewed_at

      FROM registrations r

      INNER JOIN students s
        ON r.student_id = s.id

      INNER JOIN program p
        ON r.program_id = p.id

      LEFT JOIN payments pay
        ON pay.registration_id = r.id

      WHERE s.user_id = ?

      ORDER BY r.created_at DESC
      LIMIT 1
      `,
      [studentUserId]
    );

    if (registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No registration found",
      });
    }

    const registration = registrations[0];

    return res.status(200).json({
      success: true,

      registration: {
        student: {
          first_name: registration.first_name,
          last_name: registration.last_name,
        },
        registration_number:
          registration.registration_number,

        status:
          registration.registration_status,

        registration_date:
          registration.registration_date,

        program: {
          name: registration.program_name,
          description:
            registration.program_description,
          duration:
            registration.program_duration,
          fee: registration.program_fee,
        },

        payment: registration.payment_id
          ? {
              amount: registration.payment_amount,
              payment_method:
                registration.payment_method,
              transaction_reference:
                registration.transaction_reference,
              screenshot_url:
                registration.screenshot_url,
              status:
                registration.payment_status,
              rejection_reason:
                registration.rejection_reason,
              payment_date:
                registration.payment_date,
              reviewed_at:
                registration.payment_reviewed_at,
            }
          : null,
      },
    });

  } catch (error) {
    console.error(
      "Get my registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch registration", error: error.message, sqlMessage: error.sqlMessage
    });
  }
};

module.exports = { createRegistration, getMyRegistration };