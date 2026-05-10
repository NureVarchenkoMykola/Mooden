document.addEventListener("DOMContentLoaded", () => {
    const courseContent = document.getElementById("courseContent");
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");

    if (!courseContent) {
        console.error("Не знайдено елемент #courseContent");
        return;
    }

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
    }

    function translate(key, fallback = "") {
        const lang = getCurrentLang();
        const parts = key.split(".");

        let value = translations?.[lang];

        for (const part of parts) {
            if (!value || value[part] === undefined) {
                value = null;
                break;
            }

            value = value[part];
        }

        if (value) {
            return value;
        }

        let fallbackValue = translations?.uk;

        for (const part of parts) {
            if (!fallbackValue || fallbackValue[part] === undefined) {
                fallbackValue = null;
                break;
            }

            fallbackValue = fallbackValue[part];
        }

        return fallbackValue || fallback || key;
    }

    function applyPageTranslations() {
        document.querySelectorAll("[data-i18n]").forEach(element => {
            const key = element.getAttribute("data-i18n");
            const translatedText = translate(key);

            if (translatedText) {
                element.textContent = translatedText;
            }
        });
    }

    function getLocalizedField(item, fieldName) {
        const lang = getCurrentLang();

        return (
            item[`${fieldName}_${lang}`] ||
            item[`${fieldName}_uk`] ||
            item[`${fieldName}_en`] ||
            item[fieldName] ||
            ""
        );
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return translate("course_detail.no_deadline", "Дедлайн не вказано");
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        const lang = getCurrentLang();

        return date.toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function normalizeSkills(skills) {
        if (!skills) {
            return [];
        }

        if (Array.isArray(skills)) {
            return skills;
        }

        if (typeof skills === "string") {
            return skills
                .split(",")
                .map(item => item.trim())
                .filter(Boolean);
        }

        return [];
    }

    function getCourseStatus(progress) {
        const value = Number(progress || 0);

        if (value >= 100) {
            return translate("courses.status_completed", "Завершений");
        }

        if (value <= 0) {
            return translate("courses.status_new", "Новий");
        }

        return translate("courses.status_active", "Активний");
    }

    function normalizeCourse(data) {
        const lang = getCurrentLang();

        const progress = Number(
            data.progress_percent ??
            data.progress ??
            data.progressPercent ??
            0
        );

        const skills =
            data.skills ||
            data[`skills_${lang}`] ||
            data.skills_uk ||
            data.skills_en ||
            [];

        const tasks =
            Array.isArray(data.tasks)
                ? data.tasks
                : Array.isArray(data.assignments)
                    ? data.assignments
                    : [];

        return {
            id: data.id || data.course_id || courseId,
            title:
                data.title ||
                getLocalizedField(data, "title") ||
                translate("courses.unknown_course", "Курс без назви"),
            description:
                data.description ||
                getLocalizedField(data, "description") ||
                translate("course_detail.no_description", "Опис курсу поки не додано."),
            colorAccent: data.color_accent || data.color || null,
            progress,
            skills: normalizeSkills(skills),
            tasks,
            tasksCount: data.tasks_count ?? data.task_count ?? tasks.length,
            averageGrade: data.average_grade ?? data.avg_grade ?? null
        };
    }

    function normalizeTask(task, index) {
        return {
            id: task.id || task.task_id || index + 1,
            title:
                task.title ||
                task.task_title ||
                getLocalizedField(task, "title") ||
                translate("tasks.unknown_task", "Завдання без назви"),
            deadline:
                task.deadline ||
                task.due_date ||
                task.deadline_at ||
                null,
            isExam: Boolean(task.is_exam)
        };
    }

    function showEmpty(title, text) {
        courseContent.innerHTML = `
            <div class="course-empty-card">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    async function loadCourse() {
        const token = getToken();

        if (!courseId) {
            showEmpty(
                translate("course_detail.not_found_title", "Курс не знайдено"),
                translate("course_detail.not_found_text", "Поверніться на сторінку курсів і виберіть курс ще раз.")
            );
            return;
        }

        if (!token) {
            showEmpty(
                translate("errors.UNAUTHORIZED", "Ви не авторизовані."),
                ""
            );
            return;
        }

        try {
            courseContent.innerHTML = `
                <div class="course-loading-card">
                    <h2>${translate("profile.loading", "Завантаження...")}</h2>
                    <p>${translate("dashboard.status_loading", "Отримуємо актуальну інформацію...")}</p>
                </div>
            `;

            const response = await fetch(`${API_BASE_URL}/student/courses/${courseId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Course detail API error: ${response.status}`);
            }

            const data = await response.json();

            console.log("COURSE DETAIL DATA:", data);

            const courseData = data.course || data;
            const course = normalizeCourse(courseData);

            renderCourse(course);
        } catch (error) {
            console.error("[Course Detail] Не вдалося завантажити курс:", error);

            showEmpty(
                translate("course_detail.unavailable_title", "Деталі курсу поки недоступні"),
                translate("course_detail.unavailable_text", "Backend endpoint для детального перегляду курсу ще не реалізовано або тимчасово недоступний.")
            );
        }
    }

    function renderSkills(course) {
        if (!course.skills.length) {
            return `<p class="course-section-empty">${translate("course_detail.no_skills", "Навички поки не вказані.")}</p>`;
        }

        return `
            <div class="course-skills-list">
                ${course.skills.map(skill => `<span class="course-skill">${skill}</span>`).join("")}
            </div>
        `;
    }

    function renderTasks(course) {
        if (!course.tasks.length) {
            return `<p class="course-section-empty">${translate("course_detail.no_tasks", "Завдання для цього курсу поки не додані.")}</p>`;
        }

        return `
            <div class="course-tasks-list">
                ${course.tasks.map((task, index) => {
                    const normalizedTask = normalizeTask(task, index);

                    return `
                        <article class="course-task-card">
                            <div class="course-task-top">
                                <h3 class="course-task-title">${normalizedTask.title}</h3>
                                ${
                                    normalizedTask.isExam
                                        ? `<span class="course-task-badge">${translate("tasks.exam", "Іспит")}</span>`
                                        : ""
                                }
                            </div>

                            <p class="course-task-meta">
                                ${translate("tasks.deadline", "Дедлайн")}:
                                <strong>${formatDate(normalizedTask.deadline)}</strong>
                            </p>
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    }

    function renderCourse(course) {
        if (course.colorAccent) {
            courseContent.style.setProperty("--course-accent", course.colorAccent);
        }

        const gradeValue =
            course.averageGrade === null || course.averageGrade === undefined
                ? "—"
                : course.averageGrade;

        courseContent.innerHTML = `
            <header class="course-detail-header">
                <div class="course-detail-icon">📚</div>

                <div class="course-detail-meta">
                    <span class="course-detail-status">
                        ${getCourseStatus(course.progress)}
                    </span>

                    <h1>${course.title}</h1>

                    <p>${course.description}</p>

                    <div class="course-progress-bar">
                        <div class="course-progress-fill" style="width: ${course.progress}%"></div>
                    </div>
                </div>
            </header>

            <section class="course-detail-stats">
                <div class="course-stat-card">
                    <span class="course-stat-icon">📈</span>
                    <div>
                        <p class="course-stat-value">${course.progress}%</p>
                        <p class="course-stat-label">${translate("course_detail.progress", "Прогрес курсу")}</p>
                    </div>
                </div>

                <div class="course-stat-card">
                    <span class="course-stat-icon">📝</span>
                    <div>
                        <p class="course-stat-value">${course.tasksCount}</p>
                        <p class="course-stat-label">${translate("course_detail.tasks_count", "Завдань")}</p>
                    </div>
                </div>

                <div class="course-stat-card">
                    <span class="course-stat-icon">⭐</span>
                    <div>
                        <p class="course-stat-value">${gradeValue}</p>
                        <p class="course-stat-label">${translate("course_detail.average_grade", "Середній бал")}</p>
                    </div>
                </div>
            </section>

            <section class="course-detail-layout">
                <div class="course-main-card">
                    <h2>${translate("course_detail.tasks_title", "Завдання курсу")}</h2>
                    ${renderTasks(course)}
                </div>

                <aside class="course-side-card">
                    <h2>${translate("course_detail.skills_title", "Навички")}</h2>
                    ${renderSkills(course)}
                </aside>
            </section>
        `;
    }

    document.querySelectorAll('input[name="lang"]').forEach(radio => {
        radio.addEventListener("change", () => {
            setTimeout(() => {
                applyPageTranslations();
                loadCourse();
            }, 200);
        });
    });

    applyPageTranslations();
    loadCourse();
});