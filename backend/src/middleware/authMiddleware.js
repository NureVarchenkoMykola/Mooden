const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'UNAUTHORIZED' });
    }

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        const result = await db.query(
            'SELECT id, role, is_blocked FROM public.users WHERE id = $1',
            [user.id]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ message: 'INVALID_TOKEN' });
        }

        const dbUser = result.rows[0];

        if (dbUser.is_blocked === true) {
            return res.status(403).json({ message: 'USER_BLOCKED' });
        }

        req.user = {
            id: dbUser.id,
            role: dbUser.role
        };

        next();
    } catch (err) {
        return res.status(403).json({ message: 'INVALID_TOKEN' });
    }
};

module.exports = authenticateToken;