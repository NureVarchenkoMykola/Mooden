document.addEventListener("DOMContentLoaded", () => {
    const content = document.getElementById("teacherTaskDetailContent");
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("id");

    let taskData = null;
    let isEditMode = false;

    if (!content) {
        console.error("Не знайдено #teacherTaskDetailContent");
        return;
    }

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
    }

    function formatDate(dateValue) {
        if (!dateValue) return "—";

        const lang = getCurrentLang();
        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return dateValue;

        return date.toLocaleString(lang === "en" ? "en-US" : "uk-UA", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatDateTimeLocal(dateValue) {
        if (!dateValue) return "";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "";

        const offsetMs = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offsetMs);

        return localDate.toISOString().slice(0, 16);
    }

    async function fetchJson(url, token, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...(options.headers || {})
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

    async function loadTask() {
        const token = getToken();
        const lang = getCurrentLang();

        if (!taskId) {
            showEmpty(
                getTranslation(lang, "teacher_task_detail.not_found_title"),
                getTranslation(lang, "teacher_task_detail.not_found_text")
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

            taskData = await fetchJson(`${API_BASE_URL}/teacher/tasks/${taskId}`, token);
            renderTask();

        } catch (error) {
            console.error("[Teacher Task Detail] Load error:", error);
            showEmpty(
                getTranslation(lang, "teacher_task_detail.load_error_title"),
                getTranslation(lang, "teacher_task_detail.load_error_text")
            );
        }
    }

    function renderTask() {
        const lang = getCurrentLang();
        const task = taskData.task;
        if (!task) {
            showEmpty(
                getTranslation(lang, "teacher_task_detail.not_found_title"),
                getTranslation(lang, "teacher_task_detail.not_found_text")
            );
            return;
        }
        const submissions = Array.isArray(taskData.submissions) ? taskData.submissions : [];

        document.title = `Mooden | ${task.title || getTranslation(lang, "tasks.unknown_task")}`;
        content.style.setProperty("--course-accent", task.color_accent || "var(--accent-gold)");

        content.innerHTML = `
            <header class="teacher-task-hero">
                

                <div class="teacher-task-hero-top">
                    <div>
                        <span class="teacher-course-label">
                            ${task.course_title || getTranslation(lang, "teacher_task_detail.course_label")}
                        </span>
                        <h1>${task.title || getTranslation(lang, "tasks.unknown_task")}</h1>
                    </div>

                    <div class="teacher-task-controls">
                        <button class="task-back-link task-back-btn" type="button">
                            ← ${getTranslation(lang, "common.go_back")}
                        </button>    
                    
                        <button type="button" class="teacher-task-edit-main-btn" id="taskEditBtn">
                            ${
                                isEditMode
                                    ? getTranslation(lang, "teacher_task_detail.cancel")
                                    : getTranslation(lang, "teacher_task_detail.edit")
                            }
                        </button>
                    </div>                   
                </div>

                <p>${task.description || getTranslation(lang, "teacher_course_detail.no_task_description")}</p>

                <div class="teacher-task-tags">
                    <span>⏰ ${formatDate(task.deadline)}</span>
                    ${task.is_exam ? `<span>${getTranslation(lang, "teacher_task_detail.exam")}</span>` : ""}
                    <span>
                        ${
                            task.is_hidden
                                ? getTranslation(lang, "teacher_task_detail.hidden")
                                : getTranslation(lang, "teacher_task_detail.visible")
                        }
                    </span>
                    <span>
                        📦 ${Number(task.submissions_count || 0)}
                        ${getTranslation(lang, "teacher_task_detail.submissions_count")}
                    </span>
                    <span>
                        ✅ ${Number(task.graded_count || 0)}
                        ${getTranslation(lang, "teacher_task_detail.graded_count")}
                    </span>
                </div>
            </header>

            ${isEditMode ? renderEditForm(task) : ""}

            <section class="teacher-section-card">
                <div class="teacher-section-header">
                    <h2>${getTranslation(lang, "teacher_task_detail.submissions_title")}</h2>
                </div>

                ${renderSubmissions(submissions)}
            </section>
        `;

        bindEvents();
    }

    function renderEditForm(task) {
        const lang = getCurrentLang();

        return `
            <form id="editTaskForm" class="teacher-task-edit-form">
                <div class="teacher-task-form-grid">
                    <label>
                        <span>${getTranslation(lang, "teacher_course_detail.title_uk")}</span>
                        <input type="text" name="titleUk" value="${task.title_uk || ""}" required>
                    </label>

                    <label>
                        <span>${getTranslation(lang, "teacher_course_detail.title_en")}</span>
                        <input type="text" name="titleEn" value="${task.title_en || ""}">
                    </label>

                    <label>
                        <span>${getTranslation(lang, "tasks.deadline")}</span>
                        <input type="datetime-local" name="deadline" value="${formatDateTimeLocal(task.deadline)}" required>
                    </label>

                    <label class="teacher-task-checkbox-label">
                        <input type="checkbox" name="isExam" ${task.is_exam ? "checked" : ""}>
                        <span>${getTranslation(lang, "teacher_course_detail.exam_task")}</span>
                    </label>
                </div>

                <label>
                    <span>${getTranslation(lang, "teacher_course_detail.description_uk")}</span>
                    <textarea name="descriptionUk" rows="5">${task.description_uk || ""}</textarea>
                </label>

                <label>
                    <span>${getTranslation(lang, "teacher_course_detail.description_en")}</span>
                    <textarea name="descriptionEn" rows="5">${task.description_en || ""}</textarea>
                </label>

                <button type="submit" class="teacher-task-save-btn">
                    ${getTranslation(lang, "teacher_task_detail.save")}
                </button>
            </form>
        `;
    }

    function renderSubmissions(submissions) {
        const lang = getCurrentLang();

        if (!submissions.length) {
            return `
                <p class="teacher-section-empty">
                    ${getTranslation(lang, "teacher_task_detail.no_submissions")}
                </p>
            `;
        }

        return `
            <div class="teacher-task-submissions-list">
                ${submissions.map(item => `
                    <article class="teacher-task-submission-card">
                        <div>
                            <h3>${item.student_name || getTranslation(lang, "teacher_course_detail.unknown_student")}</h3>
                            <p>${item.student_email || "—"}</p>
                            <p>
                                ${getTranslation(lang, "teacher_task_detail.submitted_at")}:
                                <strong>${formatDate(item.submitted_at)}</strong>
                            </p>
                        </div>

                        <div class="teacher-task-submission-status">
                            ${
                                item.status === "graded"
                                    ? `
                                        <span class="teacher-task-status graded">
                                            ${getTranslation(lang, "teacher_task_detail.graded")}: ${item.grade_value}
                                        </span>
                                    `
                                    : `
                                        <span class="teacher-task-status needs-grading">
                                            ${getTranslation(lang, "teacher_task_detail.pending")}
                                        </span>
                                    `
                            }
                        </div>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function bindEvents() {
        const editBtn = document.getElementById("taskEditBtn");
        const editForm = document.getElementById("editTaskForm");
        const backBtn = document.querySelector(".task-back-btn");

        if (backBtn) {
            backBtn.addEventListener("click", () => {
                const courseId = taskData?.task?.course_id;

                if (courseId) {
                    window.location.href = `./teacher-course-detail.html?id=${courseId}`;
                    return;
                }

                window.location.href = "./teacher-courses.html";
            });
        }

        if (editBtn) {
            editBtn.addEventListener("click", () => {
                isEditMode = !isEditMode;
                renderTask();
            });
        }

        if (editForm) {
            editForm.addEventListener("submit", handleUpdateTask);
        }
    }

    async function handleUpdateTask(event) {
        event.preventDefault();
        const lang = getCurrentLang();

        const token = getToken();
        const form = event.currentTarget;
        const formData = new FormData(form);

        const payload = {
            titleUk: String(formData.get("titleUk") || "").trim(),
            titleEn: String(formData.get("titleEn") || "").trim(),
            descriptionUk: String(formData.get("descriptionUk") || "").trim(),
            descriptionEn: String(formData.get("descriptionEn") || "").trim(),
            deadline: formData.get("deadline"),
            isExam: formData.get("isExam") === "on"
        };

        try {
            await fetchJson(`${API_BASE_URL}/teacher/tasks/${taskId}`, token, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            showToast(getTranslation(lang, "teacher_task_detail.update_success"), "success");

            isEditMode = false;
            await loadTask();

        } catch (error) {
            console.error("[Teacher Task Detail] Update error:", error);
            showToast(getTranslation(lang, "teacher_task_detail.update_error"), "error");
        }
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadTask();
});