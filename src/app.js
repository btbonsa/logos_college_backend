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
const paymentRoute = require('./routes/paymentroutes');
const adminPaymentRoute = require('./routes/adminpaymentroute');
const classScheduleRoute = require('./routes/classScheduleRoute');
const superadminRoute = require('./routes/superadminRoute');
const programRoute = require('./routes/programs');
const portfolioRoute = require('./routes/portifolioroute');
const certificateRoutes = require('./routes/certificateRoutes');
const notificationRoute = require('./routes/notificationRoutes');

const app = express();

const PORT = process.env.PORT;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
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
            error: error.message
        });
    }
});

app.use('/api/auth', authLimiter, authRoute);
app.use('/api/admin/auth', authLimiter, adminAuthRoute);
app.use('/api/students', studentRoute);
app.use('/api/registration', registrationRoute);
app.use('/api/payments', paymentRoute);
app.use('/api/admin', adminPaymentRoute);
app.use('/api/classes', classScheduleRoute);
app.use('/api/superadmin', superadminRoute);
app.use('/api/programs', programRoute);
app.use('/api/portfolios', portfolioRoute);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoute);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`server started on ${PORT}`)
});
module.exports = app;





