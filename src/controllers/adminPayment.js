const db = require('../config/db');

async function getPendingPayment(req, res) {
  try {

    const [payments] = await db.query(`
      SELECT
        p.id,
        p.registration_id,
        p.amount,
        p.payment_method,
        p.transaction_references,
        p.screenShoot_url,
        p.status,
        p.created_at,

        r.registration_number,
        r.status AS registration_status,

        s.id AS student_id,
        s.first_name,
        s.last_name,

        u.email,
        u.phone,

        pr.id AS program_id,
        pr.name AS program_name

      FROM payments p

      INNER JOIN registrations r
        ON p.registration_id = r.id

      INNER JOIN students s
        ON r.student_id = s.id

      INNER JOIN users u
        ON s.user_id = u.id

      INNER JOIN program pr
        ON r.program_id = pr.id

      WHERE p.status = 'PENDING'

      ORDER BY p.created_at ASC
    `);

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    return res.status(500).json({ message: 'Failed to fetch pending payments', error: error.message })

  }

}




async function reviewPayment(req, res) {

  const connection = await db.getConnection();

  try {

    const { id } = req.params;

    const { status, rejection_reason } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be APPROVED or REJECTED",
      });
    }
    if (
      status === "REJECTED" &&
      (!rejection_reason || !rejection_reason.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }
    await connection.beginTransaction();

    const [payments] = await connection.query("SELECT id, registration_id, status FROM payments WHERE id = ? FOR UPDATE", [id]);

    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }


    const payment = payments[0];

    if (payment.status !== "PENDING") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment has already been ${payment.status.toLowerCase()}`,
      });
    }

    await connection.query("UPDATE payments SET status = ?, rejected_reason = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?", [
      status,
      status === "REJECTED" ? rejection_reason.trim() : null,
      id
    ]);

    const registrationStatus = status === 'APPROVED' ? 'REGISTERED' : 'PAYMENT_REJECTED';

    await connection.query("UPDATE registrations SET status = ? WHERE id = ?", [registrationStatus, payment.registration_id]);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: status === "APPROVED" ? "Payment approved successfully" : "Payment rejected successfully",
      payment: {
        id: Number(id),
        status,
        registration_id: payment.registration_id,
        registration_status: registrationStatus,
      },
    });

  } catch (error) {
    await connection.rollback();
    console.error('Review payment error:', error);
    return res.status(500).json({ message: 'Failed to review payment', error: error.message })
  }finally{
    await connection.release();
  }

}

module.exports = { getPendingPayment, reviewPayment };