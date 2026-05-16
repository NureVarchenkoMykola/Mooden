document.addEventListener("DOMContentLoaded", () => {
    const attendanceContent = document.getElementById("attendanceContent");
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("id");

    if (!attendanceContent) {
        console.error("Не знайдено елемент #attendanceContent");
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
            return "—";
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

    function isLessonOpenNow(item) {
    if (!item.lesson_date) {
        return false;
    }

    const lessonDate = String(item.lesson_date).split("T")[0];

    const startTime = item.time_start || item.start_time || "00:00:00";
    const endTime = item.time_end || item.end_time || "23:59:59";

    const lessonStart = new Date(`${lessonDate}T${startTime}`);
    const lessonEnd = new Date(`${lessonDate}T${endTime}`);
    const now = new Date();

    if (Number.isNaN(lessonStart.getTime()) || Number.isNaN(lessonEnd.getTime())) {
        return false;
    }

    return now >= lessonStart && now <= lessonEnd;
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

    function showEmpty(title, text = "") {
        attendanceContent.innerHTML = `
            <div class="attendance-empty">
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
                getTranslation(lang, "attendance_page.not_found_title"),
                getTranslation(lang, "attendance_page.not_found_text")
            );
            return;
        }

        if (!token) {
            showEmpty(getTranslation(lang, "errors.UNAUTHORIZED"), "");
            return;
        }

        try {
            attendanceContent.innerHTML = `
                <div class="attendance-loading">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const attendanceUrl = `${API_BASE_URL}/student/courses/${courseId}/attendance`;
            const data = await fetchJson(attendanceUrl, token);

            const attendance = Array.isArray(data.attendance)
                ? data.attendance
                : Array.isArray(data)
                    ? data
                    : [];

            renderAttendancePage(attendance);
        } catch (error) {
            console.error("[Attendance Page] Не вдалося завантажити відвідуваність:", error);

            showEmpty(
                getTranslation(lang, "attendance_page.unavailable_title"),
                getTranslation(lang, "attendance_page.unavailable_text")
            );
        }
    }

    function getAttendanceStats(attendance) {
        const total = attendance.length;
        const present = attendance.filter(item => item.is_present).length;
        const absent = total - present;
        const percent = total ? Math.round((present / total) * 100) : 0;

        return {
            total,
            present,
            absent,
            percent
        };
    }

    function renderAttendancePage(attendance) {
        const lang = getCurrentLang();
        const stats = getAttendanceStats(attendance);

        attendanceContent.innerHTML = `
            <header class="attendance-hero">
                <div class="attendance-hero-icon">📋</div>

                <div>
                    <h1>${getTranslation(lang, "attendance_page.page_title")}</h1>
                    <p>${getTranslation(lang, "attendance_page.page_desc")}</p>
                </div>
            </header>

            <section class="attendance-stats">
                <div class="attendance-stat-card">
                    <span class="attendance-stat-icon">📚</span>
                    <div>
                        <p class="attendance-stat-value">${stats.total}</p>
                        <p class="attendance-stat-label">${getTranslation(lang, "attendance_page.stat_total")}</p>
                    </div>
                </div>

                <div class="attendance-stat-card">
                    <span class="attendance-stat-icon">✅</span>
                    <div>
                        <p class="attendance-stat-value">${stats.present}</p>
                        <p class="attendance-stat-label">${getTranslation(lang, "attendance_page.stat_present")}</p>
                    </div>
                </div>

                <div class="attendance-stat-card">
                    <span class="attendance-stat-icon">⚪</span>
                    <div>
                        <p class="attendance-stat-value">${stats.absent}</p>
                        <p class="attendance-stat-label">${getTranslation(lang, "attendance_page.stat_absent")}</p>
                    </div>
                </div>

                <div class="attendance-stat-card">
                    <span class="attendance-stat-icon">📈</span>
                    <div>
                        <p class="attendance-stat-value">${stats.percent}%</p>
                        <p class="attendance-stat-label">${getTranslation(lang, "attendance_page.stat_percent")}</p>
                    </div>
                </div>
            </section>

            <section class="attendance-table-card">
                <div class="attendance-table-header">
                    <h2>${getTranslation(lang, "attendance_page.list_title")}</h2>
                </div>

                ${
                    attendance.length
                        ? renderAttendanceList(attendance)
                        : `
                            <p class="attendance-section-empty">
                                ${getTranslation(lang, "attendance_page.empty_text")}
                            </p>
                        `
                }
            </section>
        `;

        bindAttendanceButtons();
    }

    function renderAttendanceList(attendance) {
        const sortedAttendance = [...attendance].sort((a, b) => {
            const dateA = new Date(`${String(a.lesson_date).split("T")[0]}T${a.time_start || "00:00:00"}`);
            const dateB = new Date(`${String(b.lesson_date).split("T")[0]}T${b.time_start || "00:00:00"}`);

            return dateB - dateA;
        });

        return `
            <div class="attendance-list">
                ${sortedAttendance.map(item => renderAttendanceItem(item)).join("")}
            </div>
        `;
    }

    function renderAttendanceItem(item) {
        const lang = getCurrentLang();

        const scheduleId = item.schedule_id || item.id;
        const canMark =
            (item.can_mark === true || item.is_open_for_attendance === true) &&
            !item.is_present &&
            isLessonOpenNow(item)

        return `
            <article class="attendance-item">
                <div class="attendance-item-date">
                    <strong>${formatDate(item.lesson_date)}</strong>
                    <span>${formatTime(item.time_start)}–${formatTime(item.time_end)}</span>
                </div>

                <div class="attendance-item-info">
                    <h3>${getLessonTypeText(item.type || item.lesson_type)}</h3>
                    <p>
                        ${item.room || getTranslation(lang, "attendance_page.no_room")}
                    </p>
                </div>

                <div class="attendance-item-status-wrap">
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
            </article>
        `;
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

                    loadAttendance();
                } catch (error) {
                    console.error("[Attendance Page] Не вдалося позначити відвідування:", error);

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

    loadAttendance();
});