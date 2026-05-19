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

    function getCourseStatus(progress) {
        const lang = getCurrentLang();
        const value = Number(progress || 0);

        if (value >= 100) return getTranslation(lang, "courses.status_completed");
        if (value <= 0) return getTranslation(lang, "courses.status_new");
        return getTranslation(lang, "courses.status_active");
    }

    function getCourseIcon(title = "") {
        const value = String(title).toLowerCase();
        if (value.includes("sql") || value.includes("баз")) return "🗄️";
        if (value.includes("web") || value.includes("веб") || value.includes("html")) return "💻";
        if (value.includes("алгоритм") || value.includes("algorithm")) return "🧠";
        return "📚";
    }

    function getTaskStatusText(status) {
        const lang = getCurrentLang();
        if (status === "graded") return getTranslation(lang, "tasks.status_graded");
        if (status === "overdue") return getTranslation(lang, "tasks.status_overdue");
        if (status === "submitted") return getTranslation(lang, "tasks.status_submitted");
        return getTranslation(lang, "tasks.status_pending");
    }

    function getMaterialTypeText(type) {
        const lang = getCurrentLang();
        if (!type) return getTranslation(lang, "course_detail.material_other");

        const key = `course_detail.material_${type}`;
        const result = getTranslation(lang, key);
        return result === key ? getTranslation(lang, "course_detail.material_other") : result;
    }

    function getGradeAverage(tasks) {
        const grades = tasks
            .filter(task => task.grade_value !== null && task.grade_value !== undefined)
            .map(task => Number(task.grade_value))
            .filter(value => !Number.isNaN(value));

        if (!grades.length) return null;
        return Math.round(grades.reduce((sum, value) => sum + value, 0) / grades.length);
    }

    function showEmpty(title, text = "") {
        courseContent.innerHTML = `
            <div class="course-empty-card">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
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

        if (response.status === 401 || response.status === 403) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '../index.html';
            return null;
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || `Returned ${response.status}`);
        }
        return data;
    }

    async function loadCourse() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!courseId) {
            showEmpty(getTranslation(lang, "course_detail.not_found_title"), getTranslation(lang, "course_detail.not_found_text"));
            return;
        }

        if (!token) {
            showEmpty(getTranslation(lang, "errors.UNAUTHORIZED"), "");
            return;
        }

        try {
            courseContent.innerHTML = `
                <div class="course-loading-card">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const detailData = await fetchJson(`${API_BASE_URL}/student/courses/${courseId}/detail`, token);

            renderCourse({
                course: detailData.course,
                materials: detailData.materials || [],
                tasks: detailData.tasks || [],
                attendance: detailData.attendance || []
            });
        } catch (error) {
            console.error("[Course Detail] Не вдалося завантажити курс:", error);
            showToast(getTranslation(lang, `errors.${error.message}`), 'error');
            showEmpty(getTranslation(lang, "course_detail.unavailable_title"), getTranslation(lang, "course_detail.unavailable_text"));
        }
    }

    function getMaterialIcon(type) {
        const icons = { lecture: "📘", manual: "📄", video: "🎥", link: "🔗", book: "📚" };
        return icons[type] || "📎";
    }

    function getMaterialTypeOrder() {
        return ["lecture", "manual", "video", "link", "book", "other"];
    }

    function groupMaterialsByType(materials) {
        const grouped = {};
        materials.forEach(material => {
            const type = material.material_type || "other";
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(material);
        });
        return grouped;
    }

    function renderMaterials(materials) {
        const lang = getCurrentLang();
        if (!materials.length) {
            return `<p class="course-section-empty">${getTranslation(lang, "course_detail.no_materials")}</p>`;
        }

        const groupedMaterials = groupMaterialsByType(materials);
        const orderedTypes = getMaterialTypeOrder();

        return `
            <div class="course-material-groups">
                ${orderedTypes
                    .filter(type => groupedMaterials[type] && groupedMaterials[type].length > 0)
                    .map(type => `
                        <section class="course-material-group">
                            <div class="course-material-group-header">
                                <span class="course-material-group-icon">${getMaterialIcon(type)}</span>
                                <div>
                                    <h3>${getMaterialTypeText(type)}</h3>
                                    <p>${groupedMaterials[type].length} ${getTranslation(lang, "course_detail.materials_count")}</p>
                                </div>
                            </div>
                            <div class="course-materials-list">
                                ${groupedMaterials[type].map(material => `
                                    <a class="course-material-card" href="${material.file_url}" target="_blank" rel="noopener noreferrer">
                                        <div class="course-material-info">
                                            <span class="course-material-small-icon">${getMaterialIcon(material.material_type)}</span>
                                            <div>
                                                <h4>${material.title}</h4>
                                                <p>${getMaterialTypeText(material.material_type)}</p>
                                            </div>
                                        </div>
                                        <span class="course-material-open">↗</span>
                                    </a>
                                `).join("")}
                            </div>
                        </section>
                    `).join("")}
            </div>
        `;
    }

    function renderTasks(tasks) {
        const lang = getCurrentLang();
        if (!tasks.length) {
            return `<p class="course-section-empty">${getTranslation(lang, "course_detail.no_tasks")}</p>`;
        }

        return `
            <div class="course-tasks-list">
                ${tasks.map(task => `
                    <article class="course-task-card">
                        <div class="course-task-top">
                            <h3 class="course-task-title">${task.title}</h3>
                            <div class="course-task-badges">
                                ${task.is_exam ? `<span class="course-task-badge">${getTranslation(lang, "tasks.exam")}</span>` : ""}
                                <span class="course-task-status ${task.status}">
                                    ${getTaskStatusText(task.status)}
                                </span>
                            </div>
                        </div>
                        <p class="course-task-meta">
                            ${getTranslation(lang, "tasks.deadline")}: <span class="course-task-date">${formatDate(task.deadline)}</span>
                        </p>
                        <p class="course-task-meta">
                            ${getTranslation(lang, "tasks.grade")}: <span class="course-task-grade">${task.grade_value ?? getTranslation(lang, "tasks.no_grade")}</span>
                        </p>
                        <button class="course-task-open-btn" type="button" data-task-id="${task.id}">
                            ${getTranslation(lang, "tasks.open_btn")}
                        </button>
                    </article>
                `).join("")}
            </div>
        `;
    }

    function renderAttendance(attendance) {
        const lang = getCurrentLang();
        if (!attendance.length) {
            return `<p class="course-section-empty">${getTranslation(lang, "course_detail.no_attendance")}</p>`;
        }

        return `
            <div class="course-attendance-list">
                ${attendance.map(item => {
                    const canMark = item.can_mark === true && !item.is_present && isLessonNow(item);

                    return `
                        <div class="course-attendance-item">
                            <div>
                                <strong>${formatDate(item.lesson_date)}</strong>
                                <span>
                                    ${formatTime(item.time_start)} - ${formatTime(item.time_end)}
                                    <br>
                                    ${getLessonTypeText(item.type || item.lesson_type)}
                                </span>
                            </div>
                            <div class="attendance-actions">
                                <span class="attendance-status ${item.is_present ? "present" : "absent"}">
                                    ${item.is_present 
                                        ? getTranslation(lang, "course_detail.attendance_present") 
                                        : getTranslation(lang, "course_detail.attendance_absent")}
                                </span>
                                ${canMark ? `
                                    <button class="attendance-mark-btn" type="button" data-schedule-id="${item.schedule_id}">
                                        ${getTranslation(lang, "course_detail.mark_attendance")}
                                    </button>
                                ` : ""}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        `;
    }

    function renderCourse(data) {
        const lang = getCurrentLang();
        const course = data.course;
        if (!course) return;

        if (course.color_accent) {
            courseContent.style.setProperty("--course-accent", course.color_accent);
        }

        const progress = Number(course.progress_percent || 0);
        const averageGrade = getGradeAverage(data.tasks);

        courseContent.innerHTML = `
            <header class="course-detail-header">
                <div class="course-detail-icon">${getCourseIcon(course.title)}</div>
                <div class="course-detail-meta">
                    <span class="course-detail-status">
                        ${getCourseStatus(progress)}
                    </span>
                    <h1>${course.title}</h1>
                    <p>${course.description || getTranslation(lang, "course_detail.no_description")}</p>
                    <div class="course-progress-bar">
                        <div class="course-progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <button class="course-back-link course-back-btn" type="button">
                    ← ${getTranslation(lang, "common.go_back")}
                </button>
            </header>

            <section class="course-detail-stats">
                <div class="course-stat-card">
                    <span class="course-stat-icon">📈</span>
                    <div>
                        <p class="course-stat-value">${progress}%</p>
                        <p class="course-stat-label">${getTranslation(lang, "course_detail.progress")}</p>
                    </div>
                </div>
                <div class="course-stat-card">
                    <span class="course-stat-icon">📝</span>
                    <div>
                        <p class="course-stat-value">${data.tasks.length}</p>
                        <p class="course-stat-label">${getTranslation(lang, "course_detail.tasks_count")}</p>
                    </div>
                </div>
                <div class="course-stat-card">
                    <span class="course-stat-icon">⭐</span>
                    <div>
                        <p class="course-stat-value">${averageGrade ?? "—"}</p>
                        <p class="course-stat-label">${getTranslation(lang, "course_detail.average_grade")}</p>
                    </div>
                </div>
            </section>

            <section class="course-detail-layout">
                <div class="course-main-card">
                    <h2>${getTranslation(lang, "course_detail.tasks_title")}</h2>
                    ${renderTasks(data.tasks)}
                </div>
                <aside class="course-side-card">
                    <div class="materials-card">
                        <h2>${getTranslation(lang, "course_detail.materials_title")}</h2>
                        ${renderMaterials(data.materials)}
                    </div>
                    <div class="attendance-card">
                        <div class="course-side-heading-row">
                            <h2 class="course-side-subtitle">${getTranslation(lang, "course_detail.attendance_title")}</h2>
                            <a class="course-attendance-link" href="./student-course-attendance.html?id=${course.id}">
                                ${getTranslation(lang, "course_detail.view_all_attendance")}
                            </a>
                        </div>
                        ${renderAttendance(data.attendance)}
                    </div>
                </aside>
            </section>
        `;

        bindTaskButtons();
        bindAttendanceButtons();
        bindBackButton();

        function bindBackButton() {
            const backButton = document.querySelector(".course-back-btn");

            backButton?.addEventListener("click", () => {
                if (window.history.length > 1) {
                    window.history.back();
                    return;
                }

                window.location.href = "./student-courses.html";
            });
        }
    }

    function bindTaskButtons() {
        document.querySelectorAll(".course-task-open-btn").forEach(button => {
            button.addEventListener("click", () => {
                window.location.href = `./student-task-detail.html?id=${button.dataset.taskId}`;
            });
        });
    }

    function bindAttendanceButtons() {
        document.querySelectorAll(".attendance-mark-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const lang = getCurrentLang();
                const scheduleId = button.dataset.scheduleId;
                const token = getToken();
                if (!scheduleId || !token) return;

                button.disabled = true;
                button.textContent = getTranslation(lang, "course_detail.marking");

                try {
                    const response = await fetch(`${API_BASE_URL}/student/attendance/mark`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ scheduleId: Number(scheduleId) })
                    });

                    const resData = await response.json().catch(() => ({}));
                    if (!response.ok) throw new Error(resData.message || "ATTENDANCE_ERROR");

                    showToast(getTranslation(lang, "course_detail.attendance_marked"), "success");
                    loadCourse();
                } catch (error) {
                    console.error("[Course Detail] Не вдалося позначити відвідування:", error);
                    button.disabled = false;
                    button.textContent = getTranslation(lang, "course_detail.mark_attendance");
                    showToast(getTranslation(lang, `errors.${error.message}`), "error");
                }
            });
        });
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadCourse();
});