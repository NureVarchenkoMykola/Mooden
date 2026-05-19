document.addEventListener("DOMContentLoaded", () => {
    const taskContent = document.getElementById("taskContent");
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("id");

    if (!taskContent) {
        console.error("Не знайдено елемент #taskContent");
        return;
    }

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
    }

    function formatDate(dateValue) {
        const lang = getCurrentLang();

        if (!dateValue) {
            return getTranslation(lang, "task_detail.no_deadline");
        }

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

    function isOverdue(deadline) {
        if (!deadline) return false;

        const deadlineDate = new Date(deadline);

        if (Number.isNaN(deadlineDate.getTime())) {
            return false;
        }

        const today = new Date();

        today.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);

        return deadlineDate < today;
    }

    function getTaskStatus(task) {
        const hasGrade =
            task.grade_value !== null &&
            task.grade_value !== undefined;

        const hasSubmission = Boolean(task.submitted_at);
        const overdue = isOverdue(task.deadline);

        if (hasGrade) {
            return "graded";
        }

        if (hasSubmission) {
            return "submitted";
        }

        if (!hasSubmission && overdue) {
            return "overdue";
        }

        return "pending";
    }

    function getTaskStatusText(status) {
        const lang = getCurrentLang();

        if (status === "graded") {
            return getTranslation(lang, "tasks.status_graded");
        }

        if (status === "submitted") {
            return getTranslation(lang, "tasks.status_submitted");
        }

        if (status === "overdue") {
            return getTranslation(lang, "tasks.status_overdue");
        }

        return getTranslation(lang, "tasks.status_pending");
    }

    function showEmpty(title, text = "") {
        taskContent.innerHTML = `
            <div class="task-detail-empty">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    async function loadTask() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!taskId) {
            showEmpty(
                getTranslation(lang, "task_detail.not_found_title"),
                getTranslation(lang, "task_detail.not_found_text")
            );
            return;
        }

        if (!token) {
            showEmpty(
                getTranslation(lang, "errors.UNAUTHORIZED"),
                ""
            );
            return;
        }

        try {
            taskContent.innerHTML = `
                <div class="task-detail-loading">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const response = await fetch(`${API_BASE_URL}/student/tasks/${taskId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || `Task detail API error: ${response.status}`);
            }

            renderTask(data);
        } catch (error) {
            console.error("[Task Detail] Не вдалося завантажити завдання:", error);

            showEmpty(
                getTranslation(lang, "task_detail.unavailable_title"),
                getTranslation(lang, "task_detail.unavailable_text")
            );
        }
    }

    function renderTask(task) {
        const lang = getCurrentLang();
        const status = getTaskStatus(task);

        const gradeText =
            task.grade_value === null || task.grade_value === undefined
                ? getTranslation(lang, "tasks.no_grade")
                : task.grade_value;

        const submittedText =
            task.submitted_at
                ? formatDate(task.submitted_at)
                : getTranslation(lang, "task_detail.not_submitted");

        if (task.color_accent) {
            taskContent.style.setProperty("--task-accent", task.color_accent);
        }

        taskContent.innerHTML = `
            <header class="task-detail-hero">
                <div class="task-detail-icon">
                    ${task.is_exam ? "🎓" : "📝"}
                </div>

                <div class="task-detail-main">
                    <div class="task-detail-badges">
                        <span class="task-course-badge">
                            ${task.course_name || getTranslation(lang, "tasks.course_not_specified")}
                        </span>

                        ${
                            task.is_exam
                                ? `<span class="task-exam-badge">${getTranslation(lang, "tasks.exam")}</span>` : ""
                        }

                        <span class="task-status-badge ${status}">
                            ${getTaskStatusText(status)}
                        </span>
                    </div>

                    <h1>
                        ${task.title || getTranslation(lang, "tasks.unknown_task")}
                    </h1>
                </div>

                <button class="course-back-link task-back-btn" type="button">
                    ← ${getTranslation(lang, "common.go_back")}
                </button>
            </header>

            <section class="task-detail-stats">
                <div class="task-detail-stat">
                    <span class="task-detail-stat-icon">⏰</span>
                    <div>
                        <p class="task-stat-value">${formatDate(task.deadline)}</p>
                        <p class="task-stat-label">${getTranslation(lang, "tasks.deadline")}</p>
                    </div>
                </div>

                <div class="task-detail-stat">
                    <span class="task-detail-stat-icon">⭐</span>
                    <div>
                        <p class="task-stat-value">${gradeText}</p>
                        <p class="task-stat-label">${getTranslation(lang, "tasks.grade")}</p>
                    </div>
                </div>

                <div class="task-detail-stat">
                    <span class="task-detail-stat-icon">📤</span>
                    <div>
                        <p class="task-stat-value">${submittedText}</p>
                        <p class="task-stat-label">${getTranslation(lang, "task_detail.submission_status")}</p>
                    </div>
                </div>
            </section>

            <section class="task-detail-layout">
                <div class="task-detail-card">
                    <h2>${getTranslation(lang, "task_detail.description_title")}</h2>

                    <p class="task-detail-text">
                        ${task.description || getTranslation(lang, "task_detail.no_description")}
                    </p>
                </div>

                <aside class="task-detail-card">
                    <h2>${getTranslation(lang, "task_detail.result_title")}</h2>

                    <div class="task-result-list">
                        <div class="task-result-item">
                            <span class="task-result-label">${getTranslation(lang, "tasks.grade")}</span>
                            <span class="task-result-value">${gradeText}</span>
                        </div>

                        <div class="task-result-item">
                            <span class="task-result-label">${getTranslation(lang, "task_detail.feedback")}</span>
                            <span class="task-result-value">${task.feedback || getTranslation(lang, "task_detail.no_feedback")}</span>
                        </div>

                        <div class="task-result-item">
                            <span class="task-result-label">${getTranslation(lang, "task_detail.submitted_at")}</span>
                            <span class="task-result-value">${submittedText}</span>
                        </div>
                    </div>
                </aside>
            </section>
        `;

        const backButton = taskContent.querySelector(".task-back-btn");

        backButton?.addEventListener("click", () => {
            if (window.history.length > 1) {
                window.history.back();
                return;
            }

            window.location.href = "./student-tasks.html";
        });
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadTask();
});