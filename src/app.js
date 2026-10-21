require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/db')

const authRoute = require('./routes/authroutes');
const adminAuthRoute = require('./routes/adminAuthRoutes');
const studentRoute = require('./routes/studentroute');
const registrationRoute = require('./routes/registrationmiddleware');
const adminRegistrationRoute = require('./routes/adminRegistrationRoute');
const paymentRoute = require('./routes/paymentroutes');
const adminPaymentRoute = require('./routes/adminpaymentroute');
const classScheduleRoute = require('./routes/classScheduleRoute');
const superadminRoute = require('./routes/superadminRoute');
const programRoute = require('./routes/programs');
const portfolioRoute = require('./routes/portifolioroute');
const certificateRoutes = require('./routes/certificateRoutes');
const notificationRoute = require('./routes/notificationRoutes');
const cleanupRoute = require('./routes/cleanupRoute');

const app = express();

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50,   message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
  ];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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
            error: "Database connection failed"
        });
    }
});

app.use('/api/auth', authLimiter, authRoute);
app.use('/api/admin/auth', authLimiter, adminAuthRoute);
app.use('/api/students', studentRoute);
app.use('/api/registration', registrationRoute);
app.use('/api/admin', adminRegistrationRoute);
app.use('/api/payments', paymentRoute);
app.use('/api/admin', adminPaymentRoute);
app.use('/api/classes', classScheduleRoute);
app.use('/api/superadmin', superadminRoute);
app.use('/api/programs', programRoute);
app.use('/api/portfolios', portfolioRoute);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoute);
app.use('/api/cleanup', cleanupRoute);

module.exports = app;
