const db = require('../db');
const bcrypt = require('bcrypt');

function ensureModerator(req, res) {
    if (!req.user || req.user.role !== 'moderator') {
        res.status(403).json({ message: 'ACCESS_DENIED' });
        return false;
    }

    return true;
}

async function createModeratorNotification(moderatorId, messageUk, messageEn) {
    await db.query(`
        INSERT INTO public.notifications (
            user_id,
            message_uk,
            message_en,
            is_read,
            created_at
        )
        VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
    `, [moderatorId, messageUk, messageEn]);
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

                (
                    SELECT COUNT(*)
                    FROM public.courses
                    WHERE COALESCE(is_hidden, false) = false
                ) AS total_courses,

                (
                    SELECT COUNT(*)
                    FROM public.tasks t
                    JOIN public.courses c ON c.id = t.course_id
                    WHERE COALESCE(c.is_hidden, false) = false
                    AND COALESCE(t.is_hidden, false) = false
                ) AS total_tasks,

                (
                    SELECT COUNT(*)
                    FROM public.submissions s
                    JOIN public.tasks t ON t.id = s.task_id
                    JOIN public.courses c ON c.id = t.course_id
                    WHERE COALESCE(c.is_hidden, false) = false
                    AND COALESCE(t.is_hidden, false) = false
                ) AS total_submissions,

                (SELECT COUNT(*) FROM public.announcements) AS total_announcements,
                (SELECT COUNT(*) FROM public.notifications WHERE user_id = $1 AND is_read = false) AS unread_notifications,

                (
                    SELECT COUNT(*)
                    FROM public.schedule s
                    JOIN public.courses c ON c.id = s.course_id
                    WHERE COALESCE(s.is_open_for_attendance, false) = true
                    AND COALESCE(c.is_hidden, false) = false
                ) AS open_attendance
        `, [userId]);

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
            WHERE COALESCE(c.is_hidden, false) = false
            AND COALESCE(t.is_hidden, false) = false
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
            WHERE NOT EXISTS (
                SELECT 1
                FROM public.read_announcements ra
                WHERE ra.announcement_id = a.id
                AND ra.user_id = $1
            )
            ORDER BY a.created_at DESC
            LIMIT 5
        `, [userId]);

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

exports.getProfileData = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const userId = req.user.id;

    try {
        const profileResult = await db.query(`
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.role,
                u.lang,
                u.created_at,
                COALESCE(m.access_level, 1) AS access_level
            FROM public.users u
            LEFT JOIN public.moderators m ON m.user_id = u.id
            WHERE u.id = $1
            AND u.role = 'moderator'
        `, [userId]);

        if (profileResult.rows.length === 0) {
            return res.status(404).json({ message: 'MODERATOR_NOT_FOUND' });
        }

        const statsResult = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM public.users) AS total_users,

                (
                    SELECT COUNT(*)
                    FROM public.courses
                    WHERE COALESCE(is_hidden, false) = false
                ) AS total_courses,

                (SELECT COUNT(*) FROM public.announcements) AS total_announcements,

                (
                    SELECT COUNT(*)
                    FROM public.schedule s
                    JOIN public.courses c ON c.id = s.course_id
                    WHERE COALESCE(s.is_open_for_attendance, false) = true
                    AND COALESCE(c.is_hidden, false) = false
                ) AS open_attendance
        `);

        const profile = profileResult.rows[0];
        const stats = statsResult.rows[0] || {};

        res.json({
            moderator: {
                id: profile.id,
                full_name: profile.full_name,
                email: profile.email,
                role: profile.role,
                lang: profile.lang || 'uk',
                created_at: profile.created_at,
                access_level: Number(profile.access_level || 1)
            },
            stats: {
                totalUsers: Number(stats.total_users || 0),
                totalCourses: Number(stats.total_courses || 0),
                totalAnnouncements: Number(stats.total_announcements || 0),
                openAttendance: Number(stats.open_attendance || 0)
            }
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Profile Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_PROFILE_ERROR' });
    }
};

exports.updateProfileData = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const userId = req.user.id;
    const { full_name, email, lang } = req.body;

    const allowedLangs = ['uk', 'en'];

    const cleanName = String(full_name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanLang = allowedLangs.includes(lang) ? lang : 'uk';

    if (!cleanName || !cleanEmail) {
        return res.status(400).json({ message: 'INVALID_PROFILE_DATA' });
    }

    try {
        const duplicate = await db.query(
            'SELECT id FROM public.users WHERE email = $1 AND id <> $2',
            [cleanEmail, userId]
        );

        if (duplicate.rows.length > 0) {
            return res.status(409).json({ message: 'EMAIL_ALREADY_EXISTS' });
        }

        const result = await db.query(`
            UPDATE public.users
            SET
                full_name = $1,
                email = $2,
                lang = $3
            WHERE id = $4
            AND role = 'moderator'
            RETURNING
                id,
                full_name,
                email,
                role,
                lang,
                created_at
        `, [cleanName, cleanEmail, cleanLang, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'MODERATOR_NOT_FOUND' });
        }

        res.json({
            success: true,
            moderator: result.rows[0]
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Profile Update Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_PROFILE_UPDATE_ERROR' });
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

    if (!cleanName) {
        return res.status(400).json({ message: 'FULL_NAME_REQUIRED' });
    }

    if (!cleanEmail) {
        return res.status(400).json({ message: 'EMAIL_REQUIRED' });
    }

    if (cleanPassword.length < 6) {
        return res.status(400).json({ message: 'PASSWORD_TOO_SHORT' });
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

        const user = result.rows[0];

        await ensureRoleProfile(user.id, cleanRole);

        await createModeratorNotification(
            req.user.id,
            `Ви додали користувача "${user.full_name}" з роллю "${user.role}".`,
            `You added the user "${user.full_name}" with the role "${user.role}".`
        );

        res.status(201).json({
            success: true,
            user
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

        const user = result.rows[0];

        await createModeratorNotification(
            req.user.id,
            user.is_blocked
                ? `Ви заблокували користувача "${user.full_name}".`
                : `Ви розблокували користувача "${user.full_name}".`,
            user.is_blocked
                ? `You blocked the user "${user.full_name}".`
                : `You unblocked the user "${user.full_name}".`
        );

        res.json({
            success: true,
            user
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Block User Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_BLOCK_USER_ERROR' });
    }
};

exports.getCourses = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const userId = req.user.id;

    try {
        const langResult = await db.query(
            'SELECT lang FROM public.users WHERE id = $1',
            [userId]
        );

        const lang = langResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT
                c.id,
                c.title_uk,
                c.title_en,
                c.description_uk,
                c.description_en,
                c.title_${lang} AS title,
                c.description_${lang} AS description,
                c.color_accent,
                COALESCE(c.is_hidden, false) AS is_hidden,
                COUNT(DISTINCT sc.student_id) AS students_count,
                COUNT(DISTINCT tc.teacher_id) AS teachers_count,
                COUNT(DISTINCT t.id) FILTER (WHERE COALESCE(t.is_hidden, false) = false) AS tasks_count
            FROM public.courses c
            LEFT JOIN public.student_courses sc ON c.id = sc.course_id
            LEFT JOIN public.teacher_courses tc ON c.id = tc.course_id
            LEFT JOIN public.tasks t ON c.id = t.course_id
            GROUP BY
                c.id,
                c.title_uk,
                c.title_en,
                c.description_uk,
                c.description_en,
                c.title_${lang},
                c.description_${lang},
                c.color_accent,
                c.is_hidden
            ORDER BY c.title_${lang} ASC
        `);

        res.json({
            user: { lang },
            courses: result.rows
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Courses Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_COURSES_ERROR' });
    }
};

exports.createCourse = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const {
        title_uk,
        title_en,
        description_uk,
        description_en,
        color_accent
    } = req.body;

    const cleanTitleUk = String(title_uk || '').trim();
    const cleanTitleEn = String(title_en || '').trim();
    const cleanDescriptionUk = String(description_uk || '').trim();
    const cleanDescriptionEn = String(description_en || '').trim();
    const cleanColor = String(color_accent || '#E8A44A').trim();

    if (!cleanTitleUk) {
        return res.status(400).json({ message: 'INVALID_COURSE_DATA' });
    }

    try {
        const result = await db.query(`
            INSERT INTO public.courses (
                title_uk,
                title_en,
                description_uk,
                description_en,
                color_accent,
                is_hidden
            )
            VALUES ($1, $2, $3, $4, $5, false)
            RETURNING
                id,
                title_uk,
                title_en,
                description_uk,
                description_en,
                color_accent,
                COALESCE(is_hidden, false) AS is_hidden
        `, [
            cleanTitleUk,
            cleanTitleEn,
            cleanDescriptionUk,
            cleanDescriptionEn,
            cleanColor
        ]);

        const course = result.rows[0];

        await createModeratorNotification(
            req.user.id,
            `Ви створили курс "${course.title_uk}".`,
            `You created the course "${course.title_en || course.title_uk}".`
        );

        res.status(201).json({
            success: true,
            course
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Course Create Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_COURSE_CREATE_ERROR' });
    }
};

exports.updateCourse = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id } = req.params;
    const {
        title_uk,
        title_en,
        description_uk,
        description_en,
        color_accent
    } = req.body;

    const cleanTitleUk = String(title_uk || '').trim();
    const cleanTitleEn = String(title_en || '').trim();
    const cleanDescriptionUk = String(description_uk || '').trim();
    const cleanDescriptionEn = String(description_en || '').trim();
    const cleanColor = String(color_accent || '#E8A44A').trim();

    if (!cleanTitleUk) {
        return res.status(400).json({ message: 'INVALID_COURSE_DATA' });
    }

    try {
        const result = await db.query(`
            UPDATE public.courses
            SET
                title_uk = $1,
                title_en = $2,
                description_uk = $3,
                description_en = $4,
                color_accent = $5
            WHERE id = $6
            RETURNING
                id,
                title_uk,
                title_en,
                description_uk,
                description_en,
                color_accent,
                COALESCE(is_hidden, false) AS is_hidden
        `, [
            cleanTitleUk,
            cleanTitleEn,
            cleanDescriptionUk,
            cleanDescriptionEn,
            cleanColor,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'COURSE_NOT_FOUND' });
        }

        res.json({
            success: true,
            course: result.rows[0]
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Course Update Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_COURSE_UPDATE_ERROR' });
    }
};

exports.updateCourseVisibility = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id } = req.params;
    const { isHidden } = req.body;

    if (typeof isHidden !== 'boolean') {
        return res.status(400).json({ message: 'INVALID_COURSE_VISIBILITY' });
    }

    try {
        const result = await db.query(`
            UPDATE public.courses
            SET is_hidden = $1
            WHERE id = $2
            RETURNING
                id,
                title_uk,
                title_en,
                description_uk,
                description_en,
                color_accent,
                COALESCE(is_hidden, false) AS is_hidden
        `, [isHidden, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'COURSE_NOT_FOUND' });
        }

        const course = result.rows[0];

        await createModeratorNotification(
            req.user.id,
            course.is_hidden
                ? `Ви приховали курс "${course.title_uk}".`
                : `Ви відновили курс "${course.title_uk}".`,
            course.is_hidden
                ? `You hid the course "${course.title_en || course.title_uk}".`
                : `You restored the course "${course.title_en || course.title_uk}".`
        );

        res.json({
            success: true,
            course
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Course Visibility Update Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_COURSE_VISIBILITY_ERROR' });
    }
};

exports.getCourseMembers = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id } = req.params;

    try {
        const studentsResult = await db.query(`
            SELECT
                u.id,
                u.full_name,
                u.email
            FROM public.student_courses sc
            JOIN public.users u ON sc.student_id = u.id
            WHERE sc.course_id = $1
            ORDER BY u.full_name ASC
        `, [id]);

        const teachersResult = await db.query(`
            SELECT
                u.id,
                u.full_name,
                u.email
            FROM public.teacher_courses tc
            JOIN public.users u ON tc.teacher_id = u.id
            WHERE tc.course_id = $1
            ORDER BY u.full_name ASC
        `, [id]);

        res.json({
            students: studentsResult.rows,
            teachers: teachersResult.rows
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Course Members Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_COURSE_MEMBERS_ERROR' });
    }
};

exports.addStudentToCourse = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id } = req.params;
    const { studentId } = req.body;

    try {
        const studentResult = await db.query(`
            SELECT id
            FROM public.users
            WHERE id = $1 AND role = 'student'
        `, [studentId]);

        if (studentResult.rows.length === 0) {
            return res.status(400).json({ message: 'INVALID_STUDENT' });
        }

        const insertResult = await db.query(`
            INSERT INTO public.student_courses (student_id, course_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            RETURNING student_id, course_id
        `, [studentId, id]);

        if (insertResult.rows.length > 0) {
            const infoResult = await db.query(`
                SELECT 
                    u.full_name AS user_name,
                    c.title_uk AS course_title_uk,
                    c.title_en AS course_title_en
                FROM public.users u
                JOIN public.courses c ON c.id = $2
                WHERE u.id = $1
            `, [studentId, id]);

            const info = infoResult.rows[0];

            if (info) {
                await createModeratorNotification(
                    req.user.id,
                    `Ви додали студента "${info.user_name}" до курсу "${info.course_title_uk}".`,
                    `You added the student "${info.user_name}" to the course "${info.course_title_en || info.course_title_uk}".`
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Dev Mode] Moderator Add Student To Course Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_ADD_STUDENT_ERROR' });
    }
};

exports.removeStudentFromCourse = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id, studentId } = req.params;

    try {
        const infoResult = await db.query(`
            SELECT 
                u.full_name AS user_name,
                c.title_uk AS course_title_uk,
                c.title_en AS course_title_en
            FROM public.users u
            JOIN public.courses c ON c.id = $2
            WHERE u.id = $1
        `, [studentId, id]);

        const deleteResult = await db.query(`
            DELETE FROM public.student_courses
            WHERE course_id = $1 AND student_id = $2
            RETURNING student_id, course_id
        `, [id, studentId]);

        if (deleteResult.rows.length > 0) {
            const info = infoResult.rows[0];

            if (info) {
                await createModeratorNotification(
                    req.user.id,
                    `Ви видалили студента "${info.user_name}" з курсу "${info.course_title_uk}".`,
                    `You removed the student "${info.user_name}" from the course "${info.course_title_en || info.course_title_uk}".`
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Dev Mode] Moderator Remove Student From Course Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_REMOVE_STUDENT_ERROR' });
    }
};

exports.addTeacherToCourse = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id } = req.params;
    const { teacherId } = req.body;

    try {
        const teacherResult = await db.query(`
            SELECT id
            FROM public.users
            WHERE id = $1 AND role = 'teacher'
        `, [teacherId]);

        if (teacherResult.rows.length === 0) {
            return res.status(400).json({ message: 'INVALID_TEACHER' });
        }

        const insertResult = await db.query(`
            INSERT INTO public.teacher_courses (teacher_id, course_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            RETURNING teacher_id, course_id
        `, [teacherId, id]);

        if (insertResult.rows.length > 0) {
            const infoResult = await db.query(`
                SELECT 
                    u.full_name AS user_name,
                    c.title_uk AS course_title_uk,
                    c.title_en AS course_title_en
                FROM public.users u
                JOIN public.courses c ON c.id = $2
                WHERE u.id = $1
            `, [teacherId, id]);

            const info = infoResult.rows[0];

            if (info) {
                await createModeratorNotification(
                    req.user.id,
                    `Ви додали викладача "${info.user_name}" до курсу "${info.course_title_uk}".`,
                    `You added the teacher "${info.user_name}" to the course "${info.course_title_en || info.course_title_uk}".`
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Dev Mode] Moderator Add Teacher To Course Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_ADD_TEACHER_ERROR' });
    }
};

exports.removeTeacherFromCourse = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const { id, teacherId } = req.params;

    try {
        const infoResult = await db.query(`
            SELECT 
                u.full_name AS user_name,
                c.title_uk AS course_title_uk,
                c.title_en AS course_title_en
            FROM public.users u
            JOIN public.courses c ON c.id = $2
            WHERE u.id = $1
        `, [teacherId, id]);

        const deleteResult = await db.query(`
            DELETE FROM public.teacher_courses
            WHERE course_id = $1 AND teacher_id = $2
            RETURNING teacher_id, course_id
        `, [id, teacherId]);

        if (deleteResult.rows.length > 0) {
            const info = infoResult.rows[0];

            if (info) {
                await createModeratorNotification(
                    req.user.id,
                    `Ви видалили викладача "${info.user_name}" з курсу "${info.course_title_uk}".`,
                    `You removed the teacher "${info.user_name}" from the course "${info.course_title_en || info.course_title_uk}".`
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Dev Mode] Moderator Remove Teacher From Course Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_REMOVE_TEACHER_ERROR' });
    }
};

exports.getActivity = async (req, res) => {
    if (!ensureModerator(req, res)) return;

    const userId = req.user.id;

    try {
        const langResult = await db.query(
            'SELECT lang FROM public.users WHERE id = $1',
            [userId]
        );

        const lang = langResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT *
            FROM (
                SELECT
                    CONCAT('submission-', s.id) AS id,
                    'submission' AS type,
                    t.title_${lang} AS title,
                    NULL AS description,
                    u.full_name AS student_name,
                    c.title_${lang} AS course_title,
                    NULL AS author_name,
                    s.submitted_at AS created_at
                FROM public.submissions s
                JOIN public.users u ON s.student_id = u.id
                JOIN public.tasks t ON s.task_id = t.id
                JOIN public.courses c ON t.course_id = c.id
                WHERE COALESCE(c.is_hidden, false) = false
                AND COALESCE(t.is_hidden, false) = false

                UNION ALL

                SELECT
                    CONCAT('announcement-', a.id) AS id,
                    'announcement' AS type,
                    a.title_${lang} AS title,
                    a.content_${lang} AS description,
                    NULL AS student_name,
                    c.title_${lang} AS course_title,
                    u.full_name AS author_name,
                    a.created_at AS created_at
                FROM public.announcements a
                LEFT JOIN public.users u ON a.author_id = u.id
                LEFT JOIN public.courses c ON a.course_id = c.id
                WHERE a.course_id IS NULL
                OR COALESCE(c.is_hidden, false) = false

                UNION ALL

                SELECT
                    CONCAT('notification-', n.id) AS id,
                    'notification' AS type,
                    n.message_${lang} AS title,
                    n.message_${lang} AS description,
                    u.full_name AS student_name,
                    NULL AS course_title,
                    NULL AS author_name,
                    n.created_at AS created_at
                FROM public.notifications n
                LEFT JOIN public.users u ON n.user_id = u.id

                UNION ALL
                SELECT
                    CONCAT('attendance-', a.student_id, '-', a.schedule_id) AS id,
                    'attendance' AS type,
                    c.title_${lang} AS title,
                    CONCAT(
                        TO_CHAR(sch.time_start, 'HH24:MI'),
                        ' - ',
                        TO_CHAR(sch.time_end, 'HH24:MI')
                    ) AS description,
                    u.full_name AS student_name,
                    c.title_${lang} AS course_title,
                    NULL AS author_name,
                    a.marked_at AS created_at
                FROM public.attendance a
                JOIN public.users u ON a.student_id = u.id
                JOIN public.schedule sch ON a.schedule_id = sch.id
                JOIN public.courses c ON sch.course_id = c.id
                WHERE COALESCE(c.is_hidden, false) = false
            ) activity
            ORDER BY created_at DESC
            LIMIT 80
        `);

        res.json({
            user: { lang },
            activity: result.rows
        });
    } catch (err) {
        console.error('[Dev Mode] Moderator Activity Error:', err.message);
        res.status(500).json({ message: 'MODERATOR_ACTIVITY_ERROR' });
    }
};