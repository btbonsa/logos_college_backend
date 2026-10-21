const db = require('../config/db');

async function getAllRegistrations(req, res) {
    const connection = await db.getConnection();
    try {
        const [count] = await connection.query(
            'SELECT COUNT(*) as total FROM registrations'
        );

        if (count[0].total === 0) {
            return res.status(200).json({
                success: true,
                registrations: [],
                message: "No registrations found in the database"
            });
        }

        const [registrations] = await connection.query(
            `
            SELECT
                r.id,
                r.registration_number,
                r.status AS registration_status,
                r.created_at AS registration_date,

                s.id AS student_id,
                s.first_name,
                s.last_name,
                s.gender,
                u.email,
                s.phone,

                p.id AS program_id,
                p.name AS program_name,
                p.description AS program_description,
                p.duration AS program_duration,
                p.monthly_fee AS program_fee,

                pay.id AS payment_id,
                pay.amount AS payment_amount,
                pay.payment_method,
                pay.transaction_references AS transaction_reference,
                pay.screenShoot_url AS screenshot_url,
                pay.status AS payment_status,
                pay.created_at AS payment_date

            FROM registrations r

            INNER JOIN students s
                ON r.student_id = s.id

            INNER JOIN users u
                ON s.user_id = u.id

            INNER JOIN program p
                ON r.program_id = p.id

            LEFT JOIN payments pay
                ON pay.registration_id = r.id

            ORDER BY r.created_at DESC
            `
        );

        const formattedRegistrations = registrations.map(reg => ({
            id: reg.id,
            registration_number: reg.registration_number,
            status: reg.registration_status,
            registration_date: reg.registration_date,
            student: {
                id: reg.student_id,
                first_name: reg.first_name,
                last_name: reg.last_name,
                gender: reg.gender,
                email: reg.email,
                phone: reg.phone
            },
            program: {
                id: reg.program_id,
                name: reg.program_name,
                description: reg.program_description,
                duration: reg.program_duration,
                fee: reg.program_fee
            },
            payment: reg.payment_id ? {
                id: reg.payment_id,
                amount: reg.payment_amount,
                payment_method: reg.payment_method,
                transaction_reference: reg.transaction_reference,
                screenshot_url: reg.screenshot_url,
                status: reg.payment_status,
                payment_date: reg.payment_date
            } : null
        }));

        return res.status(200).json({
            success: true,
            registrations: formattedRegistrations
        });

    } catch (error) {
        console.error("Get all registrations error:", error.message, error.sqlMessage);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch registrations",
            error: error.message,
            sqlMessage: error.sqlMessage
        });
    } finally {
        connection.release();
    }
}

module.exports = { getAllRegistrations };
