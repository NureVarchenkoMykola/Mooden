document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");

    const list = document.getElementById("attendanceLessonsList");
    const searchInput = document.getElementById("attendanceSearch");
    const filterSelect = document.getElementById("attendanceFilter");
    const backBtn = document.getElementById("backToCourseBtn");
    const courseTitleEl = document.getElementById("attendanceCourseTitle");

    const lessonsCountEl = document.getElementById("lessonsCount");
    const presentRecordsEl = document.getElementById("presentRecords");
    const absentRecordsEl = document.getElementById("absentRecords");
    const attendancePercentEl = document.getElementById("attendancePercent");

    let lessons = [];
    let records = [];
    let courseTitle = "";
    let expandedLessonId = null;

    if (!list) {
        console.error("Не знайдено #attendanceLessonsList");
        return;
    }

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        const savedLang = localStorage.getItem("mooden-lang");

        if (savedLang === "uk" || savedLang === "en") {
            return savedLang;
        }

        const htmlLang = document.documentElement.lang;

        if (htmlLang === "uk" || htmlLang === "en") {
            return htmlLang;
        }

        return "uk";
    }

    function safeTranslate(key, fallback) {
        const lang = getCurrentLang();

        if (typeof getTranslation !== "function") {
            return fallback;
        }

        const translated = getTranslation(lang, key);
        return translated === key ? fallback : translated;
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const lang = getCurrentLang();
        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return String(dateValue).split("T")[0];
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

    function formatDateTime(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const lang = getCurrentLang();
        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return String(dateValue);
        }

        return date.toLocaleString(lang === "en" ? "en-US" : "uk-UA", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function getLessonTypeText(type) {
        if (!type) {
            return "—";
        }

        const key = `schedule.type_${type}`;
        return safeTranslate(key, type);
    }

    function getLessonFormatText(format) {
        if (!format) {
            return "—";
        }

        const key = `schedule.format_${format}`;
        return safeTranslate(key, format);
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
            <div class="teacher-attendance-empty">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    async function loadAttendance() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!courseId) {
            showEmpty(
                safeTranslate("teacher_attendance.no_course_title", "Курс не знайдено"),
                safeTranslate("teacher_attendance.no_course_text", "Поверніться на сторінку курсу і відкрийте відвідуваність ще раз.")
            );
            return;
        }

        if (!token) {
            showEmpty(safeTranslate("errors.UNAUTHORIZED", "Немає авторизації"), "");
            return;
        }

        try {
            list.innerHTML = `
                <div class="teacher-attendance-loading">
                    <h2>${safeTranslate("profile.loading", "Завантаження...")}</h2>
                    <p>${safeTranslate("dashboard.status_loading", "Отримуємо актуальну інформацію...")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/teacher/attendance?courseId=${courseId}`, token);

            lessons = Array.isArray(data.lessons) ? data.lessons : [];
            records = Array.isArray(data.records) ? data.records : [];

            courseTitle = lessons[0]?.course_title || records[0]?.course_title || safeTranslate("teacher_attendance.page_title", "Відвідуваність курсу");

            if (courseTitleEl) {
                courseTitleEl.textContent = courseTitle;
            }

            updateStats(data.stats || {});
            renderLessons();
        } catch (error) {
            console.error("[Teacher Attendance] Помилка:", error);

            showEmpty(
                safeTranslate("teacher_attendance.unavailable_title", "Відвідуваність недоступна"),
                safeTranslate("teacher_attendance.unavailable_text", "Не вдалося завантажити відвідуваність з backend.")
            );
        }
    }

    function updateStats(stats) {
        const totalLessons = lessons.length;
        const presentRecords = Number(stats.presentRecords || 0);
        const absentRecords = Number(stats.absentRecords || 0);
        const attendancePercent = Number(stats.attendancePercent || 0);

        lessonsCountEl.textContent = totalLessons;
        presentRecordsEl.textContent = presentRecords;
        absentRecordsEl.textContent = absentRecords;
        attendancePercentEl.textContent = `${attendancePercent}%`;
    }

    function getFilteredLessons() {
        const query = String(searchInput?.value || "").trim().toLowerCase();
        const filter = filterSelect?.value || "all";

        let result = [...lessons];

        if (filter === "open") {
            result = result.filter(lesson => lesson.is_open_for_attendance === true);
        }

        if (filter === "closed") {
            result = result.filter(lesson => lesson.is_open_for_attendance !== true);
        }

        if (filter === "completed") {
            result = result.filter(lesson => lesson.is_completed === true);
        }

        if (query) {
            result = result.filter(lesson => {
                const date = formatDate(lesson.lesson_date).toLowerCase();
                const group = String(lesson.group_name || "").toLowerCase();
                const room = String(lesson.room || "").toLowerCase();
                const type = getLessonTypeText(lesson.lesson_type).toLowerCase();
                const format = getLessonFormatText(lesson.lesson_format).toLowerCase();

                return (
                    date.includes(query) ||
                    group.includes(query) ||
                    room.includes(query) ||
                    type.includes(query) ||
                    format.includes(query)
                );
            });
        }

        return result;
    }

    function renderLessons() {
        const filteredLessons = getFilteredLessons();

        if (!filteredLessons.length) {
            showEmpty(
                safeTranslate("teacher_attendance.empty_title", "Занять не знайдено"),
                safeTranslate("teacher_attendance.empty_text", "Спробуйте змінити фільтр або пошуковий запит.")
            );
            return;
        }

        list.innerHTML = filteredLessons.map(renderLessonCard).join("");
        bindAttendanceButtons();
    }

    function renderLessonAttendanceDetails(scheduleId) {
        const lessonRecords = records.filter(record => {
            return String(record.schedule_id) === String(scheduleId);
        });

        const presentStudents = lessonRecords.filter(record => record.is_present === true);

        if (!presentStudents.length) {
            return `
                <div class="teacher-attendance-details">
                    <p class="teacher-attendance-details-empty">
                        ${safeTranslate("teacher_attendance.no_present_students", "Поки що ніхто не відмітився.")}
                    </p>
                </div>
            `;
        }

        return `
            <div class="teacher-attendance-details">
                <h3>${safeTranslate("teacher_attendance.present_students_title", "Студенти, які відмітились")}</h3>

                <div class="teacher-attendance-students-list">
                    ${presentStudents.map(student => `
                        <div class="teacher-attendance-student-row">
                            <div>
                                <strong>${student.student_name || safeTranslate("teacher_course_detail.unknown_student", "Невідомий студент")}</strong>
                                <span>${student.student_email || "—"}</span>
                            </div>

                            <p>
                                ${safeTranslate("teacher_attendance.marked_at", "Відмічено")}:
                                <strong>${formatDateTime(student.marked_at)}</strong>
                            </p>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    function renderLessonCard(lesson) {
        const isOpen = lesson.is_open_for_attendance === true;
        const accent = lesson.color_accent || "#E8A44A";
        const percent = Number(lesson.attendance_percent || 0);
        const present = Number(lesson.present_count || 0);
        const absent = Number(lesson.absent_count || 0);
        const total = Number(lesson.total_students || 0);
        const isExpanded = String(expandedLessonId) === String(lesson.schedule_id);

        return `
            <article class="teacher-attendance-card ${isOpen ? "is-open" : "is-closed"}" style="--attendance-accent: ${accent}">
                <div class="teacher-attendance-card-main">
                    <div class="teacher-attendance-date-box">
                        <strong>${formatDate(lesson.lesson_date)}</strong>
                        <span>${formatTime(lesson.time_start)} – ${formatTime(lesson.time_end)}</span>
                    </div>

                    <div class="teacher-attendance-info">
                        <div class="teacher-attendance-topline">
                            <span class="teacher-attendance-course">${lesson.course_title || courseTitle || "—"}</span>
                            <span class="teacher-attendance-status ${isOpen ? "open" : "closed"}">
                                ${
                                    isOpen
                                        ? safeTranslate("teacher_attendance.status_open", "Відмітка відкрита")
                                        : safeTranslate("teacher_attendance.status_closed", "Відмітка закрита")
                                }
                            </span>
                        </div>

                        <h2>${lesson.group_name || safeTranslate("teacher_attendance.no_group", "Групу не вказано")}</h2>

                        <div class="teacher-attendance-meta">
                            <span>📍 ${lesson.room || safeTranslate("teacher_attendance.no_room", "Аудиторію не вказано")}</span>
                            <span>📌 ${getLessonTypeText(lesson.lesson_type)}</span>
                            <span>🌐 ${getLessonFormatText(lesson.lesson_format)}</span>
                            <span>👥 ${total} ${safeTranslate("teacher_attendance.students_short", "студ.")}</span>
                        </div>
                    </div>
                </div>

                <div class="teacher-attendance-progress-block">
                    <div class="teacher-attendance-percent">
                        <strong>${percent}%</strong>
                        <span>${safeTranslate("teacher_attendance.attendance_percent", "Відвідуваність")}</span>
                    </div>

                    <div class="teacher-attendance-progress-track">
                        <div class="teacher-attendance-progress-fill" style="width: ${percent}%"></div>
                    </div>

                    <div class="teacher-attendance-counts">
                        <span class="present">✅ ${present}</span>
                        <span class="absent">❌ ${absent}</span>
                    </div>
                </div>

                <div class="teacher-attendance-actions">
                    <button
                        class="teacher-attendance-info-btn"
                        type="button"
                        data-schedule-id="${lesson.schedule_id}"
                    >
                        ${
                            isExpanded
                                ? safeTranslate("teacher_attendance.hide_details_btn", "Сховати")
                                : safeTranslate("teacher_attendance.show_details_btn", "Детальніше")
                        }
                    </button>

                    <button
                        class="teacher-attendance-toggle-btn ${isOpen ? "close" : "open"}"
                        type="button"
                        data-schedule-id="${lesson.schedule_id}"
                        data-open="${isOpen}"
                    >
                        ${
                            isOpen
                                ? safeTranslate("teacher_attendance.close_btn", "Закрити відмітку")
                                : safeTranslate("teacher_attendance.open_btn", "Відкрити відмітку")
                        }
                    </button>
                </div>

                ${isExpanded ? renderLessonAttendanceDetails(lesson.schedule_id) : ""}
            </article>
        `;
    }

    function bindAttendanceButtons() {
        document.querySelectorAll(".teacher-attendance-toggle-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const scheduleId = button.dataset.scheduleId;
                const isCurrentlyOpen = button.dataset.open === "true";
                const newStatus = !isCurrentlyOpen;

                await updateAttendanceStatus(scheduleId, newStatus, button);
            });
        });

        document.querySelectorAll(".teacher-attendance-info-btn").forEach(button => {
            button.addEventListener("click", () => {
                const scheduleId = button.dataset.scheduleId;

                expandedLessonId = String(expandedLessonId) === String(scheduleId)
                    ? null
                    : scheduleId;

                renderLessons();
            });
        });
    }

    async function updateAttendanceStatus(scheduleId, isOpen, button) {
        const token = getToken();

        if (!token || !scheduleId) {
            return;
        }

        button.disabled = true;
        button.textContent = safeTranslate("teacher_attendance.saving", "Збереження...");

        try {
            await fetchJson(`${API_BASE_URL}/teacher/schedule/${scheduleId}/attendance-status`, token, {
                method: "PATCH",
                body: JSON.stringify({ isOpen })
            });

            if (typeof showToast === "function") {
                showToast(
                    isOpen
                        ? safeTranslate("teacher_attendance.open_success", "Відмітку відкрито")
                        : safeTranslate("teacher_attendance.close_success", "Відмітку закрито"),
                    "success"
                );
            }

            await loadAttendance();
        } catch (error) {
            console.error("[Teacher Attendance] Не вдалося змінити статус:", error);

            button.disabled = false;
            button.textContent = isOpen
                ? safeTranslate("teacher_attendance.open_btn", "Відкрити відмітку")
                : safeTranslate("teacher_attendance.close_btn", "Закрити відмітку");

            if (typeof showToast === "function") {
                showToast(safeTranslate("teacher_attendance.update_error", "Не вдалося оновити статус відмітки"), "error");
            }
        }
    }

    function bindBackButton() {
        if (!backBtn) {
            return;
        }

        backBtn.addEventListener("click", () => {
            if (courseId) {
                window.location.href = `./teacher-course-detail.html?id=${courseId}`;
                return;
            }

            window.location.href = "./teacher-courses.html";
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderLessons);
    }

    if (filterSelect) {
        filterSelect.addEventListener("change", renderLessons);
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    bindBackButton();
    loadAttendance();
});
