const db = require("../config/db");

const { hash_password, compare_password } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

async function signup(req, res) {

    const connection = await db.getConnection();
    try {
        const { phone, email, password } = req.body;

        if (!phone || !email || !password) {
            return res.status(400).json({ message: "all fields are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "password must be at least 6 characters long" });
        }

        await connection.beginTransaction();

        const [existingUser] = await connection.query("SELECT id FROM users WHERE email = ? OR phone = ?", [email, phone]);

        if (existingUser.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "user with this email or phone number already exists" });
        };

        const passwordHash = await hash_password(password);

        const [result] = await connection.query("INSERT INTO users (phone, email, hash_password, role, status) VALUES (?, ?, ?, 'STUDENT', 'ACTIVE')", [phone, email, passwordHash]);

        const userId = result.insertId;

        const token = generateToken({ id: userId, role: "STUDENT" });

        await connection.commit();

        return res.status(201).json({
            message: "user registered successfully",
            token,
            user: { id: userId, phone, email, role: "STUDENT" }
        });
    } catch (error) {
        await connection.rollback();
        console.error("Signup error:", error.message, error.sqlMessage);
        return res.status(500).json({ message: "failed to register", error: error.message, sqlMessage: error.sqlMessage });
    } finally {
        connection.release();
    }
};


async function login(req, res) {

    try {

        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ message: "phone and password are required" });
        }

        const [users] = await db.query("SELECT id, phone, email, hash_password, role, status FROM users WHERE phone = ? ", [phone]);
        if (users.length === 0) {
            return res.status(400).json({ message: "phone or password is incorrect" });
        }

        const user = users[0];

        if (user.status !== "ACTIVE") {
            return res.status(403).json({ message: "account is deactivated" });
        };

        const passwordValid = await compare_password(password, user.hash_password);

        if (!passwordValid) {
            return res.status(400).json({ message: "phone or password is incorrect" });
        }

        const token = generateToken({
            id: user.id,
            role: user.role
        });

        return res.status(200).json({
            message: "login successful",
            token,
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "failed to login", error: error.message });
    }

}

module.exports = { signup , login };
