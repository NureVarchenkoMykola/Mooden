const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

exports.login = async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        const authErrorCode = 'INVALID_CREDENTIALS';

        if (userRes.rows.length === 0) {
            return res.status(401).json({ message: authErrorCode });
        }

        const user = userRes.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ message: authErrorCode });
        }
        
        if (user.is_blocked === true) {
            return res.status(403).json({ message: 'USER_BLOCKED' });
        }

        const expiresIn = rememberMe ? '7d' : '24h';
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn }
        );

        res.status(200).json({
            token: token,
            role: user.role,
            message: 'SUCCESS'
        });

    } catch (err) {
        console.error('[Dev Mode] Server auth error:', err.message);
        res.status(500).json({ message: 'SERVER_ERROR' });
    }
};