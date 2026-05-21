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
                (SELECT COUNT(*) 
                FROM public.submissions s 
                JOIN public.tasks t ON s.task_id = t.id 
                JOIN public.teacher_courses tc ON t.course_id = tc.course_id 
                LEFT JOIN public.grades g 
                    ON g.task_id = s.task_id 
                    AND g.student_id = s.student_id
                WHERE tc.teacher_id = $1
                AND g.task_id IS NULL) as pending_grading
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
            SELECT 
                s.id as lesson_id, 
                c.title_${lang} AS title, 
                s.time_start, 
                s.time_end,
                s.lesson_type,
                s.lesson_format,
                s.room,
                g.name_${lang} AS group_name, 
                c.color_accent
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

exports.getProfileData = async (req, res) => {
    const userId = req.user.id;

    try {
        const profile = await db.query(`
            SELECT 
                u.id,
                u.full_name,
                u.email,
                u.lang,
                u.role,
                u.created_at,
                t.title_uk,
                t.title_en,
                t.rating,
                d.name_uk AS dept_uk,
                d.name_en AS dept_en
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
        const regYear = new Date(user.created_at).getFullYear();

        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) 
                 FROM public.teacher_courses 
                 WHERE teacher_id = $1) as active_courses,

                (SELECT COUNT(DISTINCT sc.student_id)
                 FROM public.student_courses sc
                 JOIN public.teacher_courses tc ON sc.course_id = tc.course_id
                 WHERE tc.teacher_id = $1) as total_students,

                (SELECT COUNT(*)
                 FROM public.submissions s
                 JOIN public.tasks t ON s.task_id = t.id
                 JOIN public.teacher_courses tc ON t.course_id = tc.course_id
                 LEFT JOIN public.grades g 
                    ON g.task_id = s.task_id 
                    AND g.student_id = s.student_id
                 WHERE tc.teacher_id = $1
                 AND g.task_id IS NULL) as pending_grading,

                (SELECT COUNT(*)
                 FROM public.grades g
                 JOIN public.tasks t ON g.task_id = t.id
                 JOIN public.teacher_courses tc ON t.course_id = tc.course_id
                 WHERE tc.teacher_id = $1) as graded_count
        `, [userId]);

        const courses = await db.query(`
            SELECT 
                c.id,
                c.title_${lang} AS title,
                c.color_accent,
                COALESCE(ROUND(AVG(sc.progress_percent), 0), 0) as group_avg_progress,
                COUNT(DISTINCT sc.student_id) as students_count
            FROM public.courses c
            JOIN public.teacher_courses tc ON c.id = tc.course_id
            LEFT JOIN public.student_courses sc ON c.id = sc.course_id
            WHERE tc.teacher_id = $1
            GROUP BY c.id, c.title_${lang}, c.color_accent
            ORDER BY c.title_${lang} ASC
        `, [userId]);

        res.json({
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                lang,
                role: user.role,
                regYear,
                title: lang === 'en' ? (user.title_en || user.title_uk) : user.title_uk,
                department: lang === 'en' ? (user.dept_en || user.dept_uk) : user.dept_uk,
                rating: parseFloat(user.rating) || 5.0
            },
            stats: {
                activeCourses: parseInt(stats.rows[0].active_courses) || 0,
                totalStudents: parseInt(stats.rows[0].total_students) || 0,
                pendingGrading: parseInt(stats.rows[0].pending_grading) || 0,
                gradedCount: parseInt(stats.rows[0].graded_count) || 0
            },
            courses: courses.rows
        });

    } catch (err) {
        console.error("[Dev Mode] Teacher Profile Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_PROFILE' });
    }
};

exports.getAllCourses = async (req, res) => {
    const userId = req.user.id;

    try {
        const userResult = await db.query(
            'SELECT lang FROM public.users WHERE id = $1',
            [userId]
        );

        const lang = userResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT 
                c.id,
                c.title_${lang} AS title,
                c.description_${lang} AS description,
                c.color_accent,
                COALESCE(ROUND(AVG(sc.progress_percent), 0), 0) as group_avg_progress,
                COUNT(DISTINCT sc.student_id) as students_count,
                COUNT(DISTINCT t.id) as tasks_count
            FROM public.courses c
            JOIN public.teacher_courses tc ON c.id = tc.course_id
            LEFT JOIN public.student_courses sc ON c.id = sc.course_id
            LEFT JOIN public.tasks t ON c.id = t.course_id
            WHERE tc.teacher_id = $1
            GROUP BY c.id, c.title_${lang}, c.description_${lang}, c.color_accent
            ORDER BY c.title_${lang} ASC
        `, [userId]);

        res.json({
            user: { lang },
            courses: result.rows
        });

    } catch (err) {
        console.error("[Dev Mode] Teacher Courses Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_COURSES' });
    }
};

exports.getCourseDetail = async (req, res) => {
    const userId = req.user.id;
    const courseId = req.params.id;

    try {
        const userResult = await db.query(
            'SELECT lang FROM public.users WHERE id = $1',
            [userId]
        );

        const lang = userResult.rows[0]?.lang || 'uk';

        const courseInfo = await db.query(`
            SELECT 
                c.id,
                c.title_${lang} AS title,
                c.description_${lang} AS description,
                c.color_accent,
                COALESCE(ROUND(AVG(sc.progress_percent), 0), 0) as group_avg_progress,
                COUNT(DISTINCT sc.student_id) as students_count
            FROM public.courses c
            JOIN public.teacher_courses tc ON c.id = tc.course_id
            LEFT JOIN public.student_courses sc ON c.id = sc.course_id
            WHERE c.id = $1 AND tc.teacher_id = $2
            GROUP BY c.id, c.title_${lang}, c.description_${lang}, c.color_accent
        `, [courseId, userId]);

        if (courseInfo.rows.length === 0) {
            return res.status(404).json({ message: 'COURSE_NOT_FOUND' });
        }

        const tasks = await db.query(`
            SELECT 
                t.id,
                t.title_${lang} AS title,
                t.description_${lang} AS description,
                t.deadline,
                t.is_exam,
                COUNT(DISTINCT s.id) as submissions_count,
                COUNT(DISTINCT g.student_id) as graded_count
            FROM public.tasks t
            LEFT JOIN public.submissions s ON t.id = s.task_id
            LEFT JOIN public.grades g ON t.id = g.task_id
            WHERE t.course_id = $1
            GROUP BY t.id, t.title_${lang}, t.description_${lang}, t.deadline, t.is_exam
            ORDER BY t.deadline ASC
        `, [courseId]);

        const students = await db.query(`
            SELECT 
                u.id,
                u.full_name,
                u.email,
                sc.progress_percent,
                g.name_${lang} AS group_name
            FROM public.student_courses sc
            JOIN public.users u ON sc.student_id = u.id
            JOIN public.students st ON u.id = st.user_id
            LEFT JOIN public.groups g ON st.group_id = g.id
            WHERE sc.course_id = $1
            ORDER BY u.full_name ASC
        `, [courseId]);

        const materials = await db.query(`
            SELECT 
                id,
                title_${lang} AS title,
                file_url,
                material_type,
                created_at
            FROM public.course_materials
            WHERE course_id = $1
            ORDER BY created_at DESC
        `, [courseId]);

        res.json({
            user: { lang },
            course: courseInfo.rows[0],
            tasks: tasks.rows,
            students: students.rows,
            materials: materials.rows
        });

    } catch (err) {
        console.error("[Dev Mode] Teacher Course Detail Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_COURSE_DETAIL' });
    }
};

exports.getSubmissionsForGrading = async (req, res) => {
    const userId = req.user.id;

    try {
        const userResult = await db.query(
            'SELECT lang FROM public.users WHERE id = $1',
            [userId]
        );

        const lang = userResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT 
                s.id AS submission_id,
                s.task_id,
                s.student_id,
                s.file_url,
                s.content,
                s.submitted_at,

                t.title_${lang} AS task_title,
                t.deadline,
                t.is_exam,

                c.id AS course_id,
                c.title_${lang} AS course_title,
                c.color_accent,

                u.full_name AS student_name,
                u.email AS student_email,

                gr.grade_value,
                gr.feedback,
                gr.created_at AS graded_at,

                CASE 
                    WHEN gr.task_id IS NOT NULL THEN 'graded'
                    ELSE 'pending'
                END AS status
            FROM public.submissions s
            JOIN public.tasks t ON s.task_id = t.id
            JOIN public.courses c ON t.course_id = c.id
            JOIN public.teacher_courses tc ON c.id = tc.course_id
            JOIN public.users u ON s.student_id = u.id
            LEFT JOIN public.grades gr 
                ON gr.task_id = s.task_id 
                AND gr.student_id = s.student_id
            WHERE tc.teacher_id = $1
            ORDER BY 
                CASE WHEN gr.task_id IS NULL THEN 0 ELSE 1 END,
                s.submitted_at DESC
        `, [userId]);

        const stats = {
            total: result.rows.length,
            pending: result.rows.filter(row => row.status === 'pending').length,
            graded: result.rows.filter(row => row.status === 'graded').length
        };

        res.json({
            user: { lang },
            submissions: result.rows,
            stats
        });

    } catch (err) {
        console.error("[Dev Mode] Teacher Submissions Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_SUBMISSIONS' });
    }
};

exports.gradeSubmission = async (req, res) => {
    const userId = req.user.id;
    const submissionId = req.params.id;
    const { gradeValue, feedback } = req.body;

    if (gradeValue === undefined || gradeValue === null || Number.isNaN(Number(gradeValue))) {
        return res.status(400).json({ message: 'INVALID_GRADE' });
    }

    const gradeNumber = Number(gradeValue);
    if (gradeNumber < 0 || gradeNumber > 100) {
        return res.status(400).json({ message: 'INVALID_GRADE' });
    }

    try {
        const access = await db.query(`
            SELECT 
                s.id,
                s.task_id,
                s.student_id,
                t.course_id,
                t.title_uk,
                t.title_en
            FROM public.submissions s
            JOIN public.tasks t ON s.task_id = t.id
            JOIN public.teacher_courses tc ON t.course_id = tc.course_id
            WHERE s.id = $1 AND tc.teacher_id = $2
        `, [submissionId, userId]);

        if (access.rows.length === 0) {
            return res.status(404).json({ message: 'SUBMISSION_NOT_FOUND' });
        }

        const submission = access.rows[0];

        await db.query(`
            INSERT INTO public.grades 
                (student_id, task_id, grade_value, feedback, created_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, task_id)
            DO UPDATE SET 
                grade_value = EXCLUDED.grade_value,
                feedback = EXCLUDED.feedback,
                created_at = CURRENT_TIMESTAMP
        `, [
            submission.student_id,
            submission.task_id,
            gradeNumber,
            feedback?.trim() || null
        ]);

        await db.query(`
            UPDATE public.student_courses sc
            SET progress_percent = CASE 
                WHEN total_tasks.count = 0 THEN 0
                ELSE ROUND((graded_tasks.count::numeric / total_tasks.count::numeric) * 100)
            END
            FROM (
                SELECT COUNT(*) as count
                FROM public.tasks
                WHERE course_id = $1
            ) total_tasks,
            (
                SELECT COUNT(*) as count
                FROM public.grades g
                JOIN public.tasks t ON g.task_id = t.id
                WHERE g.student_id = $2 AND t.course_id = $1
            ) graded_tasks
            WHERE sc.student_id = $2 AND sc.course_id = $1
        `, [submission.course_id, submission.student_id]);

        await db.query(`
            INSERT INTO public.notifications 
                (user_id, message_uk, message_en, is_read, created_at)
            VALUES 
                ($1, $2, $3, false, CURRENT_TIMESTAMP)
        `, [
            submission.student_id,
            `Вашу роботу "${submission.title_uk}" оцінено.`,
            `Your assignment "${submission.title_en || submission.title_uk}" has been graded.`
        ]);

        res.json({ success: true });

    } catch (err) {
        console.error("[Dev Mode] Grade Submission Error:", err.message);
        res.status(500).json({ message: 'GRADE_SUBMISSION_ERROR' });
    }
};

exports.getSchedule = async (req, res) => {
    const userId = req.user.id;
    const { from, to } = req.query;

    const today = new Date();
    const defaultFrom = today.toISOString().split('T')[0];

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const defaultTo = nextMonth.toISOString().split('T')[0];

    const fromDate = from || defaultFrom;
    const toDate = to || defaultTo;

    try {
        const userResult = await db.query(
            'SELECT lang FROM public.users WHERE id = $1',
            [userId]
        );

        const lang = userResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT 
                s.id,
                s.lesson_date,
                s.time_start,
                s.time_end,
                s.lesson_type,
                s.lesson_format,
                s.room,
                s.is_open_for_attendance,
                c.title_${lang} AS course_name,
                c.color_accent,
                g.name_${lang} AS group_name
            FROM public.schedule s
            JOIN public.courses c ON s.course_id = c.id
            LEFT JOIN public.groups g ON s.group_id = g.id
            WHERE s.teacher_id = $1
            AND s.lesson_date BETWEEN $2 AND $3
            ORDER BY s.lesson_date ASC, s.time_start ASC
        `, [userId, fromDate, toDate]);

        res.json({
            user: { lang },
            schedule: result.rows
        });

    } catch (err) {
        console.error("[Dev Mode] Teacher Schedule Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_SCHEDULE' });
    }
};