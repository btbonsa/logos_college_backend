require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/db')

const authRoute = require('./routes/authroutes');
const adminAuthRoute = require('./routes/adminAuthRoutes');
const studentRoute = require('./routes/studentroute');
const registrationRoute = require('./routes/registrationmiddleware');
const paymentRoute = require('./routes/paymentroutes');
const adminPaymentRoute = require('./routes/adminpaymentroute');
const classScheduleRoute = require('./routes/classScheduleRoute');
const superadminRoute = require('./routes/superadminRoute');
const programRoute = require('./routes/programs');

const app = express();

const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'welcome to my application' })
});

app.get('/health', async (req, res) => {
    try {
        const [status] = await pool.query('SELECT 1 AS DATABASE_status');

        res.json({
            status: "OK",
            server: "running",
            database: "connected",
            result: status[0]

        })

    } catch (error) {
        console.error("database error", error);
        res.status(500).json({
            status: "ERROR",
            server: "running",
            database: "not connected",
            error: error.message
        });
    }
});

app.use('/api/auth', authRoute);
app.use('/api/admin/auth', adminAuthRoute);
app.use('/api/students', studentRoute);
app.use('/api/registration', registrationRoute);
app.use('/api/payments', paymentRoute);
app.use('/api/admin', adminPaymentRoute);
app.use('/api/classes', classScheduleRoute);
app.use('/api/superadmin', superadminRoute);
app.use('/api/programs', programRoute);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`server started on ${PORT}`)
});
module.exports = app;





