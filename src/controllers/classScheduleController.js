const pool = require("../config/db");

const createClassSchedule = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      registration_id,
      class_start_date,
      class_start_time,
      location,
      message,
    } = req.body;

    // Validate required fields
    if (!registration_id || !class_start_date) {
      return res.status(400).json({
        success: false,
        message:
          "Registration ID and class start date are required",
      });
    }

    const adminUserId = req.user.id;

    await connection.beginTransaction();

    // Check registration
    const [registrations] = await connection.execute(
      `
      SELECT
        r.id,
        r.registration_number,
        r.status,
        s.first_name,
        s.last_name,
        u.email,
        p.name AS program_name

      FROM registrations r

      INNER JOIN students s
        ON r.student_id = s.id

      INNER JOIN users u
        ON s.user_id = u.id

      INNER JOIN program p
        ON r.program_id = p.id

      WHERE r.id = ?

      FOR UPDATE
      `,
      [registration_id]
    );

    if (registrations.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    const registration = registrations[0];

    // Only approved registrations can receive a class schedule
    if (registration.status !== "REGISTERED") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Class schedule can only be created for a registered student",
        registration_status: registration.status,
      });
    }

    // Check if a schedule already exists
    const [existingSchedules] = await connection.execute(
      `
      SELECT id
      FROM class_schedules
      WHERE registration_id = ?
      LIMIT 1
      `,
      [registration_id]
    );

    if (existingSchedules.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          "A class schedule already exists for this registration",
        schedule_id: existingSchedules[0].id,
      });
    }

    // Create schedule
    const [result] = await connection.execute(
      `
      INSERT INTO class_schedules (
        registration_id,
        class_start_date,
        class_start_time,
        location,
        message,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        registration_id,
        class_start_date,
        class_start_time || null,
        location || null,
        message || null,
        adminUserId,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Class schedule created successfully",

      schedule: {
        id: result.insertId,
        registration_id: registration.id,
        registration_number:
          registration.registration_number,

        student: {
          first_name: registration.first_name,
          last_name: registration.last_name,
          email: registration.email,
        },

        program_name: registration.program_name,

        class_start_date,
        class_start_time:
          class_start_time || null,
        location: location || null,
        message: message || null,

        created_by: adminUserId,
      },
    });

  } catch (error) {
    await connection.rollback();

    console.error(
      "Create class schedule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create class schedule",
    });

  } finally {
    connection.release();
  }
};

const getMyClassSchedule = async (req, res) => {
  try {
    const studentUserId = req.user.id;

    const [schedules] = await pool.query(
      `SELECT cs.id, cs.registration_id, cs.class_start_date, cs.class_start_time, cs.location, cs.message
       FROM class_schedules cs
       INNER JOIN registrations r ON cs.registration_id = r.id
       INNER JOIN students s ON r.student_id = s.id
       WHERE s.user_id = ?
       ORDER BY cs.created_at DESC
       LIMIT 1`,
      [studentUserId]
    );

    if (schedules.length === 0) {
      return res.status(404).json({ success: false, message: "No class schedule found" });
    }

    return res.status(200).json({ success: true, schedule: schedules[0] });

  } catch (error) {
    console.error("Get class schedule error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch class schedule" });
  }
};

module.exports = {
  createClassSchedule,
  getMyClassSchedule,
};