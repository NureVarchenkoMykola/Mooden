const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { sendPasswordResetEmail } = require('../utils/mailer');

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

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'EMAIL_REQUIRED' });
    }

    try {
        const userResult = await db.query(`
            SELECT id, email, is_blocked
            FROM public.users
            WHERE email = $1
        `, [email.trim().toLowerCase()]);

        if (userResult.rows.length === 0) {
            return res.json({ success: true });
        }

        const user = userResult.rows[0];

        if (user.is_blocked === true) {
            return res.json({ success: true });
        }

        await db.query(`
            DELETE FROM public.password_reset_tokens
            WHERE user_id = $1
        `, [user.id]);

        const token = crypto.randomBytes(32).toString('hex');

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        await db.query(`
            INSERT INTO public.password_reset_tokens (
                user_id,
                token_hash,
                expires_at
            )
            VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
        `, [user.id, tokenHash]);

        const resetLink = `${process.env.APP_FRONTEND_URL}/pages/reset-password.html?token=${token}`;

        await sendPasswordResetEmail(user.email, resetLink);

        res.json({ success: true });
    } catch (err) {
        console.error('[Dev Mode] Auth Forgot Password Error:', err.message);
        res.status(500).json({ message: 'PASSWORD_RESET_REQUEST_ERROR' });
    }
};

exports.verifyResetToken = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: 'RESET_TOKEN_REQUIRED' });
    }

    try {
        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const result = await db.query(`
            SELECT id
            FROM public.password_reset_tokens
            WHERE token_hash = $1
            AND expires_at > CURRENT_TIMESTAMP
        `, [tokenHash]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'RESET_TOKEN_EXPIRED' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Dev Mode] Auth Verify Reset Token Error:', err.message);
        res.status(500).json({ message: 'RESET_TOKEN_VERIFY_ERROR' });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, password, confirmPassword } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'RESET_TOKEN_REQUIRED' });
    }

    if (!password || !confirmPassword) {
        return res.status(400).json({ message: 'PASSWORD_FIELDS_REQUIRED' });
    }

    if (String(password).length < 6) {
        return res.status(400).json({ message: 'PASSWORD_TOO_SHORT' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'PASSWORDS_DO_NOT_MATCH' });
    }

    try {
        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const tokenResult = await db.query(`
            SELECT id, user_id
            FROM public.password_reset_tokens
            WHERE token_hash = $1
            AND expires_at > CURRENT_TIMESTAMP
        `, [tokenHash]);

        if (tokenResult.rows.length === 0) {
            return res.status(400).json({ message: 'RESET_TOKEN_EXPIRED' });
        }

        const resetToken = tokenResult.rows[0];

        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(password, salt);

        await db.query(`
            UPDATE public.users
            SET password_hash = $1
            WHERE id = $2
        `, [newHash, resetToken.user_id]);

        await db.query(`
            DELETE FROM public.password_reset_tokens
            WHERE user_id = $1
        `, [resetToken.user_id]);

        res.json({ success: true });
    } catch (err) {
        console.error('[Dev Mode] Auth Reset Password Error:', err.message);
        res.status(500).json({ message: 'PASSWORD_RESET_ERROR' });
    }
};