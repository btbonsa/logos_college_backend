const jwt = require('jsonwebtoken');

function getSecret() {
    const SECRET = process.env.JWT_SECRET
    if (!SECRET) {
        throw new Error("JWT_SECRET is not defined in the environment variables");
    }
    return SECRET;
}

function generateToken(payload) {
    const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

    return jwt.sign(payload, getSecret(), { expiresIn: EXPIRES_IN });


}

 function verifyToken(token) {

   return jwt.verify(token, getSecret());
    
}

module.exports = {
    generateToken,

    verifyToken
}