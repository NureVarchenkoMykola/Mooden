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

    function formatDateTime(dateValue) {
        const lang = getCurrentLang();

        if (!dateValue) {
            return getTranslation(lang, "task_detail.not_submitted");
        }

        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return dateValue;

        const time = date.toLocaleTimeString(lang === "en" ? "en-US" : "uk-UA", {
            hour: "2-digit",
            minute: "2-digit"
        });

        const formattedDate = formatDate(dateValue);

        return `${time}<br><span class="task-date-secondary">${formattedDate}</span>`;
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
            console.error("[Dev Mode] Task detail load failed:", error);

            showEmpty(
                getTranslation(lang, "task_detail.unavailable_title"),
                getTranslation(lang, "task_detail.unavailable_text")
            );
        }
    }


    function renderSubmissionBlock(task) {
        const lang = getCurrentLang();
        const isSubmitted = Boolean(task.submitted_at);
        const isEditing = taskContent.dataset.editingSubmission === "true";

        if (isSubmitted) {
            if (isEditing) {
                return `
                    <div class="task-detail-card task-submission-card">
                        <h2>${getTranslation(lang, "task_detail.edit_submission_title")}</h2>

                        ${task.file_url ? `
                            <a class="submitted-file-card" href="${task.file_url}" target="_blank" rel="noopener noreferrer">
                        ` : `
                            <div class="submitted-file-card">
                        `}
                            <span class="submitted-file-icon">📎</span>
                            <div>
                                <p class="submitted-file-title">${getTranslation(lang, "task_detail.current_file")}</p>
                                <p class="submitted-file-link">${task.file_url ? getTranslation(lang, "task_detail.download_file") : getTranslation(lang, "task_detail.no_file_uploaded")}</p>
                            </div>
                        ${task.file_url ? `</a>` : `</div>`}

                        <form class="task-submit-form" id="taskSubmitForm" data-has-current-file="${task.file_url ? "true" : "false"}">
                            <label class="task-file-drop">
                                <input type="file" id="taskFileInput" name="file">
                                <span class="task-file-icon">📎</span>
                                <strong>${getTranslation(lang, "task_detail.choose_new_file")}</strong>
                                <small id="selectedFileName">${getTranslation(lang, "task_detail.no_file_selected")}</small>
                            </label>

                            <textarea 
                                id="taskContentInput"
                                name="content"
                                rows="4"
                                maxlength="2000"
                                placeholder="${getTranslation(lang, "task_detail.comment_placeholder")}"
                            >${task.submission_comment || ""}</textarea>

                            <button type="submit" class="task-submit-btn" id="taskSubmitBtn">
                                ${getTranslation(lang, "task_detail.save_submission_btn")}
                            </button>

                            <button type="button" class="task-cancel-edit-btn" id="cancelEditSubmissionBtn">
                                ${getTranslation(lang, "common.cancel")}
                            </button>
                        </form>
                    </div>
                `;
            }
            return `
                <div class="task-detail-card task-submission-card">
                    <h2>${getTranslation(lang, "task_detail.submission_title")}</h2>

                    ${task.file_url ? `
                        <a class="submitted-file-card" href="${task.file_url}" target="_blank" rel="noopener noreferrer">
                            <span class="submitted-file-icon">📎</span>
                            <div>
                                <p class="submitted-file-title">${getTranslation(lang, "task_detail.submitted_file")}</p>
                                <p class="submitted-file-link">${getTranslation(lang, "task_detail.download_file")}</p>
                            </div>
                        </a>
                        
                    ` : `
                        <div class="submitted-file-card">
                            <span class="submitted-file-icon">📎</span>
                            <div>
                                <p class="submitted-file-title">${getTranslation(lang, "task_detail.no_file_uploaded")}</p>
                            </div>
                        </div>
                    `}

                    <div class="submission-comment-box">
                        <span>${getTranslation(lang, "task_detail.submission_comment")}</span>
                        <p>${task.submission_comment || getTranslation(lang, "task_detail.no_submission_comment")}</p>
                    </div>

                    <button class="task-edit-submission-btn" type="button" id="editSubmissionBtn">
                        ${getTranslation(lang, "task_detail.edit_submission_btn")}
                    </button>
                </div>
            `;
        }

        return `
            <div class="task-detail-card task-submission-card">
                <h2>${getTranslation(lang, "task_detail.submit_title")}</h2>

                <form class="task-submit-form" id="taskSubmitForm">
                    <label class="task-file-drop">
                        <input type="file" id="taskFileInput" name="file">
                        <span class="task-file-icon">📎</span>
                        <strong>${getTranslation(lang, "task_detail.drop_file")}</strong>
                        <small id="selectedFileName">${getTranslation(lang, "task_detail.no_file_selected")}</small>
                    </label>

                    <textarea 
                        id="taskContentInput"
                        name="content"
                        rows="4"
                        maxlength="2000"
                        placeholder="${getTranslation(lang, "task_detail.comment_placeholder")}"
                    ></textarea>

                    <button type="submit" class="task-submit-btn">
                        ${getTranslation(lang, "task_detail.submit_btn")}
                    </button>
                </form>
            </div>
        `;
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

        const submittedDateTime =
            task.submitted_at
                ? formatDateTime(task.submitted_at)
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
                <div class="task-detail-main-col">
                    <div class="task-detail-card">
                        <h2>${getTranslation(lang, "task_detail.description_title")}</h2>

                        <p class="task-detail-text">
                            ${task.description || getTranslation(lang, "task_detail.no_description")}
                        </p>
                    </div>

                    ${renderSubmissionBlock(task)}
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
                            <span class="task-result-value">${submittedDateTime}</span>
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

        bindSubmitForm();
        bindEditSubmissionButtons(task);
    }

    function bindSubmitForm() {
        const form = document.getElementById("taskSubmitForm");
        const fileInput = document.getElementById("taskFileInput");
        const fileName = document.getElementById("selectedFileName");

        fileInput?.addEventListener("change", () => {
            const lang = getCurrentLang();

            fileName.textContent =
                fileInput.files[0]?.name ||
                getTranslation(lang, "task_detail.no_file_selected");
        });

        form?.addEventListener("submit", async event => {
            event.preventDefault();

            const lang = getCurrentLang();
            const token = getToken();

            if (!token) return;

            const commentValue = document.getElementById("taskContentInput")?.value.trim() || "";
            const hasFile = Boolean(fileInput?.files?.length);

            const hasCurrentFile = form.dataset.hasCurrentFile === "true";

            if (!hasFile && !commentValue && !hasCurrentFile) {
                showToast(getTranslation(lang, "errors.EMPTY_SUBMISSION"), "error");
                return;
            }

            const submitBtn = form.querySelector(".task-submit-btn");
            const formData = new FormData(form);

            submitBtn.disabled = true;
            submitBtn.textContent = getTranslation(lang, "task_detail.submitting");

            try {
                const response = await fetch(`${API_BASE_URL}/student/tasks/${taskId}/submit`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.message || "SUBMISSION_ERROR");
                }

                taskContent.dataset.editingSubmission = "false";
                loadTask();
                
            } catch (error) {
                console.error("[Dev Mode] Task submission failed:", error);

                submitBtn.disabled = false;
                submitBtn.textContent = getTranslation(lang, "task_detail.submit_btn");

                const errorKey = `errors.${error.message}`;
                const translatedError = getTranslation(lang, errorKey);

                showToast(
                    translatedError !== errorKey
                        ? translatedError
                        : getTranslation(lang, "errors.SUBMISSION_ERROR"),
                    "error"
                );
             }
        });
    }

    function bindEditSubmissionButtons(task) {
        const editBtn = document.getElementById("editSubmissionBtn");
        const cancelBtn = document.getElementById("cancelEditSubmissionBtn");

        editBtn?.addEventListener("click", () => {
            taskContent.dataset.editingSubmission = "true";
            renderTask(task);
        });

        cancelBtn?.addEventListener("click", () => {
            taskContent.dataset.editingSubmission = "false";
            renderTask(task);
        });
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadTask();
});