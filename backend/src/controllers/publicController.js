const db = require('../db');

exports.getStats = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                (
                    SELECT COUNT(*)
                    FROM public.users
                    WHERE role = 'student'
                    AND COALESCE(is_blocked, false) = false
                ) AS students,

                (
                    SELECT COUNT(*)
                    FROM public.tasks t
                    JOIN public.courses c ON c.id = t.course_id
                    WHERE COALESCE(t.is_hidden, false) = false
                    AND COALESCE(c.is_hidden, false) = false
                ) AS tasks,

                (
                    SELECT COUNT(*)
                    FROM public.courses
                    WHERE COALESCE(is_hidden, false) = false
                ) AS courses
        `);

        const stats = result.rows[0];

        res.json({
            students: Number(stats.students || 0),
            tasks: Number(stats.tasks || 0),
            courses: Number(stats.courses || 0)
        });
    } catch (err) {
        console.error('[Dev Mode] Public Stats Error:', err.message);
        res.status(500).json({ message: 'STATS_ERROR' });
    }
};