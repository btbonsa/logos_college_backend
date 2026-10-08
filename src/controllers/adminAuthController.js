const db = require("../config/db");

const { compare_password } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

async function adminLogin(req, res) {

    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required" });
        }

        // Query for users with ADMIN or SUPER_ADMIN role using email
        const [users] = await db.query(
            "SELECT id, phone, email, hash_password, role, status FROM users WHERE email = ? AND role IN ('ADMIN', 'SUPER_ADMIN')",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid credentials or unauthorized access" });
        }

        const user = users[0];

        if (user.status !== "ACTIVE") {
            return res.status(403).json({ message: "account is deactivated" });
        };

        const passwordValid = await compare_password(password, user.hash_password);

        if (!passwordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = generateToken({
            id: user.id,
            role: user.role
        });

        return res.status(200).json({
            success: true,
            message: "admin login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Admin login error:", error);
        return res.status(500).json({ message: "failed to login", error: error.message });
    }

}

module.exports = { adminLogin };
