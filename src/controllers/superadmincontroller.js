const pool = require("../config/db");

async function  getDashboardStats(req, res) {
  try {
    // Total students
    const [[studentStats]] = await pool.execute(`
      SELECT COUNT(*) AS total_students
      FROM students
    `);

    // Registration statistics
    const [[registrationStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_registrations,

        SUM(
          CASE
            WHEN status = 'PENDING'
            THEN 1
            ELSE 0
          END
        ) AS pending_registrations,

        SUM(
          CASE
            WHEN status = 'PAYMENT_PENDING'
            THEN 1
            ELSE 0
          END
        ) AS payment_pending_registrations,

        SUM(
          CASE
            WHEN status = 'REGISTERED'
            THEN 1
            ELSE 0
          END
        ) AS registered_students,

        SUM(
          CASE
            WHEN status = 'PAYMENT_REJECTED'
            THEN 1
            ELSE 0
          END
        ) AS payment_rejected_registrations

      FROM registrations
    `);

    // Payment statistics
    const [[paymentStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_payments,

        SUM(
          CASE
            WHEN status = 'PENDING'
            THEN 1
            ELSE 0
          END
        ) AS pending_payments,

        SUM(
          CASE
            WHEN status = 'APPROVED'
            THEN 1
            ELSE 0
          END
        ) AS approved_payments,

        SUM(
          CASE
            WHEN status = 'REJECTED'
            THEN 1
            ELSE 0
          END
        ) AS rejected_payments,

        COALESCE(
          SUM(
            CASE
              WHEN status = 'APPROVED'
              THEN amount
              ELSE 0
            END
          ),
          0
        ) AS total_approved_amount

      FROM payments
    `);

    // Program statistics
    const [[programStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_programa,

        SUM(
          CASE
            WHEN status = 'ACTIVE'
            THEN 1
            ELSE 0
          END
        ) AS active_programs,

        SUM(
          CASE
            WHEN status = 'INACTIVE'
            THEN 1
            ELSE 0
          END
        ) AS inactive_programs

      FROM program
    `);

    return res.status(200).json({
      success: true,

      dashboard: {
        students: {
          total: Number(studentStats.total_students),
        },

        registrations: {
          total: Number(
            registrationStats.total_registrations
          ),

          pending: Number(
            registrationStats.pending_registrations || 0
          ),

          payment_pending: Number(
            registrationStats.payment_pending_registrations || 0
          ),

          registered: Number(
            registrationStats.registered_students || 0
          ),

          payment_rejected: Number(
            registrationStats.payment_rejected_registrations || 0
          ),
        },

        payments: {
          total: Number(
            paymentStats.total_payments
          ),

          pending: Number(
            paymentStats.pending_payments || 0
          ),

          approved: Number(
            paymentStats.approved_payments || 0
          ),

          rejected: Number(
            paymentStats.rejected_payments || 0
          ),

          total_approved_amount:
            Number(
              paymentStats.total_approved_amount || 0
            ),
        },

        programs: {
          total: Number(
            programStats.total_programs
          ),

          active: Number(
            programStats.active_programs || 0
          ),

          inactive: Number(
            programStats.inactive_programs || 0
          ),
        },
      },
    });

  } catch (error) {
    console.error(
      "Get super admin dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch dashboard statistics",
    });
  }
};

module.exports = {
  getDashboardStats,
};