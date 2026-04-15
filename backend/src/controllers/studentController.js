const db = require('../db');

exports.getDashboardData = async (req, res) => {
    const userId = req.user.id;

    try {
        const profile = await db.query(`
            SELECT u.full_name, u.lang, g.name_uk, g.name_en, s.coins
            FROM users u
            JOIN students s ON u.id = s.user_id
            LEFT JOIN groups g ON s.group_id = g.id
            WHERE u.id = $1
        `, [userId]);

        const user = profile.rows[0];
        const lang = user.lang || 'uk';

        const stats = await db.query(`
            SELECT 
                ROUND(AVG(grade_value), 1) as avg_grade,
                COUNT(task_id) as completed_tasks
            FROM grades 
            WHERE student_id = $1
        `, [userId]);

        const courses = await db.query(`
            SELECT c.id, c.title_${lang} AS title, c.color_accent, sc.progress_percent
            FROM courses c
            JOIN student_courses sc ON c.id = sc.course_id
            WHERE sc.student_id = $1
        `, [userId]);

        const deadlines = await db.query(`
            SELECT t.title_${lang} AS title, t.deadline, c.title_${lang} AS course_name, c.color_accent
            FROM tasks t
            JOIN courses c ON t.course_id = c.id
            JOIN student_courses sc ON c.id = sc.course_id
            LEFT JOIN grades gr ON gr.task_id = t.id AND gr.student_id = $1
            WHERE sc.student_id = $1 
            AND gr.task_id IS NULL 
            AND t.deadline >= CURRENT_DATE
            ORDER BY t.deadline ASC 
            LIMIT 3
        `, [userId]);

        const announcements = await db.query(`
            SELECT 
                a.id, 
                a.title_${lang} AS title,
                a.content_${lang} AS content,
                a.created_at, 
                u.full_name as author_name, 
                c.title_${lang} AS course_name
            FROM announcements a
            JOIN users u ON a.author_id = u.id
            LEFT JOIN courses c ON a.course_id = c.id
            WHERE (a.course_id IS NULL OR a.course_id IN (
                SELECT sc.course_id FROM student_courses sc WHERE sc.student_id = $1
            ))
            AND NOT EXISTS (
                SELECT 1 FROM read_announcements ra 
                WHERE ra.announcement_id = a.id AND ra.student_id = $1
            )
            ORDER BY a.created_at DESC 
            LIMIT 3
        `, [userId]);

        res.json({
            user: {
                full_name: user.full_name,
                coins: user.coins,
                lang: lang,
                group_name: lang === 'en' ? (user.name_en || user.name_uk) : user.name_uk 
            },
            stats: {
                activeCourses: courses.rowCount,
                completedTasks: stats.rows[0].completed_tasks || 0,
                avgGrade: parseFloat(stats.rows[0].avg_grade) || 0
            },
            courses: courses.rows,
            deadlines: deadlines.rows,
            announcements: announcements.rows
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'SERVER_ERROR_DASHBOARD' });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        await db.query(
            'INSERT INTO read_announcements (student_id, announcement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, id]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'ERROR_MARK_READ' });
    }
};

// Оновлення налаштувань (мови)
exports.updateSettings = async (req, res) => {
    try {
        const { lang } = req.body;
        const userId = req.user.id;

        if (!['uk', 'en'].includes(lang)) {
            return res.status(400).json({ error: 'Unsupported language' });
        }

        await db.query('UPDATE users SET lang = $1 WHERE id = $2', [lang, userId]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'ERROR_UPDATE_SETTINGS' });
    }
};