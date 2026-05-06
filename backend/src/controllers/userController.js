const db = require('../db');
const bcrypt = require('bcrypt');

exports.getSidebarData = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        if (role === 'student') {
            const result = await db.query(`
                SELECT u.full_name, u.lang, g.name_uk, g.name_en,
                (SELECT COUNT(*) FROM tasks t JOIN student_courses sc ON t.course_id = sc.course_id 
                 LEFT JOIN grades gr ON gr.task_id = t.id AND gr.student_id = sc.student_id
                 WHERE sc.student_id = $1 AND gr.task_id IS NULL AND t.deadline >= CURRENT_DATE) as badge_tasks,
                (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false) as badge_notif
                FROM users u
                JOIN students s ON u.id = s.user_id
                LEFT JOIN groups g ON s.group_id = g.id
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
                    notifications: parseInt(row.badge_notif) || 0 
                }
            });

        } else if (role === 'teacher') {
            const result = await db.query(`
                SELECT u.full_name, u.lang, t.title_uk, t.title_en, d.name_uk, d.name_en,
                (SELECT COUNT(*) FROM public.submissions s JOIN public.tasks tsk ON s.task_id = tsk.id 
                 JOIN public.teacher_courses tc ON tsk.course_id = tc.course_id 
                 WHERE tc.teacher_id = $1 AND s.grade IS NULL) as badge_grading,
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
                    notifications: parseInt(row.badge_notif) || 0 
                }
            });
        }
    } catch (err) {
        console.error("[Dev Mode] Sidebar Controller Error:", err.message);
        res.status(500).json({ message: 'SIDEBAR_ERROR' });
    }
};


exports.changePassword = async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

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