document.addEventListener("DOMContentLoaded", () => {
    const content = document.getElementById("teacherCourseDetailContent");
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");

    if (!content) {
        console.error("Не знайдено #teacherCourseDetailContent");
        return;
    }

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const lang = getCurrentLang();
        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    async function fetchJson(url, token) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Request failed: ${response.status}`);
        }

        return data;
    }

    function showEmpty(title, text = "") {
        content.innerHTML = `
            <div class="teacher-course-detail-empty">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    async function loadCourseDetail() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!courseId) {
            showEmpty(
                getTranslation(lang, "teacher_course_detail.not_found_title"),
                getTranslation(lang, "teacher_course_detail.not_found_text")
            );
            return;
        }

        if (!token) {
            showEmpty(getTranslation(lang, "errors.UNAUTHORIZED"), "");
            return;
        }

        try {
            content.innerHTML = `
                <div class="teacher-course-detail-loading">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/teacher/courses/${courseId}/detail`, token);

            renderCourseDetail({
                course: data.course,
                tasks: Array.isArray(data.tasks) ? data.tasks : [],
                students: Array.isArray(data.students) ? data.students : [],
                materials: Array.isArray(data.materials) ? data.materials : []
            });
        } catch (error) {
            console.error("[Teacher Course Detail] Помилка:", error);

            showEmpty(
                getTranslation(lang, "teacher_course_detail.unavailable_title"),
                getTranslation(lang, "teacher_course_detail.unavailable_text")
            );
        }
    }

    function getMaterialIcon(type) {
        if (type === "lecture") return "📘";
        if (type === "manual") return "📄";
        if (type === "video") return "🎥";
        if (type === "link") return "🔗";
        if (type === "book") return "📚";

        return "📎";
    }

    function getMaterialTypeText(type) {
        const lang = getCurrentLang();

        if (!type) {
            return getTranslation(lang, "course_detail.material_other");
        }

        const key = `course_detail.material_${type}`;
        const result = getTranslation(lang, key);

        return result === key
            ? getTranslation(lang, "course_detail.material_other")
            : result;
    }

    function getTaskReviewStatus(task) {
        const submissionsCount = Number(task.submissions_count || 0);
        const gradedCount = Number(task.graded_count || 0);

        if (submissionsCount === 0) {
            return "no-submissions";
        }

        if (gradedCount >= submissionsCount) {
            return "graded";
        }

        return "needs-grading";
    }

    function getTaskReviewStatusText(task) {
        const lang = getCurrentLang();
        const status = getTaskReviewStatus(task);

        if (status === "graded") {
            return getTranslation(lang, "teacher_submissions.status_graded");
        }

        if (status === "needs-grading") {
            return getTranslation(lang, "teacher_course_detail.needs_grading_status");
        }

        return getTranslation(lang, "teacher_course_detail.no_submissions_status");
    }

    function renderCourseDetail(data) {
        const lang = getCurrentLang();
        const course = data.course;
        const tasks = data.tasks;
        const students = data.students;
        const materials = data.materials;

        if (!course) {
            showEmpty(
                getTranslation(lang, "teacher_course_detail.not_found_title"),
                getTranslation(lang, "teacher_course_detail.not_found_text")
            );
            return;
        }

        const accent = course.color_accent || "var(--accent-gold)";
        const progress = Math.round(Number(course.group_avg_progress || 0));

        content.style.setProperty("--course-accent", accent);

        content.innerHTML = `
            <header class="teacher-course-hero">
                <div class="teacher-course-hero-icon">📚</div>

                <div class="teacher-course-hero-content">
                    <span class="teacher-course-label">${getTranslation(lang, "teacher_course_detail.course_label")}</span>

                    <h1>${course.title || getTranslation(lang, "teacher_courses.untitled_course")}</h1>

                    <p>
                        ${course.description || getTranslation(lang, "teacher_courses.no_description")}
                    </p>

                    <div class="teacher-course-progress-bar">
                        <div class="teacher-course-progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            </header>

            <section class="teacher-course-stats">
                <div class="teacher-course-stat">
                    <span>📈</span>
                    <div>
                        <strong>${progress}%</strong>
                        <p>${getTranslation(lang, "teacher_course_detail.avg_progress")}</p>
                    </div>
                </div>

                <div class="teacher-course-stat">
                    <span>👥</span>
                    <div>
                        <strong>${Number(course.students_count || students.length || 0)}</strong>
                        <p>${getTranslation(lang, "teacher_course_detail.students_count")}</p>
                    </div>
                </div>

                <div class="teacher-course-stat">
                    <span>📝</span>
                    <div>
                        <strong>${tasks.length}</strong>
                        <p>${getTranslation(lang, "teacher_course_detail.tasks_count")}</p>
                    </div>
                </div>

                <div class="teacher-course-stat">
                    <span>📎</span>
                    <div>
                        <strong>${materials.length}</strong>
                        <p>${getTranslation(lang, "teacher_course_detail.materials_count")}</p>
                    </div>
                </div>
            </section>

            <section class="teacher-course-layout">
                <div class="teacher-course-main">
                    <div class="teacher-section-card">
                        <div class="teacher-section-header">
                            <h2>${getTranslation(lang, "teacher_course_detail.tasks_title")}</h2>
                        </div>

                        ${renderTasks(tasks)}
                    </div>

                    <div class="teacher-section-card">
                        <div class="teacher-section-header">
                            <h2>${getTranslation(lang, "teacher_course_detail.students_title")}</h2>
                        </div>

                        ${renderStudents(students)}
                    </div>
                </div>

                <aside class="teacher-course-side">
                    <div class="teacher-section-card">
                        <div class="teacher-section-header">
                            <h2>${getTranslation(lang, "teacher_course_detail.materials_title")}</h2>
                        </div>

                        ${renderMaterials(materials)}
                    </div>
                </aside>
            </section>
        `;
    }

    function renderTasks(tasks) {
        const lang = getCurrentLang();

        if (!tasks.length) {
            return `
                <p class="teacher-section-empty">
                    ${getTranslation(lang, "teacher_course_detail.no_tasks")}
                </p>
            `;
        }

        return `
            <div class="teacher-tasks-list">
                ${tasks.map(task => `
                    <article class="teacher-task-card">
                        <div>
                            <h3>${task.title || getTranslation(lang, "tasks.unknown_task")}</h3>

                            <p>
                                ${getTranslation(lang, "tasks.deadline")}:
                                <strong>${formatDate(task.deadline)}</strong>
                            </p>

                            <p>
                                ${getTranslation(lang, "teacher_course_detail.checked_submissions")}:
                                <strong>${Number(task.graded_count || 0)}</strong>
                                /
                                <strong>${Number(task.submissions_count || 0)}</strong>
                            </p>
                        </div>

                        <div class="teacher-task-right">
                            ${
                                task.is_exam
                                    ? `<span class="teacher-task-badge">${getTranslation(lang, "tasks.exam")}</span>`
                                    : ""
                            }

                            <span class="teacher-task-status ${getTaskReviewStatus(task)}">
                                ${getTaskReviewStatusText(task)}
                            </span>
                        </div>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function renderStudents(students) {
        const lang = getCurrentLang();

        if (!students.length) {
            return `
                <p class="teacher-section-empty">
                    ${getTranslation(lang, "teacher_course_detail.no_students")}
                </p>
            `;
        }

        return `
            <div class="teacher-students-list">
                ${students.map(student => `
                    <article class="teacher-student-card">
                        <div class="teacher-student-left">
                            <div class="teacher-student-avatar">
                                ${String(student.full_name || "?").trim().charAt(0).toUpperCase()}
                            </div>

                            <div class="teacher-student-info">
                                <h3>${student.full_name || getTranslation(lang, "teacher_course_detail.unknown_student")}</h3>
                                <p>${student.email || "—"}</p>
                            </div>
                        </div>
                        <div class="teacher-student-progress">
                            <strong>${Math.round(Number(student.progress_percent || 0))}%</strong>
                            <span>${getTranslation(lang, "teacher_course_detail.progress_label")}</span>
                        </div>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function renderMaterials(materials) {
        const lang = getCurrentLang();

        if (!materials.length) {
            return `
                <p class="teacher-section-empty">
                    ${getTranslation(lang, "teacher_course_detail.no_materials")}
                </p>
            `;
        }

        return `
            <div class="teacher-materials-list">
                ${materials.map(material => `
                    <a class="teacher-material-card" href="${material.file_url}" target="_blank" rel="noopener noreferrer">
                        <span class="teacher-material-icon">${getMaterialIcon(material.material_type)}</span>

                        <div>
                            <h3>${material.title}</h3>
                            <p>${getMaterialTypeText(material.material_type)}</p>
                        </div>

                        <span class="teacher-material-open">↗</span>
                    </a>
                `).join("")}
            </div>
        `;
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadCourseDetail();
});