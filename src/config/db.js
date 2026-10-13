const mysql = require('mysql2/promise');
const fs = require('fs');

const sslConfig = {
    rejectUnauthorized: true
};

// Load CA certificate if provided
if (process.env.DB_CA_CERT_PATH) {
    try {
        sslConfig.ca = fs.readFileSync(process.env.DB_CA_CERT_PATH);
    } catch (error) {
        console.warn('Could not load CA certificate from DB_CA_CERT_PATH:', error.message);
        // Fallback to rejectUnauthorized: false in development if cert not found
        if (process.env.NODE_ENV !== 'production') {
            sslConfig.rejectUnauthorized = false;
            console.warn('Development mode: SSL verification disabled. This is not safe for production!');
        }
    }
} else if (process.env.NODE_ENV !== 'production') {
    // In development without a cert, allow self-signed certificates
    sslConfig.rejectUnauthorized = false;
    console.warn('Development mode: SSL verification disabled. This is not safe for production!');
}

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: sslConfig
});

module.exports = db;

