const db = require('../config/db');

const { uploadIMage, deleteImage } = require('../utils/uploadImages');
const { notifyAdmins } = require('../utils/notifications');

async function createPayment(req, res) {
    const connection = await db.getConnection();
    let cloudinaryResult = null;
    try {
        await connection.beginTransaction();

        const studentUserId = req.user.id;

        const { payment_method, amount, transaction_references } = req.body;

        if (!payment_method || !amount) {
            await connection.rollback();
            return res.status(400).json({ message: "registration_number, payment_method and amount are required" });
        }

        if (!req.file) {
            await connection.rollback();
            return res.status(400).json({ message: "payment proof image is required" });
        }

        const [registrations] = await connection.query("SELECT r.id, r.student_id, r.program_id, r.status , p.name As program_name, p.monthly_fee As monthly_fee FROM registrations r INNER JOIN students s ON r.student_id = s.id INNER JOIN program p ON r.program_id = p.id WHERE  s.user_id = ? AND r.status IN ('PENDING', 'PAYMENT_REJECTED')", [studentUserId]);

        if (registrations.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "registration not found" });
        }

        const registration = registrations[0];

        if (Number(amount) !== Number(registration.monthly_fee)) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Payment amount must be ${registration.monthly_fee}`,
            });
        }

        if (registration.status === "REGISTERED") {
            await connection.rollback();
            return res.status(400).json({
                message: "This registration is already completed",
            });
        }

        cloudinaryResult = await uploadIMage(req.file, "college-registration/payment-proof");

        const [paymentResult] = await connection.query("INSERT INTO payments (registration_id, payment_method, amount, transaction_references, screenShoot_url, status) VALUES (?, ?, ?, ?, ?, 'PENDING')",
            [registration.id, payment_method, amount, transaction_references, cloudinaryResult.url]);

        await connection.query("UPDATE registrations SET status = 'PAYMENT_PENDING' WHERE id = ?", [registration.id]);

        await notifyAdmins({
            title: 'New payment submitted',
            message: `Payment of ${amount} ETB submitted for review`,
            type: 'NEW_PAYMENT',
            paymentId: paymentResult.insertId,
            connection,
        });

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "Payment submitted successfully",
            payment: {
                registration_id: registration.id,
                payment_id: paymentResult.insertId,
                program_name: registration.program_name,
                amount,
                payment_method,
                transaction_reference: transaction_references || null,
                screenshot_url: cloudinaryResult.url,
                status: "PENDING",
            },
        });

    } catch (error) {
        await connection.rollback();
        console.error("Create payment error:", error.message, error.sqlMessage);

        if (cloudinaryResult?.publicId) {
            try {
                await deleteImage(cloudinaryResult.publicId);
            } catch (deleteError) {
                console.error(
                    "Failed to delete Cloudinary image:",
                    deleteError
                );
            }
        }
        return res.status(500).json({ message: "failed to process payment", error: error.message, sqlMessage: error.sqlMessage });
    } finally {
        connection.release();
    }
}



module.exports = { createPayment  };

