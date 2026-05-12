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

        if (profile.rows.length === 0) {
            return res.status(404).json({ message: 'USER_NOT_FOUND' }); 
        }

        const user = profile.rows[0];
        const lang = user.lang || 'uk';

        const stats = await db.query(`
            SELECT 
                (SELECT ROUND(AVG(grade_value), 1) FROM grades WHERE student_id = $1) as avg_grade,
                (SELECT COUNT(*) FROM grades WHERE student_id = $1) as completed_tasks
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
                WHERE ra.announcement_id = a.id AND ra.user_id = $1
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
            'INSERT INTO read_announcements (user_id, announcement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
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

        await db.query('UPDATE users SET lang = $1 WHERE id = $2', [lang, userId]);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'ERROR_UPDATE_SETTINGS' });
    }
};


exports.getProfileData = async (req, res) => {
    const userId = req.user.id;

    try {
        const profile = await db.query(`
            SELECT 
                u.id, u.full_name, u.email, u.lang, u.role, u.created_at,
                g.name_uk AS group_uk, g.name_en AS group_en, 
                d.name_uk AS dept_uk, d.name_en AS dept_en,
                s.group_id, s.coins,
                s.course_year, s.degree_uk, s.degree_en, s.study_form_uk, s.study_form_en
            FROM public.users u
            JOIN public.students s ON u.id = s.user_id
            LEFT JOIN public.groups g ON s.group_id = g.id
            LEFT JOIN public.departments d ON g.department_id = d.id
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
                (SELECT ROUND(AVG(grade_value), 1) FROM public.grades WHERE student_id = $1) as avg_grade,
                (SELECT COUNT(*) FROM public.grades WHERE student_id = $1) as completed_tasks,
                (SELECT COUNT(*) FROM public.student_courses WHERE student_id = $1) as active_courses
        `, [userId]);

        const attendanceRes = await db.query(`
            WITH past_lessons AS (
                SELECT COUNT(*) as count FROM public.schedule 
                WHERE group_id = $1 
                AND (lesson_date < CURRENT_DATE OR (lesson_date = CURRENT_DATE AND time_start <= CURRENT_TIME))
            ),
            student_marks AS (
                SELECT COUNT(*) as count FROM public.attendance WHERE student_id = $2
            )
            SELECT CASE WHEN p.count = 0 THEN 100 
                ELSE ROUND((m.count::numeric / p.count::numeric) * 100) END as percent
            FROM past_lessons p, student_marks m
        `, [user.group_id, userId]);

        const totalAchRes = await db.query(
            'SELECT COUNT(*) FROM public.student_achievements WHERE student_id = $1',
            [userId]
        );

        const achievements = await db.query(`
            SELECT 
                a.id, 
                a.title_${lang} AS title, 
                a.description_${lang} AS description, 
                a.icon, 
                a.reward,
                sa.earned_at
            FROM public.achievements a
            JOIN public.student_achievements sa ON a.id = sa.achievement_id
            WHERE sa.student_id = $1
            ORDER BY sa.earned_at DESC
            LIMIT 3
        `, [userId]);

        const courses = await db.query(`
            SELECT c.id, c.title_${lang} AS title, c.color_accent, sc.progress_percent
            FROM public.courses c
            JOIN public.student_courses sc ON c.id = sc.course_id
            WHERE sc.student_id = $1
            ORDER BY sc.progress_percent ASC
            LIMIT 3
        `, [userId]);

        const deadlines = await db.query(`
            SELECT t.title_${lang} AS title, t.deadline, c.title_${lang} AS course_name, c.color_accent
            FROM public.tasks t
            JOIN public.courses c ON t.course_id = c.id
            JOIN public.student_courses sc ON c.id = sc.course_id
            LEFT JOIN public.grades gr ON gr.task_id = t.id AND gr.student_id = $1
            WHERE sc.student_id = $1 
            AND gr.task_id IS NULL 
            AND t.deadline >= CURRENT_DATE
            ORDER BY t.deadline ASC 
            LIMIT 3
        `, [userId]);

        const activity = await db.query(`
            SELECT d::date as day_raw, COUNT(g.task_id) as count
            FROM GENERATE_SERIES(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d
            LEFT JOIN public.grades g ON DATE(g.created_at) = DATE(d) AND g.student_id = $1
            GROUP BY d ORDER BY d ASC
        `, [userId]);

        const skills = await db.query(`
            SELECT c.skills_${lang} AS list
            FROM public.courses c
            JOIN public.student_courses sc ON c.id = sc.course_id
            WHERE sc.student_id = $1 AND sc.progress_percent = 100
        `, [userId]);

        const finalSkills = skills.rows
            .map(row => row.list)
            .flat()
            .filter((val, idx, self) => val && self.indexOf(val) === idx);

        const allGrades = await db.query(`
            SELECT 
                g.grade_value, 
                g.feedback, 
                g.created_at,
                t.title_${lang} as task_title,
                c.title_${lang} as course_title,
                c.color_accent
            FROM public.grades g
            JOIN public.tasks t ON g.task_id = t.id
            JOIN public.courses c ON t.course_id = c.id
            WHERE g.student_id = $1
            ORDER BY g.created_at DESC
        `, [userId]);

        const allAchievements = await db.query(`
            SELECT a.id, a.icon, a.reward, a.title_${lang} AS title, a.description_${lang} AS description, sa.earned_at
            FROM public.achievements a
            JOIN public.student_achievements sa ON a.id = sa.achievement_id
            WHERE sa.student_id = $1
            ORDER BY sa.earned_at DESC
        `, [userId]);

        const activityHistory = await db.query(`
            (SELECT 
                'grade' as type, 
                g.grade_value as value, 
                t.title_${lang} as title, 
                g.created_at as date
            FROM public.grades g
            JOIN public.tasks t ON g.task_id = t.id
            WHERE g.student_id = $1)
            
            UNION ALL
            
            (SELECT 
                'achievement' as type, 
                NULL as value, 
                a.title_${lang} as title, 
                sa.earned_at as date
            FROM public.student_achievements sa
            JOIN public.achievements a ON sa.achievement_id = a.id
            WHERE sa.student_id = $1)
            
            ORDER BY date DESC LIMIT 15
        `, [userId]);

        res.json({
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                lang: lang,
                role: user.role,
                coins: user.coins || 0,
                regYear: regYear,
                group: lang === 'en' ? (user.group_en || user.group_uk) : user.group_uk,
                department: lang === 'en' ? (user.dept_en || user.dept_uk) : user.dept_uk,
                course_year: user.course_year, 
                degree: lang === 'en' ? user.degree_en : user.degree_uk,
                study_form: lang === 'en' ? user.study_form_en : user.study_form_uk
            },
            stats: {
                avgGrade: parseFloat(stats.rows[0].avg_grade) || 0,
                completedTasks: parseInt(stats.rows[0].completed_tasks) || 0,
                activeCourses: parseInt(stats.rows[0].active_courses) || 0,
                attendance: parseInt(attendanceRes.rows[0].percent),
                achievementsCount: parseInt(totalAchRes.rows[0].count)
            },
            achievements: achievements.rows,
            courses: courses.rows,
            deadlines: deadlines.rows,
            weeklyActivity: activity.rows,
            skills: finalSkills,
            fullGrades: allGrades.rows,
            allAchievements: allAchievements.rows,
            history: activityHistory.rows
        });

    } catch (err) {
        console.error("[Dev Mode] Profile Controller Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_PROFILE' });
    }
};

exports.getAllCourses = async (req, res) => {
    const userId = req.user.id;

    try {
        const userResult = await db.query('SELECT lang FROM users WHERE id = $1', [userId]);
        const lang = userResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT 
                c.id, 
                c.title_${lang} AS title, 
                c.description_${lang} AS description, 
                c.color_accent, 
                sc.progress_percent
            FROM public.courses c
            JOIN public.student_courses sc ON c.id = sc.course_id
            WHERE sc.student_id = $1
            ORDER BY sc.progress_percent ASC
        `, [userId]);

        res.json({
            user: { lang },
            courses: result.rows
        });
    } catch (err) {
        console.error("[Dev Mode] Get All Courses Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_COURSES' });
    }
};

exports.getAllTasks = async (req, res) => {
    const userId = req.user.id;

    try {
        const userResult = await db.query('SELECT lang FROM users WHERE id = $1', [userId]);
        const lang = userResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT 
                t.id, 
                t.title_${lang} AS title, 
                t.description_${lang} AS description, 
                t.deadline,
                c.title_${lang} AS course_name,
                c.color_accent,
                g.grade_value,
                CASE 
                    WHEN g.grade_value IS NOT NULL THEN 'graded'
                    WHEN t.deadline < CURRENT_DATE THEN 'overdue'
                    ELSE 'pending'
                END as status
            FROM public.tasks t
            JOIN public.courses c ON t.course_id = c.id
            JOIN public.student_courses sc ON c.id = sc.course_id
            LEFT JOIN public.grades g ON t.id = g.task_id AND g.student_id = $1
            WHERE sc.student_id = $1
            ORDER BY t.deadline ASC
        `, [userId]);

        const stats = {
            total: result.rows.length,
            pending: result.rows.filter(r => r.status === 'pending').length,
            overdue: result.rows.filter(r => r.status === 'overdue').length,
            avgGrade: result.rows.filter(r => r.grade_value !== null)
                .reduce((acc, curr, _, arr) => acc + curr.grade_value / arr.length, 0).toFixed(1)
        };

        res.json({
            user: { lang },
            tasks: result.rows,
            stats
        });
    } catch (err) {
        console.error("[Dev Mode] Get All Tasks Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_TASKS' });
    }
};

exports.getSchedule = async (req, res) => {
    const userId = req.user.id;
    const { from, to } = req.query;

    try {
        const userResult = await db.query('SELECT lang FROM users WHERE id = $1', [userId]);
        const lang = userResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT 
                s.id, s.time_start, s.time_end, s.lesson_date,
                s.lesson_type,
                s.lesson_format,
                s.room,
                c.title_${lang} AS course_name,
                c.color_accent,
                u.full_name AS teacher_name
            FROM public.schedule s
            JOIN public.courses c ON s.course_id = c.id
            JOIN public.users u ON s.teacher_id = u.id
            JOIN public.students st ON s.group_id = st.group_id
            WHERE st.user_id = $1 AND s.lesson_date BETWEEN $2 AND $3
            ORDER BY s.lesson_date ASC, s.time_start ASC
        `, [userId, from, to]);

        res.json({
            user: { lang },
            schedule: result.rows
        });
    } catch (err) {
        console.error("[Dev Mode] Get Schedule Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_SCHEDULE' });
    }
};

exports.getTaskDetail = async (req, res) => {
    const userId = req.user.id;
    const taskId = req.params.id;

    try {
        const userResult = await db.query('SELECT lang FROM users WHERE id = $1', [userId]);
        const lang = userResult.rows[0]?.lang || 'uk';

        const result = await db.query(`
            SELECT 
                t.id, 
                t.title_${lang} AS title, 
                t.description_${lang} AS description, 
                t.deadline,
                t.is_exam,
                c.id AS course_id,
                c.title_${lang} AS course_name,
                c.color_accent,
                g.grade_value,
                g.feedback,
                s.submitted_at
            FROM public.tasks t
            JOIN public.courses c ON t.course_id = c.id
            JOIN public.student_courses sc ON c.id = sc.course_id
            LEFT JOIN public.grades g ON t.id = g.task_id AND g.student_id = $1
            LEFT JOIN public.submissions s ON t.id = s.task_id AND s.student_id = $1
            WHERE t.id = $2 AND sc.student_id = $1
        `, [userId, taskId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'TASK_NOT_FOUND' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'SERVER_ERROR_TASK_DETAIL' });
    }
};

exports.markAttendance = async (req, res) => {
    const userId = req.user.id;
    const { scheduleId } = req.body;

    try {
        const checkLesson = await db.query(`
            SELECT id FROM public.schedule 
            WHERE id = $1 AND is_open_for_attendance = true
            AND lesson_date = CURRENT_DATE
            AND CURRENT_TIME BETWEEN time_start AND time_end
        `, [scheduleId]);

        if (checkLesson.rows.length === 0) {
            return res.status(400).json({ message: 'ATTENDANCE_CLOSED' });
        }

        await db.query(`
            INSERT INTO public.attendance (student_id, schedule_id, marked_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, schedule_id) DO NOTHING
        `, [userId, scheduleId]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'ATTENDANCE_ERROR' });
    }
};

exports.getCourseDetail = async (req, res) => {
    const userId = req.user.id;
    const courseId = req.params.id;

    try {
        const userResult = await db.query('SELECT lang FROM users WHERE id = $1', [userId]);
        const lang = userResult.rows[0]?.lang || 'uk';

        const courseInfo = await db.query(`
            SELECT c.id, c.title_${lang} AS title, c.description_${lang} AS description, 
                   c.color_accent, sc.progress_percent
            FROM public.courses c
            JOIN public.student_courses sc ON c.id = sc.course_id
            WHERE c.id = $1 AND sc.student_id = $2
        `, [courseId, userId]);

        if (courseInfo.rows.length === 0) {
            return res.status(404).json({ message: 'COURSE_NOT_FOUND' });
        }

        const materials = await db.query(`
            SELECT id, title_${lang} AS title, file_url, material_type 
            FROM public.course_materials 
            WHERE course_id = $1 
            ORDER BY created_at DESC
        `, [courseId]);

        const tasks = await db.query(`
            SELECT t.id, t.title_${lang} AS title, t.deadline, t.is_exam,
                   g.grade_value,
                   CASE 
                       WHEN g.grade_value IS NOT NULL THEN 'graded'
                       WHEN t.deadline < CURRENT_DATE THEN 'overdue'
                       ELSE 'pending'
                   END as status
            FROM public.tasks t
            LEFT JOIN public.grades g ON t.id = g.task_id AND g.student_id = $2
            WHERE t.course_id = $1
            ORDER BY t.deadline ASC
        `, [courseId, userId]);

        res.json({
            course: courseInfo.rows[0],
            materials: materials.rows,
            tasks: tasks.rows
        });

    } catch (err) {
        console.error("[Dev Mode] Get Course Detail Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_COURSE_DETAIL' });
    }
};

exports.getCourseAttendance = async (req, res) => {
    const userId = req.user.id;
    const courseId = req.params.id;

    try {
        const userResult = await db.query('SELECT lang FROM users WHERE id = $1', [userId]);
        const lang = userResult.rows[0]?.lang || 'uk';

        const attendance = await db.query(`
            SELECT s.id AS schedule_id, s.lesson_date, s.time_start, s.lesson_type AS type,
                   CASE WHEN a.marked_at IS NOT NULL THEN true ELSE false END AS is_present,
                   s.is_open_for_attendance AS can_mark
            FROM public.schedule s
            LEFT JOIN public.attendance a ON s.id = a.schedule_id AND a.student_id = $2
            WHERE s.course_id = $1 AND s.lesson_date <= CURRENT_DATE
            ORDER BY s.lesson_date DESC, s.time_start DESC
        `, [courseId, userId]);

        res.json({ attendance: attendance.rows });
    } catch (err) {
        console.error("[Dev Mode] Get Course Attendance Error:", err.message);
        res.status(500).json({ message: 'SERVER_ERROR_ATTENDANCE' });
    }
};