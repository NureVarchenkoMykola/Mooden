const db = require('../db');
const bcrypt = require('bcrypt');

function ensureModerator(req, res) {
    if (!req.user || req.user.role !== 'moderator') {
        res.status(403).json({ message: 'ACCESS_DENIED' });
        return false;
    }

    return true;
}

exports.getDashboardData = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const userId = req.user.id;

    try {
        const langResult = await db.query(
            'SELECT lang FROM public.users WHERE id = $1',
            [userId]
        );

        const lang = langResult.rows[0]?.lang || 'uk';

        const statsResult = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM public.users) AS total_users,
                (SELECT COUNT(*) FROM public.users WHERE role = 'student') AS total_students,
                (SELECT COUNT(*) FROM public.users WHERE role = 'teacher') AS total_teachers,
                (SELECT COUNT(*) FROM public.users WHERE role = 'moderator') AS total_moderators,
                (SELECT COUNT(*) FROM public.courses) AS total_courses,
                (SELECT COUNT(*) FROM public.tasks WHERE COALESCE(is_hidden, false) = false) AS total_tasks,
                (SELECT COUNT(*) FROM public.submissions) AS total_submissions,
                (SELECT COUNT(*) FROM public.announcements) AS total_announcements,
                (SELECT COUNT(*) FROM public.notifications WHERE is_read = false) AS unread_notifications,
                (SELECT COUNT(*) FROM public.schedule WHERE COALESCE(is_open_for_attendance, false) = true) AS open_attendance
        `);

        const usersResult = await db.query(`
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.role,
                u.lang,
                u.created_at,
                g.name_${lang} AS group_name,
                t.title_${lang} AS teacher_title,
                d.name_${lang} AS department_name
            FROM public.users u
            LEFT JOIN public.students s ON u.id = s.user_id
            LEFT JOIN public.groups g ON s.group_id = g.id
            LEFT JOIN public.teachers t ON u.id = t.user_id
            LEFT JOIN public.departments d ON t.department_id = d.id
            ORDER BY u.created_at DESC
            LIMIT 12
        `);

        const coursesResult = await db.query(`
            SELECT
                c.id,
                c.title_${lang} AS title,
                c.description_${lang} AS description,
                c.color_accent,
                COUNT(DISTINCT sc.student_id) AS students_count,
                COUNT(DISTINCT tc.teacher_id) AS teachers_count,
                COUNT(DISTINCT t.id) FILTER (WHERE COALESCE(t.is_hidden, false) = false) AS tasks_count
            FROM public.courses c
            LEFT JOIN public.student_courses sc ON c.id = sc.course_id
            LEFT JOIN public.teacher_courses tc ON c.id = tc.course_id
            LEFT JOIN public.tasks t ON c.id = t.course_id
            GROUP BY c.id, c.title_${lang}, c.description_${lang}, c.color_accent
            ORDER BY c.title_${lang} ASC
            LIMIT 10
        `);

        const activityResult = await db.query(`
            SELECT
                s.id,
                s.submitted_at AS created_at,
                u.full_name AS student_name,
                c.title_${lang} AS course_title,
                t.title_${lang} AS task_title
            FROM public.submissions s
            JOIN public.users u ON s.student_id = u.id
            JOIN public.tasks t ON s.task_id = t.id
            JOIN public.courses c ON t.course_id = c.id
            ORDER BY s.submitted_at DESC
            LIMIT 8
        `);

        const announcementsResult = await db.query(`
            SELECT
                a.id,
                a.title_${lang} AS title,
                a.created_at,
                u.full_name AS author_name,
                c.title_${lang} AS course_title
            FROM public.announcements a
            LEFT JOIN public.users u ON a.author_id = u.id
            LEFT JOIN public.courses c ON a.course_id = c.id
            ORDER BY a.created_at DESC
            LIMIT 6
        `);

        const stats = statsResult.rows[0] || {};

        res.json({
            user: {
                lang
            },
            stats: {
                totalUsers: Number(stats.total_users || 0),
                totalStudents: Number(stats.total_students || 0),
                totalTeachers: Number(stats.total_teachers || 0),
                totalModerators: Number(stats.total_moderators || 0),
                totalCourses: Number(stats.total_courses || 0),
                totalTasks: Number(stats.total_tasks || 0),
                totalSubmissions: Number(stats.total_submissions || 0),
                totalAnnouncements: Number(stats.total_announcements || 0),
                unreadNotifications: Number(stats.unread_notifications || 0),
                openAttendance: Number(stats.open_attendance || 0)
            },
            users: usersResult.rows,
            courses: coursesResult.rows,
            activity: activityResult.rows,
            announcements: announcementsResult.rows
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Dashboard Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_DASHBOARD_ERROR' });
    }
};

exports.getUsers = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    try {
        const result = await db.query(`
            SELECT
                id,
                full_name,
                email,
                role,
                lang,
                created_at,
                COALESCE(is_blocked, false) AS is_blocked
            FROM public.users
            ORDER BY created_at DESC
        `);

        res.json({ users: result.rows });
    } catch (err) {
        console.error('[Dev Mode] Moderator Users Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_USERS_ERROR' });
    }
};

async function ensureRoleProfile(userId, role) {
    if (role === 'student') {
        const studentResult = await db.query(
            'SELECT user_id FROM public.students WHERE user_id = $1',
            [userId]
        );

        if (studentResult.rows.length === 0) {
            await db.query(
                'INSERT INTO public.students (user_id) VALUES ($1)',
                [userId]
            );
        }
    }

    if (role === 'teacher') {
        const teacherResult = await db.query(
            'SELECT user_id FROM public.teachers WHERE user_id = $1',
            [userId]
        );

        if (teacherResult.rows.length === 0) {
            await db.query(
                'INSERT INTO public.teachers (user_id) VALUES ($1)',
                [userId]
            );
        }
    }

    if (role === 'moderator') {
        const moderatorResult = await db.query(
            'SELECT user_id FROM public.moderators WHERE user_id = $1',
            [userId]
        );

        if (moderatorResult.rows.length === 0) {
            await db.query(
                'INSERT INTO public.moderators (user_id, access_level) VALUES ($1, $2)',
                [userId, 1]
            );
        }
    }
}

exports.updateUserRole = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['student', 'teacher', 'moderator'];

    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'INVALID_ROLE' });
    }

    if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ message: 'CANNOT_CHANGE_OWN_ROLE' });
    }

    try {
        const result = await db.query(`
            UPDATE public.users
            SET role = $1
            WHERE id = $2
            RETURNING
                id,
                full_name,
                email,
                role,
                lang,
                created_at,
                COALESCE(is_blocked, false) AS is_blocked
        `, [role, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'USER_NOT_FOUND' });
        }

        await ensureRoleProfile(id, role);

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Role Update Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_ROLE_UPDATE_ERROR' });
    }
};

exports.createUser = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { full_name, email, role, lang, password } = req.body;

    const allowedRoles = ['student', 'teacher', 'moderator'];
    const allowedLangs = ['uk', 'en'];

    const cleanName = String(full_name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanRole = allowedRoles.includes(role) ? role : 'student';
    const cleanLang = allowedLangs.includes(lang) ? lang : 'uk';
    const cleanPassword = String(password || '');

    if (!cleanName || !cleanEmail || cleanPassword.length < 6) {
        return res.status(400).json({ message: 'INVALID_USER_DATA' });
    }

    try {
        const existing = await db.query(
            'SELECT id FROM public.users WHERE email = $1',
            [cleanEmail]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'EMAIL_ALREADY_EXISTS' });
        }

        const passwordHash = await bcrypt.hash(cleanPassword, 10);

        const result = await db.query(`
            INSERT INTO public.users (
                full_name,
                email,
                password_hash,
                role,
                lang,
                is_blocked
            )
            VALUES ($1, $2, $3, $4, $5, false)
            RETURNING
                id,
                full_name,
                email,
                role,
                lang,
                created_at,
                COALESCE(is_blocked, false) AS is_blocked
        `, [cleanName, cleanEmail, passwordHash, cleanRole, cleanLang]);

        await ensureRoleProfile(result.rows[0].id, cleanRole);

        res.status(201).json({
            success: true,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Create User Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_CREATE_USER_ERROR' });
    }
};

exports.updateUser = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id } = req.params;
    const { full_name, email, role, lang } = req.body;

    const allowedRoles = ['student', 'teacher', 'moderator'];
    const allowedLangs = ['uk', 'en'];

    const cleanName = String(full_name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanRole = allowedRoles.includes(role) ? role : null;
    const cleanLang = allowedLangs.includes(lang) ? lang : 'uk';

    if (!cleanName || !cleanEmail || !cleanRole) {
        return res.status(400).json({ message: 'INVALID_USER_DATA' });
    }

    if (Number(id) === Number(req.user.id) && cleanRole !== req.user.role) {
        return res.status(400).json({ message: 'CANNOT_CHANGE_OWN_ROLE' });
    }

    try {
        const duplicate = await db.query(
            'SELECT id FROM public.users WHERE email = $1 AND id <> $2',
            [cleanEmail, id]
        );

        if (duplicate.rows.length > 0) {
            return res.status(409).json({ message: 'EMAIL_ALREADY_EXISTS' });
        }

        const result = await db.query(`
            UPDATE public.users
            SET
                full_name = $1,
                email = $2,
                role = $3,
                lang = $4
            WHERE id = $5
            RETURNING
                id,
                full_name,
                email,
                role,
                lang,
                created_at,
                COALESCE(is_blocked, false) AS is_blocked
        `, [cleanName, cleanEmail, cleanRole, cleanLang, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'USER_NOT_FOUND' });
        }

        await ensureRoleProfile(id, cleanRole);

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Update User Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_UPDATE_USER_ERROR' });
    }
};

exports.updateUserBlockStatus = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id } = req.params;
    const { isBlocked } = req.body;

    if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ message: 'CANNOT_BLOCK_SELF' });
    }

    if (typeof isBlocked !== 'boolean') {
        return res.status(400).json({ message: 'INVALID_BLOCK_STATUS' });
    }

    try {
        const result = await db.query(`
            UPDATE public.users
            SET is_blocked = $1
            WHERE id = $2
            RETURNING
                id,
                full_name,
                email,
                role,
                lang,
                created_at,
                COALESCE(is_blocked, false) AS is_blocked
        `, [isBlocked, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'USER_NOT_FOUND' });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Block User Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_BLOCK_USER_ERROR' });
    }
};