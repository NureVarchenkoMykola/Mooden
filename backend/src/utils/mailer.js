const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

exports.sendPasswordResetEmail = async (email, resetLink) => {
    await transporter.sendMail({
        from: `"Mooden" <${process.env.MAIL_USER}>`,
        to: email,
        subject: 'Mooden | Відновлення пароля',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
                <h2>Відновлення пароля Mooden</h2>

                <p>Ви отримали цей лист, тому що було надіслано запит на відновлення пароля.</p>

                <p>
                    <a href="${resetLink}"
                       style="display:inline-block;padding:12px 18px;background:#d4af37;color:#111;text-decoration:none;border-radius:8px;font-weight:bold;">
                        Відновити пароль
                    </a>
                </p>

                <p>Посилання дійсне протягом 15 хвилин.</p>

                <p>Якщо ви не надсилали цей запит, просто проігноруйте цей лист.</p>
            </div>
        `
    });
};