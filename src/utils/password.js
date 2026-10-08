const bcrypt = require('bcryptjs');

const ROUNDS = 12;

async function hash_password(password) {
    return await bcrypt.hash(password, ROUNDS);
}

async function compare_password(password, hash_password) {
    return await bcrypt.compare(password, hash_password);

}

module.exports = {
    hash_password,
    compare_password
}