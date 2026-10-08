function authorizeRole(...allowedRole) {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({ error: 'authorization required' })
        }
        if (!allowedRole.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access Denied' })
        }
        next();

    }
}

module.exports = authorizeRole;