const db = require('../db');
const bcrypt = require('bcrypt');

exports.getSidebarData = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        if (role === 'student') {
            const result = await db.query(`
                SELECT u.full_name, u.lang, g.name_uk, g.name_en,
                (
                    SELECT COUNT(*)
                    FROM public.tasks t
                    JOIN public.courses c ON c.id = t.course_id
                    JOIN public.student_courses sc ON t.course_id = sc.course_id
                    LEFT JOIN public.grades gr ON gr.task_id = t.id AND gr.student_id = $1
                    LEFT JOIN public.submissions s ON s.task_id = t.id AND s.student_id = $1
                    WHERE sc.student_id = $1
                    AND COALESCE(c.is_hidden, false) = false
                    AND COALESCE(t.is_hidden, false) = false
                    AND gr.task_id IS NULL
                    AND s.id IS NULL
                ) as badge_tasks,
                (
                    SELECT COUNT(*)
                    FROM public.announcements a
                    WHERE (
                        a.course_id IS NULL
                        OR a.course_id IN (
                            SELECT sc.course_id
                            FROM public.student_courses sc
                            JOIN public.courses c ON c.id = sc.course_id
                            WHERE sc.student_id = $1
                            AND COALESCE(c.is_hidden, false) = false
                        )
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM public.read_announcements ra
                        WHERE ra.announcement_id = a.id
                        AND ra.user_id = $1
                    )
                ) as badge_announcements,

                (SELECT COUNT(*) FROM public.notifications WHERE user_id = $1 AND is_read = false) as badge_notif
                FROM public.users u
                JOIN public.students s ON u.id = s.user_id
                LEFT JOIN public.groups g ON s.group_id = g.id
                WHERE u.id = $1
            `, [userId]);

            if (result.rows.length === 0) return res.status(404).json({ message: 'USER_NOT_FOUND' });
            const row = result.rows[0];

            return res.json({
                full_name: row.full_name,
                lang: row.lang,
                sub_info: row.lang === 'en' ? (row.name_en || row.name_uk) : row.name_uk,
                badges: { 
                    tasks: parseInt(row.badge_tasks) || 0, 
                    announcements: parseInt(row.badge_announcements) || 0,
                    notifications: parseInt(row.badge_notif) || 0 
                }
            });

        } else if (role === 'teacher') {
            const result = await db.query(`
                SELECT u.full_name, u.lang, t.title_uk, t.title_en, d.name_uk, d.name_en,
                (
                    SELECT COUNT(*)
                    FROM public.submissions s
                    JOIN public.tasks tsk ON s.task_id = tsk.id
                    JOIN public.courses c ON c.id = tsk.course_id
                    JOIN public.teacher_courses tc ON tsk.course_id = tc.course_id
                    LEFT JOIN public.grades g 
                        ON g.task_id = s.task_id 
                        AND g.student_id = s.student_id
                    WHERE tc.teacher_id = $1
                    AND COALESCE(c.is_hidden, false) = false
                    AND COALESCE(tsk.is_hidden, false) = false
                    AND g.task_id IS NULL
                ) as badge_grading,
                (
                    SELECT COUNT(*)
                    FROM public.announcements a
                    WHERE (
                        a.course_id IS NULL
                        OR a.course_id IN (
                            SELECT tc.course_id
                            FROM public.teacher_courses tc
                            JOIN public.courses c ON c.id = tc.course_id
                            WHERE tc.teacher_id = $1
                            AND COALESCE(c.is_hidden, false) = false
                        )
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM public.read_announcements ra
                        WHERE ra.announcement_id = a.id
                        AND ra.user_id = $1
                    )
                ) as badge_announcements,

                (SELECT COUNT(*) FROM public.notifications WHERE user_id = $1 AND is_read = false) as badge_notif
                FROM public.users u
                JOIN public.teachers t ON u.id = t.user_id
                LEFT JOIN public.departments d ON t.department_id = d.id
                WHERE u.id = $1
            `, [userId]);

            if (result.rows.length === 0) return res.status(404).json({ message: 'USER_NOT_FOUND' });
            const row = result.rows[0];

            const title = row.lang === 'en' ? (row.title_en || row.title_uk) : row.title_uk;
            const dept = row.lang === 'en' ? (row.name_en || row.name_uk) : row.name_uk;

            return res.json({
                full_name: row.full_name,
                lang: row.lang,
                sub_info: `${title} • ${dept}`,
                badges: { 
                    tasks: parseInt(row.badge_grading) || 0, 
                    announcements: parseInt(row.badge_announcements) || 0,
                    notifications: parseInt(row.badge_notif) || 0 
                }
            });
        }
        else if (role === 'moderator') {
            const result = await db.query(`
                SELECT 
                    u.full_name,
                    u.lang,
                    (
                        SELECT COUNT(*)
                        FROM public.announcements a
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM public.read_announcements ra
                            WHERE ra.announcement_id = a.id
                            AND ra.user_id = $1
                        )
                    ) as badge_announcements,
                    (
                        SELECT COUNT(*)
                        FROM public.notifications
                        WHERE user_id = $1
                        AND is_read = false
                    ) as badge_notif
                FROM public.users u
                WHERE u.id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'USER_NOT_FOUND' });
            }

            const row = result.rows[0];

            return res.json({
                full_name: row.full_name,
                lang: row.lang || 'uk',
                sub_info: row.lang === 'en' ? 'System moderator' : 'Модератор системи',
                badges: {
                    tasks: 0,
                    announcements: parseInt(row.badge_announcements) || 0,
                    notifications: parseInt(row.badge_notif) || 0
                }
            });
        }

        return res.status(403).json({ message: 'ROLE_ERROR' });

    } catch (err) {
        console.error("[Dev Mode] Sidebar Controller Error:", err.message);
        res.status(500).json({ message: 'SIDEBAR_ERROR' });
    }
};


exports.changePassword = async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'PASSWORD_FIELDS_REQUIRED' });
    }

    if (String(newPassword).length < 6) {
        return res.status(400).json({ message: 'PASSWORD_TOO_SHORT' });
    }

    try {
        const user = await db.query('SELECT password_hash FROM public.users WHERE id = $1', [userId]);
        
        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'USER_NOT_FOUND' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.rows[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'WRONG_OLD_PASSWORD' });
        }

        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE public.users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

        res.json({ success: true });
    } catch (err) {
        console.error("[Dev Mode] Change Password Error:", err.message);
        res.status(500).json({ message: 'PASSWORD_UPDATE_ERROR' });
    }
};

exports.getNotifications = async (req, res) => {
    const userId = req.user.id;

    try {
        const langResult = await db.query(
            'SELECT lang FROM public.users WHERE id = $1',
            [userId]
        );

        const lang = langResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT 
                id,
                message_${lang} AS message,
                is_read,
                created_at
            FROM public.notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);

        res.json({
            user: { lang },
            notifications: result.rows
        });
    } catch (err) {
        console.error("[Dev Mode] Notifications Error:", err.message);
        res.status(500).json({ message: "NOTIFICATIONS_ERROR" });
    }
};

exports.markNotificationRead = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        await db.query(`
            UPDATE public.notifications
            SET is_read = true
            WHERE id = $1 AND user_id = $2
        `, [id, userId]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "NOTIFICATION_READ_ERROR" });
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    const userId = req.user.id;

    try {
        await db.query(`
            UPDATE public.notifications
            SET is_read = true
            WHERE user_id = $1
        `, [userId]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "NOTIFICATION_READ_ERROR" });
    }
};

exports.getAnnouncements = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        const langResult = await db.query(
            'SELECT lang FROM public.users WHERE id = $1',
            [userId]
        );

        const lang = langResult.rows[0]?.lang || 'uk';
        if (!['student', 'teacher', 'moderator'].includes(role)) {
            return res.status(403).json({ message: 'ROLE_ERROR' });
        }

        let query;
        let params = [userId];

        if (role === 'moderator') {
            query = `
                SELECT 
                    a.id,
                    a.title_${lang} AS title,
                    a.content_${lang} AS content,
                    a.created_at,
                    u.full_name AS author_name,
                    c.title_${lang} AS course_name,
                    CASE WHEN ra.user_id IS NULL THEN false ELSE true END AS is_read
                FROM public.announcements a
                LEFT JOIN public.users u ON a.author_id = u.id
                LEFT JOIN public.courses c ON a.course_id = c.id
                LEFT JOIN public.read_announcements ra 
                    ON ra.announcement_id = a.id AND ra.user_id = $1
                ORDER BY a.created_at DESC
            `;
        } else {
            const courseFilter = role === 'teacher'
                ? `
                    SELECT tc.course_id
                    FROM public.teacher_courses tc
                    JOIN public.courses c ON c.id = tc.course_id
                    WHERE tc.teacher_id = $1
                    AND COALESCE(c.is_hidden, false) = false
                `
                : `
                    SELECT sc.course_id
                    FROM public.student_courses sc
                    JOIN public.courses c ON c.id = sc.course_id
                    WHERE sc.student_id = $1
                    AND COALESCE(c.is_hidden, false) = false
                `;

            query = `
                SELECT 
                    a.id,
                    a.title_${lang} AS title,
                    a.content_${lang} AS content,
                    a.created_at,
                    u.full_name AS author_name,
                    c.title_${lang} AS course_name,
                    CASE WHEN ra.user_id IS NULL THEN false ELSE true END AS is_read
                FROM public.announcements a
                LEFT JOIN public.users u ON a.author_id = u.id
                LEFT JOIN public.courses c ON a.course_id = c.id
                LEFT JOIN public.read_announcements ra 
                    ON ra.announcement_id = a.id AND ra.user_id = $1
                WHERE a.course_id IS NULL
                OR a.course_id IN (${courseFilter})
                ORDER BY a.created_at DESC
            `;
        }

        const result = await db.query(query, params);

        res.json({
            user: { lang },
            announcements: result.rows
        });
    } catch (err) {
        console.error("[Dev Mode] Announcements Error:", err.message);
        res.status(500).json({ message: "ANNOUNCEMENTS_ERROR" });
    }
};

exports.markAnnouncementRead = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        await db.query(`
            INSERT INTO public.read_announcements (user_id, announcement_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
        `, [userId, id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "ANNOUNCEMENT_READ_ERROR" });
    }
};

exports.markAllAnnouncementsRead = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        if (role === 'moderator') {
            await db.query(`
                INSERT INTO public.read_announcements (user_id, announcement_id)
                SELECT $1, a.id
                FROM public.announcements a
                ON CONFLICT DO NOTHING
            `, [userId]);

            return res.json({ success: true });
        }

        const courseFilter = role === 'teacher'
            ? `
                SELECT tc.course_id
                FROM public.teacher_courses tc
                JOIN public.courses c ON c.id = tc.course_id
                WHERE tc.teacher_id = $1
                AND COALESCE(c.is_hidden, false) = false
            `
            : `
                SELECT sc.course_id
                FROM public.student_courses sc
                JOIN public.courses c ON c.id = sc.course_id
                WHERE sc.student_id = $1
                AND COALESCE(c.is_hidden, false) = false
            `;

        await db.query(`
            INSERT INTO public.read_announcements (user_id, announcement_id)
            SELECT $1, a.id
            FROM public.announcements a
            WHERE a.course_id IS NULL
            OR a.course_id IN (${courseFilter})
            ON CONFLICT DO NOTHING
        `, [userId]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "ANNOUNCEMENT_READ_ERROR" });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { lang } = req.body;
        const userId = req.user.id;

        if (!['uk', 'en'].includes(lang)) {
            return res.status(400).json({ error: 'Unsupported language' });
        }

        await db.query('UPDATE public.users SET lang = $1 WHERE id = $2', [lang, userId]);

        res.json({ success: true });
    } catch (err) {
        console.error('[Dev Mode] User Settings Error:', err.message);
        res.status(500).json({ message: 'ERROR_UPDATE_SETTINGS' });
    }
};