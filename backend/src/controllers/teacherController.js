const db = require('../db');

exports.getDashboardData = async (req, res) => {
    const userId = req.user.id;

    try {
        const profile = await db.query(`
            SELECT u.full_name, u.lang, t.title_uk, t.title_en, t.rating, d.name_uk, d.name_en
            FROM public.users u
            JOIN public.teachers t ON u.id = t.user_id
            LEFT JOIN public.departments d ON t.department_id = d.id
            WHERE u.id = $1
        `, [userId]);

        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'USER_NOT_FOUND' });
        }

        const user = profile.rows[0];
        const lang = user.lang || 'uk';

        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM public.teacher_courses WHERE teacher_id = $1) as active_courses,
                (SELECT COUNT(DISTINCT sc.student_id) FROM public.student_courses sc 
                JOIN public.teacher_courses tc ON sc.course_id = tc.course_id WHERE tc.teacher_id = $1) as total_students,
                (SELECT COUNT(*) FROM public.submissions s 
                JOIN public.tasks t ON s.task_id = t.id 
                JOIN public.teacher_courses tc ON t.course_id = tc.course_id 
                WHERE tc.teacher_id = $1 AND s.grade IS NULL) as pending_grading
        `, [userId]);

        const courses = await db.query(`
            SELECT c.id, c.title_${lang} AS title, c.color_accent,
                COALESCE(ROUND(AVG(sc.progress_percent), 0), 0) as group_avg_progress
            FROM public.courses c
            JOIN public.teacher_courses tc ON c.id = tc.course_id
            LEFT JOIN public.student_courses sc ON c.id = sc.course_id
            WHERE tc.teacher_id = $1
            GROUP BY c.id, c.title_${lang}, c.color_accent
        `, [userId]);

        const schedule = await db.query(`
            SELECT s.id as lesson_id, c.title_${lang} AS title, s.time_start, s.time_end,
                s.type_${lang} AS type, g.name_${lang} AS group_name, c.color_accent
            FROM public.schedule s
            JOIN public.courses c ON s.course_id = c.id
            JOIN public.groups g ON s.group_id = g.id
            WHERE s.teacher_id = $1 
            AND s.lesson_date = CURRENT_DATE
            ORDER BY s.time_start ASC
        `, [userId]);

        const announcements = await db.query(`
            SELECT a.id, a.title_${lang} AS title, a.content_${lang} AS content, a.created_at, 
                    c.title_${lang} AS course_name
            FROM public.announcements a
            LEFT JOIN public.courses c ON a.course_id = c.id
            WHERE (a.course_id IS NULL OR a.course_id IN (
                SELECT tc.course_id FROM public.teacher_courses tc WHERE tc.teacher_id = $1
            ))
            AND NOT EXISTS (
                SELECT 1 FROM public.read_announcements ra 
                WHERE ra.announcement_id = a.id AND ra.user_id = $1
            )
            ORDER BY a.created_at DESC 
            LIMIT 3
        `, [userId]);

        res.json({
            user: {
                full_name: user.full_name,
                lang: lang,
                title: user.lang === 'en' ? (user.title_en || user.title_uk) : user.title_uk,
                department: lang === 'en' ? (user.name_en || user.name_uk) : user.name_uk 
            },
            stats: {
                activeCourses: parseInt(stats.rows[0].active_courses) || 0,
                totalStudents: parseInt(stats.rows[0].total_students) || 0,
                pendingGrading: parseInt(stats.rows[0].pending_grading) || 0,
                avgRating: parseFloat(user.rating) || 5.0
            },
            courses: courses.rows,
            schedule: schedule.rows,
            announcements: announcements.rows
        });

    } catch (err) {
        console.error("Teacher Dashboard Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_DASHBOARD' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await db.query(
            'INSERT INTO public.read_announcements (user_id, announcement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, id]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'ERROR_MARK_READ' });
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
        res.status(500).json({ message: 'ERROR_UPDATE_SETTINGS' });
    }
};