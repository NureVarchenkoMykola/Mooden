const translations = {
    uk: {
        common: {
            nav_label_main: "НАВІГАЦІЯ",
            nav_dashboard: "📊 Дашборд",
            nav_courses: "📖 Мої курси",
            nav_tasks: "📝 Завдання",
            nav_schedule: "📅 Розклад",
            nav_grades: "⭐ Оцінки",
            nav_shop: "💎 Крамниця",
            nav_label_community: "СПІЛЬНОТА",
            nav_discussions: "💬 Обговорення",
            nav_notifications: "🔔 Сповіщення",
            logout_btn: "🚪 Вийти з акаунту",
            theme_dark: "Темна тема",
            theme_light: "Світла тема",
            roles_for_redirect: {
                student: "студента",
                teacher: "викладача",
                moderator: "модератора"
            },
            roles: {
                student: "Студент",
                teacher: "Викладач",
                moderator: "Модератор"
            },
            go_back: "Перейти",
            redirecting: " Повертаємо вас до вашого кабінету...",
            nav_grading: "📝 Перевірка",
            nav_constructor: "🔧 Конструктор"
        },
        login: {
            welcome_badge: "ЛАСКАВО ПРОСИМО",
            hero_title: "З поверненням до навчання",
            hero_subtitle: "Ваші курси, завдання та оцінки чекають на вас. Увійдіть, щоб продовжити.",
            stat_students: "Студентів",
            stat_hours: "Годин навчання",
            stat_tasks_today: "Виконано сьогодні",
            title: "Вхід",
            subtitle: "Введіть ваші облікові дані",
            email_label: "ЕЛЕКТРОННА ПОШТА",
            password_label: "ПАРОЛЬ",
            forgot_link: "Забули пароль?",
            remember_me: "Запам'ятати мене",
            login_btn: "Увійти →",
            no_account: "Немає акаунту?",
            register_link: "Зверніться до адміністратора"
        },
        dashboard: {
            welcome: "Вітаю",
            status_loading: "Отримуємо актуальну інформацію...",
            user_loading: "Завантаження...",
            title_courses: "Мої курси",
            link_all: "Всі курси →",
            link_calendar: "Календар",
            today: "Сьогодні",
            title_announcements: "Оголошення",
            link_announcements: "Всі оголошення",
            empty_announcements: "Немає нових оголошень",
            not_available: "Н/Д",
            stat_active: "Активних курсів",

            // ТІЛЬКИ СТУДЕНТ
            student_status_info: "Ви навчаєтесь у групі",
            stat_completed: "Виконано завдань",
            stat_grade: "Середній бал",
            stat_coins: "Монети",
            title_deadlines: "Дедлайни",
            empty_courses_student: "Ви ще не записані на жоден курс.",
            empty_deadlines: "Активних дедлайнів немає",
            label_general: "Загальне",

            // ТІЛЬКИ ВИКЛАДАЧ
            stat_students: "Студентів",
            stat_grading: "На перевірці",
            stat_rating: "Рейтинг",
            title_schedule: "Розклад сьогодні",
            title_grading_list: "Черга перевірки",
            link_grading: "Перевірити →",
            teacher_status_info: "Викладає на: ",
            no_classes_today: "Пар на сьогодні немає",
            all_graded: "Всі роботи перевірено",
            empty_courses_teacher: "Ви ще не ведете жоден курс",
            pending_submissions: "Роботи чекають на перевірку",
            items: "шт."
        },
            courses: {
            page_title: "Мої курси",
            page_desc: "Тут зібрані всі курси, на які ви записані. Можна переглядати прогрес, дедлайни та переходити до навчання.",
            search_placeholder: "Пошук за назвою курсу...",
            filter_all: "Усі курси",
            filter_active: "Активні",
            filter_completed: "Завершені",
            filter_new: "Нові",

            progress: "Прогрес",
            deadline: "Дедлайн",
            open_btn: "Відкрити",

            status_active: "Активний",
            status_completed: "Завершений",
            status_new: "Новий",

            course_finished: "Курс завершено",
            in_progress: "Курс у процесі проходження",
            short_backend_desc: "Деталі курсу доступні у навчальному кабінеті.",

            empty_title: "Курсів не знайдено",
            empty_text: "Спробуйте змінити пошук або фільтр.",

            unknown_course: "Курс без назви"
        },
            tasks: {
            page_title: "Завдання",
            page_desc: "Тут відображаються ваші навчальні завдання, дедлайни, статус виконання та оцінки.",

            search_placeholder: "Пошук завдання...",
            filter_all: "Усі завдання",
            filter_pending: "Очікують",
            filter_submitted: "Здані",
            filter_graded: "Оцінені",
            filter_overdue: "Прострочені",

            stat_total: "Усього завдань",
            stat_pending: "Очікують виконання",
            stat_completed: "Виконано",
            stat_avg: "Середня оцінка",

            status_pending: "Очікує",
            status_submitted: "Здано",
            status_graded: "Оцінено",
            status_overdue: "Прострочено",

            deadline: "Дедлайн",
            grade: "Оцінка",
            no_grade: "Немає",
            open_btn: "Відкрити",

            empty_title: "Завдань не знайдено",
            empty_text: "Спробуйте змінити пошук або фільтр.",

            unknown_task: "Завдання без назви",
            course_not_specified: "Курс не вказано",
            no_deadline: "Дедлайн не вказано",
            exam: "Іспит"
        },
            schedule: {
            page_title: "Розклад",
            page_desc: "Тут відображаються ваші заняття на тиждень, час проведення, аудиторія та формат навчання.",

            prev_week: "← Попередній тиждень",
            next_week: "Наступний тиждень →",
            current_week: "Поточний тиждень",
            today_title: "Сьогодні",

            monday: "Понеділок",
            tuesday: "Вівторок",
            wednesday: "Середа",
            thursday: "Четвер",
            friday: "П’ятниця",

            teacher: "Викладач",
            teacher_not_specified: "Викладача не вказано",
            room: "Аудиторія",

            empty_day: "Занять немає",
            empty_today: "На сьогодні занять немає.",

            unavailable_title: "Розклад поки недоступний",
            unavailable_text: "Backend endpoint для розкладу ще не реалізовано або тимчасово недоступний.",

            unknown_lesson: "Заняття без назви",

            format_online: "Онлайн",
            format_offline: "Аудиторно",
            format_mixed: "Змішано"
        },
            grades: {
            page_title: "Оцінки",
            page_desc: "Тут зібрана ваша академічна успішність, оцінки за завдання, середній бал та прогрес по курсах.",

            stat_avg: "Середній бал",
            stat_graded: "Оцінено робіт",
            stat_courses: "Курсів",
            stat_best: "Найкраща оцінка",

            search_placeholder: "Пошук за курсом, завданням або коментарем...",
            filter_all: "Усі курси",

            table_title: "Журнал оцінок",
            side_title: "Успішність по курсах",

            th_course: "Курс",
            th_task: "Завдання",
            th_date: "Дата",
            th_grade: "Оцінка",
            th_status: "Статус",

            status_passed: "Зараховано",
            status_pending: "Очікується",
            status_failed: "Не зараховано",

            no_grade: "Немає",
            course_not_specified: "Курс не вказано",
            task_not_specified: "Завдання не вказано",

            empty_title: "Оцінок не знайдено",
            empty_text: "Спробуйте змінити пошук або фільтр."
        },
        profile: {
            loading: "Завантаження...",
            course_suffix: "курс",
            btn_edit: "✏️ Редагувати",
            btn_share: "🤝 Поділитись",
            stat_avg: "Середній бал",
            stat_courses: "Активних курсів",
            stat_tasks: "Завдань здано",
            stat_attendance: "Відвідуваність",
            stat_coins: "Монети",
            stat_achievements: "Досягнень",
            tab_overview: "Огляд",
            tab_grades: "Оцінки",
            tab_achievements: "Досягнення",
            tab_activity: "Активність",
            tab_settings: "Налаштування",
            card_courses: "📚 Поточні курси",
            card_achievements: "🏆 Останні досягнення",
            card_activity: "📊 Активність за тиждень",
            card_skills: "🧠 Навички",
            card_deadlines: "⏰ Найближчі дедлайни",
            link_all: "Всі →",
            empty_achievements: "У вас поки немає відкритих досягнень",
            empty_skills: "Навички з'являться після проходження курсів",


            card_grades_full: "🎓 Повна академічна успішність",
            th_course: "Курс",
            th_task: "Завдання",
            th_date: "Дата",
            th_grade: "Оцінка",
            settings_security: "🛡️ Безпека та доступ",
            label_old_password: "Поточний пароль",
            label_new_password: "Новий пароль",
            btn_update_password: "Оновити пароль",
            settings_preferences: "⚙️ Переваги інтерфейсу",
            settings_lang_hint: "Мову та тему можна змінити у бічній панелі швидкого доступу.",
            password_updated_success: "Пароль успішно оновлено!",
            tab_activity_full: "📜 Історія останніх подій",
            event_grade: "Оцінка",
            achievements_list_tab: "🏆Досягнення",
            event_achievement: "Досягнення",
            empty_history: "Подій ще не зафіксовано",
            link_copied: "Посилання на профіль скопійовано"
        },
        errors: {
            INVALID_CREDENTIALS: "Невірний email або пароль.",
            SERVER_ERROR: "Помилка сервера. Спробуйте пізніше.",
            UNAUTHORIZED: "Ви не авторизовані. Повертаємо на сторінку входу...",
            ACCESS_DENIED: "Ця сторінка лише для {role}.",
            ROLE_ERROR: "Ваша роль не розпізнана системою.",
            INVALID_TOKEN: "Сесія застаріла. Будь ласка, увійдіть знову.",
            USER_NOT_FOUND: "Користувача не знайдено",
            SERVER_ERROR_DASHBOARD: "Не вдалося завантажити дані панелі.",
            SERVER_ERROR_PROFILE: "Не вдалося завантажити дані профілю",
            ERROR_MARK_READ: "Не вдалося позначити оголошення як прочитане.",
            ERROR_UPDATE_SETTINGS: "Помилка при зміні мови.",
            UNKNOWN_ERROR: "Щось пішло не так. Спробуйте пізніше.",
            NETWORK_ERROR: "Не вдалося з’єднатися з сервером.",
            SIDEBAR_ERROR: "Помилка завантаження бічного меню",
            WRONG_OLD_PASSWORD: "Поточний пароль введено невірно.",
            PASSWORD_UPDATE_ERROR: "Не вдалося оновити пароль.",
            COPY_ERROR: "Не вдалося скопіювати посилання."
        }
    },
    en: {
        common: {
            nav_label_main: "NAVIGATION",
            nav_dashboard: "📊 Dashboard",
            nav_courses: "📖 My Courses",
            nav_tasks: "📝 Tasks",
            nav_schedule: "📅 Schedule",
            nav_grades: "⭐ Grades",
            nav_shop: "💎 Shop",
            nav_label_community: "COMMUNITY",
            nav_discussions: "💬 Discussions",
            nav_notifications: "🔔 Notifications",
            logout_btn: "🚪 Log Out",
            theme_dark: "Dark Mode",
            theme_light: "Light Mode",
            roles_for_redirect: {
                student: "Student",
                teacher: "Teacher",
                moderator: "Moderator"
            },
            roles: {
                student: "Student",
                teacher: "Teacher",
                moderator: "Moderator"
            },
            go_back: "Go Back",
            redirecting: " Redirecting to your panel...",
            nav_grading: "📝 Grading",
            nav_constructor: "🔧 Constructor"
        },
        login: {
            welcome_badge: "WELCOME BACK",
            hero_title: "Welcome back to learning",
            hero_subtitle: "Your courses, tasks and grades are waiting for you. Log in to continue.",
            stat_students: "Students",
            stat_hours: "Study Hours",
            stat_tasks_today: "Tasks Completed Today",
            title: "Sign In",
            subtitle: "Enter your credentials",
            email_label: "EMAIL ADDRESS",
            password_label: "PASSWORD",
            forgot_link: "Forgot password?",
            remember_me: "Remember me",
            login_btn: "Log In →",
            no_account: "Don't have an account?",
            register_link: "Contact the administrator"
        },
        dashboard: {
            welcome: "Welcome",
            status_loading: "Fetching current information...",
            user_loading: "Loading...",
            title_courses: "My Courses",
            link_all: "All Courses →",
            link_calendar: "Calendar",
            today: "Today",
            empty_announcements: "No new announcements",
            not_available: "N/A",
            stat_active: "Active Courses",

            // STUDENT ONLY
            student_status_info: "You are studying in group",
            stat_completed: "Tasks Completed",
            stat_grade: "GPA",
            stat_coins: "Coins",
            title_deadlines: "Deadlines",
            title_announcements: "Announcements",
            link_announcements: "All Announcements",
            empty_courses_student: "No courses enrolled yet.",
            empty_deadlines: "No active deadlines",
            label_general: "General",

            // TEACHER ONLY
            stat_students: "Students",
            stat_grading: "Pending",
            stat_rating: "Rating",
            title_schedule: "Today's Schedule",
            title_grading_list: "Grading Queue",
            link_grading: "Check →",
            teacher_status_info: "Teaches at",
            no_classes_today: "No classes today",
            all_graded: "All items are graded",
            empty_courses_teacher: "You are not teaching any courses yet",
            pending_submissions: "Submissions waiting for review",
            items: "pcs."
        },
            courses: {
            page_title: "My Courses",
            page_desc: "Here you can find all the courses you are enrolled in. You can view progress, deadlines and continue learning.",
            search_placeholder: "Search by course name...",
            filter_all: "All courses",
            filter_active: "Active",
            filter_completed: "Completed",
            filter_new: "New",

            progress: "Progress",
            deadline: "Deadline",
            open_btn: "Open",

            status_active: "Active",
            status_completed: "Completed",
            status_new: "New",

            course_finished: "Course completed",
            in_progress: "Course in progress",
            short_backend_desc: "Course details are available in the learning cabinet.",

            empty_title: "No courses found",
            empty_text: "Try changing the search query or filter.",

            unknown_course: "Untitled course"
        },
            tasks: {
            page_title: "Tasks",
            page_desc: "Here you can view your learning tasks, deadlines, completion statuses and grades.",

            search_placeholder: "Search task...",
            filter_all: "All tasks",
            filter_pending: "Pending",
            filter_submitted: "Submitted",
            filter_graded: "Graded",
            filter_overdue: "Overdue",

            stat_total: "Total Tasks",
            stat_pending: "Pending Tasks",
            stat_completed: "Completed",
            stat_avg: "Average Grade",

            status_pending: "Pending",
            status_submitted: "Submitted",
            status_graded: "Graded",
            status_overdue: "Overdue",

            deadline: "Deadline",
            grade: "Grade",
            no_grade: "None",
            open_btn: "Open",

            empty_title: "No tasks found",
            empty_text: "Try changing the search query or filter.",

            unknown_task: "Untitled task",
            course_not_specified: "Course not specified",
            no_deadline: "No deadline specified",
            exam: "Exam"
        },
            schedule: {
            page_title: "Schedule",
            page_desc: "Here you can view your weekly classes, time, classroom and learning format.",

            prev_week: "← Previous Week",
            next_week: "Next Week →",
            current_week: "Current Week",
            today_title: "Today",

            monday: "Monday",
            tuesday: "Tuesday",
            wednesday: "Wednesday",
            thursday: "Thursday",
            friday: "Friday",

            teacher: "Teacher",
            teacher_not_specified: "Teacher not specified",
            room: "Room",

            empty_day: "No classes",
            empty_today: "No classes today.",

            unavailable_title: "Schedule is not available yet",
            unavailable_text: "The backend endpoint for the schedule has not been implemented yet or is temporarily unavailable.",

            unknown_lesson: "Untitled lesson",

            format_online: "Online",
            format_offline: "Offline",
            format_mixed: "Mixed"
        },
            grades: {
            page_title: "Grades",
            page_desc: "Here you can view your academic performance, task grades, average score and course progress.",

            stat_avg: "Average Grade",
            stat_graded: "Graded Tasks",
            stat_courses: "Courses",
            stat_best: "Best Grade",

            search_placeholder: "Search by course, task or feedback...",
            filter_all: "All courses",

            table_title: "Gradebook",
            side_title: "Course Performance",

            th_course: "Course",
            th_task: "Task",
            th_date: "Date",
            th_grade: "Grade",
            th_status: "Status",

            status_passed: "Passed",
            status_pending: "Pending",
            status_failed: "Failed",

            no_grade: "None",
            course_not_specified: "Course not specified",
            task_not_specified: "Task not specified",

            empty_title: "No grades found",
            empty_text: "Try changing the search query or filter."
        },
        profile: {
            loading: "Loading...",
            course_suffix: "year",
            btn_edit: "✏️ Edit Profile",
            btn_share: "🤝 Share",
            stat_avg: "GPA",
            stat_courses: "Active Courses",
            stat_tasks: "Tasks Completed",
            stat_attendance: "Attendance",
            stat_coins: "Coins",
            stat_achievements: "Achievements",
            tab_overview: "Overview",
            tab_grades: "Grades",
            tab_achievements: "Achievements",
            tab_activity: "Activity",
            tab_settings: "Settings",
            card_courses: "📚 Current Courses",
            card_achievements: "🏆 Latest Achievements",
            card_activity: "📊 Weekly Activity",
            card_skills: "🧠 Skills",
            card_deadlines: "⏰ Upcoming Deadlines",
            link_all: "All →",
            empty_achievements: "You have no achievements unlocked yet",
            empty_skills: "Skills will appear after completing the courses",


            card_grades_full: "🎓 Full Academic Record",
            th_course: "Course",
            th_task: "Task",
            th_date: "Date",
            th_grade: "Grade",
            settings_security: "🛡️ Security & Access",
            label_old_password: "Current Password",
            label_new_password: "New Password",
            btn_update_password: "Update Password",
            settings_preferences: "⚙️ Interface Preferences",
            settings_lang_hint: "Language and theme can be changed in the quick access sidebar.",
            password_updated_success: "Password updated successfully!",
            tab_activity_full: "📜 Recent Activity History",
            event_grade: "Grade",
            achievements_list_tab: "🏆Achievements",
            event_achievement: "Achievement",
            empty_history: "No events recorded yet",
            link_copied: "Profile link copied"
        },
        errors: {
            INVALID_CREDENTIALS: "Invalid email or password.",
            SERVER_ERROR: "Server error. Try again later.",
            UNAUTHORIZED: "Unauthorized. Redirecting to login...",
            ACCESS_DENIED: "This page is for {role} only.",
            ROLE_ERROR: "Your role is not recognized.",
            INVALID_TOKEN: "Session expired. Please log in again.",
            USER_NOT_FOUND: "User not found",
            SERVER_ERROR_DASHBOARD: "Failed to load dashboard data.",
            SERVER_ERROR_PROFILE: "Failed to load profile data",
            ERROR_MARK_READ: "Failed to mark announcement as read.",
            ERROR_UPDATE_SETTINGS: "Error updating language settings.",
            UNKNOWN_ERROR: "Something went wrong. Please try again.",
            NETWORK_ERROR: "Unable to connect to server.",
            SIDEBAR_ERROR: "Error loading sidebar menu",
            WRONG_OLD_PASSWORD: "Current password is incorrect.",
            PASSWORD_UPDATE_ERROR: "Failed to update password.",
            COPY_ERROR: "Failed to copy the link."
        }
    }
};