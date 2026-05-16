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

    function formatDate(dateValue) {
        const lang = getCurrentLang();

        if (!dateValue) {
            return getTranslation(lang, "course_detail.no_deadline");
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

    function formatTime(timeValue) {
        if (!timeValue) {
            return "—";
        }

        return String(timeValue).slice(0, 5);
    }

    function getCourseStatus(progress) {
        const lang = getCurrentLang();
        const value = Number(progress || 0);

        if (value >= 100) {
            return getTranslation(lang, "courses.status_completed");
        }

        if (value <= 0) {
            return getTranslation(lang, "courses.status_new");
        }

        return getTranslation(lang, "courses.status_active");
    }

    function getCourseIcon(title = "") {
        const value = String(title).toLowerCase();

        if (value.includes("sql") || value.includes("баз")) {
            return "🗄️";
        }

        if (value.includes("web") || value.includes("веб") || value.includes("html")) {
            return "💻";
        }

        if (value.includes("алгоритм") || value.includes("algorithm")) {
            return "🧠";
        }

        return "📚";
    }

    function getTaskStatusText(status) {
        const lang = getCurrentLang();

        if (status === "graded") {
            return getTranslation(lang, "tasks.status_graded");
        }

        if (status === "overdue") {
            return getTranslation(lang, "tasks.status_overdue");
        }

        if (status === "submitted") {
            return getTranslation(lang, "tasks.status_submitted");
        }

        return getTranslation(lang, "tasks.status_pending");
    }

    function getMaterialTypeText(type) {
        const lang = getCurrentLang();

        if (!type) {
            return getTranslation(lang, "course_detail.material_other");
        }

        const key = `course_detail.material_${type}`;
        const result = getTranslation(lang, key);

        if (result === key) {
            return getTranslation(lang, "course_detail.material_other");
        }

        return result;
    }

    function getLessonTypeText(type) {
        const lang = getCurrentLang();

        if (!type) {
            return "—";
        }

        const key = `course_detail.lesson_${type}`;
        const result = getTranslation(lang, key);

        if (result === key) {
            return type;
        }

        return result;
    }

    function getGradeAverage(tasks) {
        const grades = tasks
            .map(task => Number(task.grade_value))
            .filter(value => !Number.isNaN(value));

        if (!grades.length) {
            return null;
        }

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

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `${url} returned ${response.status}`);
        }

        return data;
    }

    async function loadCourse() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!courseId) {
            showEmpty(
                getTranslation(lang, "course_detail.not_found_title"),
                getTranslation(lang, "course_detail.not_found_text")
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
            courseContent.innerHTML = `
                <div class="course-loading-card">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const detailUrl = `${API_BASE_URL}/student/courses/${courseId}/detail`;
            const attendanceUrl = `${API_BASE_URL}/student/courses/${courseId}/attendance`;

            const detailData = await fetchJson(detailUrl, token);

            let attendanceData = { attendance: [] };

            try {
                attendanceData = await fetchJson(attendanceUrl, token);
            } catch (attendanceError) {
                console.warn("[Course Detail] Відвідуваність не завантажена:", attendanceError);
            }

            renderCourse({
                course: detailData.course,
                materials: detailData.materials || [],
                tasks: detailData.tasks || [],
                attendance: attendanceData.attendance || []
            });
        } catch (error) {
            console.error("[Course Detail] Не вдалося завантажити курс:", error);

            showEmpty(
                getTranslation(lang, "course_detail.unavailable_title"),
                getTranslation(lang, "course_detail.unavailable_text")
            );
        }
    }

    function getMaterialIcon(type) {
    if (type === "lecture") {
        return "📘";
    }

    if (type === "manual") {
        return "📄";
    }

    if (type === "video") {
        return "🎥";
    }

    if (type === "link") {
        return "🔗";
    }

    if (type === "book") {
        return "📚";
    }

    return "📎";
}

function getMaterialTypeOrder() {
    return ["lecture", "manual", "video", "link", "book", "other"];
}

function groupMaterialsByType(materials) {
    const grouped = {};

    materials.forEach(material => {
        const type = material.material_type || "other";

        if (!grouped[type]) {
            grouped[type] = [];
        }

        grouped[type].push(material);
    });

    return grouped;
}

function renderMaterials(materials) {
    const lang = getCurrentLang();

    if (!materials.length) {
        return `
            <p class="course-section-empty">
                ${getTranslation(lang, "course_detail.no_materials")}
            </p>
        `;
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
                                <p>
                                    ${groupedMaterials[type].length}
                                    ${getTranslation(lang, "course_detail.materials_count")}
                                </p>
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
            return `
                <p class="course-section-empty">
                    ${getTranslation(lang, "course_detail.no_tasks")}
                </p>
            `;
        }

        return `
            <div class="course-tasks-list">
                ${tasks.map(task => `
                    <article class="course-task-card">
                        <div class="course-task-top">
                            <h3 class="course-task-title">${task.title}</h3>

                            <div class="course-task-badges">
                                ${
                                    task.is_exam
                                        ? `<span class="course-task-badge">${getTranslation(lang, "tasks.exam")}</span>`
                                        : ""
                                }

                                <span class="course-task-status ${task.status}">
                                    ${getTaskStatusText(task.status)}
                                </span>
                            </div>
                        </div>

                        <p class="course-task-meta">
                            ${getTranslation(lang, "tasks.deadline")}:
                            <strong>${formatDate(task.deadline)}</strong>
                        </p>

                        <p class="course-task-meta">
                            ${getTranslation(lang, "tasks.grade")}:
                            <strong>${task.grade_value ?? getTranslation(lang, "tasks.no_grade")}</strong>
                        </p>

                        <button class="course-task-open-btn" type="button" data-task-id="${task.id}">
                            ${getTranslation(lang, "tasks.open_btn")}
                        </button>
                    </article>
                `).join("")}
            </div>
        `;
    }
        function getLocalDatePart(dateValue) {
    if (!dateValue) {
        return null;
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue).split("T")[0];
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getLocalDatePart(dateValue) {
    if (!dateValue) {
        return null;
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue).split("T")[0];
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function addMinutesToTime(timeValue, minutesToAdd) {
    const [hours, minutes, seconds] = String(timeValue || "00:00:00")
        .split(":")
        .map(Number);

    const date = new Date();
    date.setHours(hours || 0, minutes || 0, seconds || 0, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);

    const newHours = String(date.getHours()).padStart(2, "0");
    const newMinutes = String(date.getMinutes()).padStart(2, "0");
    const newSeconds = String(date.getSeconds()).padStart(2, "0");

    return `${newHours}:${newMinutes}:${newSeconds}`;
}

function isLessonOpenNow(item) {
    if (!item.lesson_date) {
        return false;
    }

    const lessonDate = getLocalDatePart(item.lesson_date);

    if (!lessonDate) {
        return false;
    }

    const startTime = item.time_start || item.start_time;

    if (!startTime) {
        return false;
    }

    const endTime =
        item.time_end ||
        item.end_time ||
        addMinutesToTime(startTime, 80);

    const lessonStart = new Date(`${lessonDate}T${startTime}`);
    const lessonEnd = new Date(`${lessonDate}T${endTime}`);
    const now = new Date();

    if (Number.isNaN(lessonStart.getTime()) || Number.isNaN(lessonEnd.getTime())) {
        return false;
    }

    return now >= lessonStart && now <= lessonEnd;
}
function getLocalDatePart(dateValue) {
    if (!dateValue) {
        return null;
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue).split("T")[0];
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getTodayLocalDatePart() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isLessonToday(item) {
    const lessonDate = getLocalDatePart(item.lesson_date);
    const today = getTodayLocalDatePart();

    return lessonDate === today;
}
    function renderAttendance(attendance) {
        const lang = getCurrentLang();

        if (!attendance.length) {
            return `
                <p class="course-section-empty">
                    ${getTranslation(lang, "course_detail.no_attendance")}
                </p>
            `;
        }

        return `
            <div class="course-attendance-list">
                ${attendance.map(item => {
                    const canMark =
    item.can_mark === true &&
    !item.is_present &&
    isLessonToday(item);
                    return `
                        <div class="course-attendance-item">
                            <div>
                                <strong>${formatDate(item.lesson_date)}</strong>
                                <span>
                                    ${formatTime(item.time_start)}
                                    ·
                                    ${getLessonTypeText(item.type || item.lesson_type)}
                                </span>
                            </div>

                            <div class="attendance-actions">
                                <span class="attendance-status ${item.is_present ? "present" : "absent"}">
                                    ${
                                        item.is_present
                                            ? getTranslation(lang, "course_detail.attendance_present")
                                            : getTranslation(lang, "course_detail.attendance_absent")
                                    }
                                </span>

                                ${
                                    canMark
                                        ? `
                                            <button class="attendance-mark-btn" type="button" data-schedule-id="${scheduleId}">
                                                ${getTranslation(lang, "course_detail.mark_attendance")}
                                            </button>
                                        `
                                        : ""
                                }
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
        const materials = data.materials;
        const tasks = data.tasks;
        const attendance = data.attendance;

        if (!course) {
            showEmpty(
                getTranslation(lang, "course_detail.not_found_title"),
                getTranslation(lang, "course_detail.not_found_text")
            );
            return;
        }

        if (course.color_accent) {
            courseContent.style.setProperty("--course-accent", course.color_accent);
        }

        const progress = Number(course.progress_percent || 0);
        const averageGrade = getGradeAverage(tasks);

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
                        <p class="course-stat-value">${tasks.length}</p>
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
                    ${renderTasks(tasks)}
                </div>

                <aside class="course-side-card">
                    <h2>${getTranslation(lang, "course_detail.materials_title")}</h2>
                    ${renderMaterials(materials)}

                    <div class="course-side-heading-row">
                    <h2 class="course-side-subtitle">${getTranslation(lang, "course_detail.attendance_title")}</h2>

    <a class="course-attendance-link" href="./student-course-attendance.html?id=${course.id}">
        ${getTranslation(lang, "course_detail.view_all_attendance")}
    </a>
</div>

${renderAttendance(attendance)}
                </aside>
            </section>
        `;

        bindTaskButtons();
        bindAttendanceButtons();
    }

    function bindTaskButtons() {
        document.querySelectorAll(".course-task-open-btn").forEach(button => {
            button.addEventListener("click", () => {
                const taskId = button.dataset.taskId;
                window.location.href = `./student-task-detail.html?id=${taskId}`;
            });
        });
    }

    function bindAttendanceButtons() {
        document.querySelectorAll(".attendance-mark-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const lang = getCurrentLang();
                const scheduleId = button.dataset.scheduleId;
                const token = getToken();

                if (!scheduleId || !token) {
                    return;
                }

                button.disabled = true;
                button.textContent = getTranslation(lang, "course_detail.marking");

                try {
                    await fetchJson(`${API_BASE_URL}/student/attendance/mark`, token, {
                        method: "POST",
                        body: JSON.stringify({
                            scheduleId: Number(scheduleId)
                        })
                    });

                    if (typeof showToast === "function") {
                        showToast(getTranslation(lang, "course_detail.attendance_marked"), "success");
                    }

                    loadCourse();
                } catch (error) {
                    console.error("[Course Detail] Не вдалося позначити відвідування:", error);

                    button.disabled = false;
                    button.textContent = getTranslation(lang, "course_detail.mark_attendance");

                    if (typeof showToast === "function") {
                        const errorKey = `errors.${error.message}`;
                        const translatedError = getTranslation(lang, errorKey);

                        showToast(
                            translatedError !== errorKey
                                ? translatedError
                                : getTranslation(lang, "errors.ATTENDANCE_ERROR"),
                            "error"
                        );
                    }
                }
            });
        });
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadCourse();
});