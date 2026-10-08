const { verifyToken } = require('../utils/jwt');

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'access token required' });
        }

        const token = authHeader.slice('Bearer '.length).trim();
        if (!token) {
            return res.status(401).json({ error: 'access token required' });
        }

        const decoded = verifyToken(token);
        req.user = {
            id: decoded.id,
            role: typeof decoded.role === 'string' ? decoded.role.toUpperCase() : decoded.role
        };
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'invalid or expired token' });
    }
}

module.exports = authenticate;