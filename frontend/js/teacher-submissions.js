document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("teacherSubmissionsList");
    const searchInput = document.getElementById("submissionSearch");
    const filterSelect = document.getElementById("submissionFilter");
    const courseFilter = document.getElementById("courseFilter");
    const taskFilter = document.getElementById("taskFilter");

    const totalEl = document.getElementById("submissionsTotal");
    const pendingEl = document.getElementById("submissionsPending");
    const gradedEl = document.getElementById("submissionsGraded");

    let submissions = [];

    if (filterSelect) {
        filterSelect.value = "pending";
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

    function formatDateTime(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const lang = getCurrentLang();
        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleString(lang === "en" ? "en-US" : "uk-UA", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
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
        list.innerHTML = `
            <div class="teacher-submissions-empty">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    async function loadSubmissions() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!token) {
            showEmpty(getTranslation(lang, "errors.UNAUTHORIZED"), "");
            return;
        }

        try {
            list.innerHTML = `
                <div class="teacher-submissions-loading">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/teacher/submissions`, token);

            submissions = Array.isArray(data.submissions) ? data.submissions : [];

            updateStats(data.stats || {});
            populateCourseFilter();
            populateTaskFilter();
            renderSubmissions();
        } catch (error) {
            console.error("[Teacher Submissions] Помилка:", error);

            showEmpty(
                getTranslation(lang, "teacher_submissions.unavailable_title"),
                getTranslation(lang, "teacher_submissions.unavailable_text")
            );
        }
    }

    function updateStats(stats) {
        const total = Number(stats.total ?? submissions.length ?? 0);
        const pending = Number(stats.pending ?? submissions.filter(item => item.status === "pending").length);
        const graded = Number(stats.graded ?? submissions.filter(item => isSubmissionGraded(item)).length);

        totalEl.textContent = total;
        pendingEl.textContent = pending;
        gradedEl.textContent = graded;
    }

    function populateCourseFilter() {
        const lang = getCurrentLang();

        if (!courseFilter) return;

        const selectedValue = courseFilter.value || "all";

        const coursesMap = new Map();

        submissions.forEach(item => {
            if (item.course_id && item.course_title) {
                coursesMap.set(String(item.course_id), item.course_title);
            }
        });

        courseFilter.innerHTML = `
            <option value="all">${getTranslation(lang, "teacher_submissions.filter_course_all")}</option>
            ${Array.from(coursesMap.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([id, title]) => `
                <option value="${id}">${title}</option>
            `).join("")}
        `;

        if ([...coursesMap.keys()].includes(selectedValue)) {
            courseFilter.value = selectedValue;
        } else {
            courseFilter.value = "all";
        }
    }

    function populateTaskFilter() {
        const lang = getCurrentLang();

        if (!taskFilter) return;

        const selectedCourseId = courseFilter?.value || "all";
        const selectedTaskId = taskFilter.value || "all";

        const tasksMap = new Map();

        submissions.forEach(item => {
            const matchesCourse =
                selectedCourseId === "all" ||
                String(item.course_id) === selectedCourseId;

            if (matchesCourse && item.task_id && item.task_title) {
                tasksMap.set(String(item.task_id), item.task_title);
            }
        });

        taskFilter.innerHTML = `
            <option value="all">${getTranslation(lang, "teacher_submissions.filter_task_all")}</option>
            ${Array.from(tasksMap.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([id, title]) => `
                <option value="${id}">${title}</option>
            `).join("")}
        `;

        if ([...tasksMap.keys()].includes(selectedTaskId)) {
            taskFilter.value = selectedTaskId;
        } else {
            taskFilter.value = "all";
        }
    }

    function getFilteredSubmissions() {
        const query = String(searchInput?.value || "").trim().toLowerCase();
        const filter = filterSelect?.value || "all";
        const selectedCourseId = courseFilter?.value || "all";
        const selectedTaskId = taskFilter?.value || "all";

        let result = [...submissions];

        if (filter === "pending") {
            result = result.filter(item => !isSubmissionGraded(item));
        }

        if (filter === "graded") {
            result = result.filter(item => isSubmissionGraded(item));
        }

        if (selectedCourseId !== "all") {
            result = result.filter(item => String(item.course_id) === selectedCourseId);
        }

        if (selectedTaskId !== "all") {
            result = result.filter(item => String(item.task_id) === selectedTaskId);
        }

        if (query) {
            result = result.filter(item => {
                const student = String(item.student_name || "").toLowerCase();
                const course = String(item.course_title || "").toLowerCase();
                const task = String(item.task_title || "").toLowerCase();
                const email = String(item.student_email || "").toLowerCase();

                return (
                    student.includes(query) ||
                    course.includes(query) ||
                    task.includes(query) ||
                    email.includes(query)
                );
            });
        }

        return result;
    }

    function getStatusText(status) {
        const lang = getCurrentLang();

        if (status === "graded") {
            return getTranslation(lang, "teacher_submissions.status_graded");
        }

        return getTranslation(lang, "teacher_submissions.status_pending");
    }

    function renderSubmissions() {
        const lang = getCurrentLang();
        const items = getFilteredSubmissions();

        if (!items.length) {
            showEmpty(
                getTranslation(lang, "teacher_submissions.empty_title"),
                getTranslation(lang, "teacher_submissions.empty_text")
            );
            return;
        }

        list.innerHTML = items.map(item => renderSubmissionCard(item)).join("");

        bindGradeButtons();
    }

    function isSubmissionGraded(item) {
        return (
            item.status === "graded" ||
            (item.grade_value !== null && item.grade_value !== undefined) ||
            (item.grade !== null && item.grade !== undefined) ||
            (item.graded_at !== null && item.graded_at !== undefined)
        );
    }

    function renderSubmissionCard(item) {
        const lang = getCurrentLang();

        const isGraded = isSubmissionGraded(item);

        const contentBlock = item.content
            ? `<p class="submission-content">${item.content}</p>`
            : `<p class="submission-content muted">${getTranslation(lang, "teacher_submissions.no_content")}</p>`;

        const fileBlock = item.file_url
            ? `
                <a class="submission-file-link" href="${item.file_url}" target="_blank" rel="noopener noreferrer">
                    ${getTranslation(lang, "teacher_submissions.open_file")}
                </a>
            `
            : `<span class="submission-no-file">${getTranslation(lang, "teacher_submissions.no_file")}</span>`;

        return `
            <article class="teacher-submission-card ${isGraded ? "graded" : "pending"}">
                <div class="submission-card-top">
                    <div>
                        <span class="submission-course">${item.course_title || "—"}</span>
                        <h2>${item.task_title || getTranslation(lang, "tasks.unknown_task")}</h2>
                    </div>

                    <span class="submission-status ${isGraded ? "graded" : "pending"}">
                        ${getStatusText(isGraded ? "graded" : "pending")}
                    </span>
                </div>

                <div class="submission-meta">
                    <div>
                        <span>${getTranslation(lang, "teacher_submissions.student")}</span>
                        <strong>${item.student_name || getTranslation(lang, "teacher_course_detail.unknown_student")}</strong>
                    </div>

                    <div>
                        <span>${getTranslation(lang, "teacher_submissions.email")}</span>
                        <strong>${item.student_email || "—"}</strong>
                    </div>

                    <div>
                        <span>${getTranslation(lang, "teacher_submissions.submitted_at")}</span>
                        <strong>${formatDateTime(item.submitted_at)}</strong>
                    </div>

                    <div>
                        <span>${getTranslation(lang, "tasks.deadline")}</span>
                        <strong>${formatDate(item.deadline)}</strong>
                    </div>
                </div>

                <div class="submission-body">
                    <div>
                        <h3>${getTranslation(lang, "teacher_submissions.work_content")}</h3>
                        ${contentBlock}
                    </div>

                    <div>
                        <h3>${getTranslation(lang, "teacher_submissions.file")}</h3>
                        ${fileBlock}
                    </div>
                </div>

                <div class="submission-grade-panel">
                    <div class="submission-grade-inputs">
                        <label>
                            <span>${getTranslation(lang, "tasks.grade")}</span>
                            <input
                                class="grade-input"
                                type="number"
                                min="0"
                                max="100"
                                value="${item.grade_value ?? ""}"
                                placeholder="0-100"
                            >
                        </label>

                        <label>
                            <span>${getTranslation(lang, "teacher_submissions.feedback")}</span>
                            <textarea
                                class="feedback-input"
                                rows="3"
                                placeholder="${getTranslation(lang, "teacher_submissions.feedback_placeholder")}"
                            >${item.feedback || ""}</textarea>
                        </label>
                    </div>

                    <button class="grade-submit-btn" type="button" data-submission-id="${item.submission_id}">
                        ${
                            isGraded
                                ? getTranslation(lang, "teacher_submissions.update_grade")
                                : getTranslation(lang, "teacher_submissions.grade_btn")
                        }
                    </button>
                </div>
            </article>
        `;
    }

    function launchPerfectGradeAnimation(card) {
        card.classList.add("perfect-grade-pulse");

        launchConfetti(card);
        launchBees(card);

        setTimeout(() => {
            card.classList.remove("perfect-grade-pulse");
        }, 1300);
    }

    function launchConfetti(card) {
        const rootStyles = getComputedStyle(document.documentElement);

        const colors = [
            rootStyles.getPropertyValue("--accent-gold").trim(),
            rootStyles.getPropertyValue("--color-offline").trim(),
            rootStyles.getPropertyValue("--text-main").trim(),
            rootStyles.getPropertyValue("--accent-gold-hover").trim()
        ];

        const cardWidth = card.offsetWidth;
        const cardHeight = card.offsetHeight;

        for (let i = 0; i < 46; i++) {
            const confetti = document.createElement("span");

            confetti.className = "perfect-confetti";

            const side = Math.floor(Math.random() * 4);

            if (side === 0) {
                confetti.style.left = `${Math.random() * cardWidth}px`;
                confetti.style.top = "-12px";
            } else if (side === 1) {
                confetti.style.left = `${cardWidth + 8}px`;
                confetti.style.top = `${Math.random() * cardHeight}px`;
            } else if (side === 2) {
                confetti.style.left = `${Math.random() * cardWidth}px`;
                confetti.style.top = `${cardHeight + 8}px`;
            } else {
                confetti.style.left = "-12px";
                confetti.style.top = `${Math.random() * cardHeight}px`;
            }

            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = `${Math.random() * 0.25}s`;

            confetti.style.setProperty("--confetti-x", `${(Math.random() - 0.5) * 180}px`);
            confetti.style.setProperty("--confetti-y", `${-80 - Math.random() * 120}px`);
            confetti.style.setProperty("--confetti-rotate", `${Math.random() * 720}deg`);

            card.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, 1700);
        }
    }

    function launchBees(card) {
        const cardWidth = card.offsetWidth;
        const cardHeight = card.offsetHeight;

        for (let i = 0; i < 10; i++) {
            const bee = document.createElement("span");

            bee.className = "perfect-bee";
            bee.textContent = "🐝";

            const side = Math.floor(Math.random() * 4);

            if (side === 0) {
                bee.style.left = `${Math.random() * cardWidth}px`;
                bee.style.top = "-18px";
            } else if (side === 1) {
                bee.style.left = `${cardWidth + 10}px`;
                bee.style.top = `${Math.random() * cardHeight}px`;
            } else if (side === 2) {
                bee.style.left = `${Math.random() * cardWidth}px`;
                bee.style.top = `${cardHeight + 10}px`;
            } else {
                bee.style.left = "-18px";
                bee.style.top = `${Math.random() * cardHeight}px`;
            }

            bee.style.animationDelay = `${Math.random() * 0.35}s`;
            bee.style.setProperty("--bee-x", `${(Math.random() - 0.5) * 320}px`);
            bee.style.setProperty("--bee-y", `${-90 - Math.random() * 140}px`);

            card.appendChild(bee);

            setTimeout(() => {
                bee.remove();
            }, 2300);
        }
    }

    function preserveScrollAfterReload(callback, delay = 0) {
        const currentScrollY = window.scrollY;

        setTimeout(async () => {
            await callback();

            requestAnimationFrame(() => {
                window.scrollTo(0, currentScrollY);
            });
        }, delay);
    }

    function bindGradeButtons() {
        document.querySelectorAll(".grade-submit-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const lang = getCurrentLang();
                const card = button.closest(".teacher-submission-card");
                const submissionId = button.dataset.submissionId;
                const originalButtonText = button.textContent;

                const gradeInput = card.querySelector(".grade-input");
                const feedbackInput = card.querySelector(".feedback-input");

                const gradeRaw = gradeInput.value.trim();
                const gradeValue = Number(gradeRaw);
                const feedback = feedbackInput.value.trim();

                if (gradeRaw === "" || Number.isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
                    showToast(getTranslation(lang, "teacher_submissions.invalid_grade"), "error");
                    return;
                }

                button.disabled = true;
                button.textContent = getTranslation(lang, "teacher_submissions.saving");

                try {
                    const token = getToken();

                    await fetchJson(`${API_BASE_URL}/teacher/submissions/${submissionId}/grade`, token, {
                        method: "POST",
                        body: JSON.stringify({
                            gradeValue,
                            feedback
                        })
                    });

                    if (gradeValue === 100) {
                        launchPerfectGradeAnimation(card);
                    }

                    if (typeof showToast === "function") {
                        showToast(getTranslation(lang, "teacher_submissions.grade_saved"), "success");
                    }

                    preserveScrollAfterReload(
                        async () => {
                            await loadSubmissions();
                        },
                        gradeValue === 100 ? 1300 : 0
                    );
                } catch (error) {
                    console.error("[Teacher Submissions] Не вдалося оцінити:", error);

                    button.disabled = false;
                    button.textContent = originalButtonText;

                    if (typeof showToast === "function") {
                        showToast(getTranslation(lang, "teacher_submissions.grade_error"), "error");
                    }
                }
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderSubmissions);
    }

    if (filterSelect) {
        filterSelect.addEventListener("change", renderSubmissions);
    }

    if (courseFilter) {
        courseFilter.addEventListener("change", () => {
            populateTaskFilter();
            renderSubmissions();
        });
    }

    if (taskFilter) {
        taskFilter.addEventListener("change", renderSubmissions);
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadSubmissions();
});