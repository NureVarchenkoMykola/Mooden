let weekOffset = 0;
let allLessons = [];
let todayLessonsData = [];

document.addEventListener("DOMContentLoaded", async () => {
    const token = getToken();

    if (!token) {
        return;
    }

    await loadTodayLessons();
    await loadSchedule();
    initControls();
});

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

async function loadSchedule() {
    const container = document.getElementById("scheduleDays");
    const token = getToken();
    const lang = getCurrentLang();

    const monday = getMonday(weekOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    updateWeekLabel(monday, sunday, lang);

    try {
        const fromDate = toLocalDateString(monday);
        const toDate = toLocalDateString(sunday);

        const response = await fetch(`${API_BASE_URL}/teacher/schedule?from=${fromDate}&to=${toDate}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            if (typeof showToast === "function") {
                showToast(getTranslation(lang, `errors.${errorData.message}`), "error");
            }

            console.error(`[Teacher Schedule] Schedule load failed. Status: ${response.status}, Code: ${errorData.message}`);

            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = "../index.html";
            }

            container.innerHTML = `
                <div class="schedule-empty-state">
                    <h3>${getTranslation(lang, "teacher_schedule.unavailable_title")}</h3>
                    <p>${getTranslation(lang, "teacher_schedule.unavailable_text")}</p>
                </div>
            `;

            return;
        }

        const data = await response.json();

        allLessons = Array.isArray(data.schedule) ? data.schedule : [];

        renderScheduleGrid(monday, lang);
    } catch (err) {
        if (typeof showToast === "function") {
            showToast(getTranslation(lang, "errors.UNKNOWN_ERROR"), "error");
        }

        console.error("[Teacher Schedule] Critical failure during schedule initialization:", err);

        container.innerHTML = `
            <div class="schedule-empty-state">
                <h3>${getTranslation(lang, "teacher_schedule.unavailable_title")}</h3>
                <p>${getTranslation(lang, "teacher_schedule.unavailable_text")}</p>
            </div>
        `;
    }
}

function renderScheduleGrid(monday, lang) {
    const container = document.getElementById("scheduleDays");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const dayKeys = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
    ];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);

        const dateStr = toLocalDateString(currentDate);

        const dayLessons = allLessons
            .filter(lesson => getLessonDateString(lesson.lesson_date) === dateStr)
            .sort((a, b) => String(a.time_start || "").localeCompare(String(b.time_start || "")));

        const dayHtml = `
            <article class="day-card">
                <div class="day-header">
                    <h2 class="day-name">${getTranslation(lang, "schedule." + dayKeys[i])}</h2>
                    <div class="day-date">
                        ${currentDate.toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
                            day: "numeric",
                            month: "short"
                        })}
                    </div>
                </div>

                <div class="lessons-list">
                    ${
                        dayLessons.length
                            ? dayLessons.map(lesson => renderLessonCard(lesson, lang)).join("")
                            : `<div class="empty-day">${getTranslation(lang, "schedule.empty_day")}</div>`
                    }
                </div>
            </article>
        `;

        container.insertAdjacentHTML("beforeend", dayHtml);
    }
}

function renderLessonCard(lesson, lang) {
    const accent = lesson.color_accent || "var(--accent-gold)";
    const isOpen = lesson.is_open_for_attendance === true;

    return `
        <div class="lesson-card" style="--lesson-accent: ${accent}">
            <div class="lesson-time">
                ${formatTime(lesson.time_start)} – ${formatTime(lesson.time_end)}
            </div>

            <h3 class="lesson-title">
                ${lesson.course_name || "—"}
            </h3>

            <div class="lesson-meta">
                <span>👥 ${lesson.group_name || getTranslation(lang, "teacher_schedule.no_group")}</span>
                <span>📍 ${getTranslation(lang, "schedule.room")} ${lesson.room || "—"}</span>
            </div>

            <div class="lesson-badges">
                <span class="lesson-badge type-${lesson.lesson_type}">
                    ${getLessonTypeText(lesson.lesson_type, lang)}
                </span>

                <span class="lesson-badge format-${lesson.lesson_format}">
                    ${getLessonFormatText(lesson.lesson_format, lang)}
                </span>

                <span class="lesson-badge attendance-${isOpen ? "open" : "closed"}">
                    ${
                        isOpen
                            ? getTranslation(lang, "teacher_schedule.attendance_open")
                            : getTranslation(lang, "teacher_schedule.attendance_closed")
                    }
                </span>
            </div>
        </div>
    `;
}

async function loadTodayLessons() {
    const token = getToken();
    const lang = getCurrentLang();
    const todayStr = toLocalDateString(new Date());

    try {
        const response = await fetch(`${API_BASE_URL}/teacher/schedule?from=${todayStr}&to=${todayStr}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            if (typeof showToast === "function") {
                showToast(getTranslation(lang, `errors.${errorData.message}`), "error");
            }

            console.error(`[Teacher Schedule] Today lessons fetch failed. Status: ${response.status}, Code: ${errorData.message}`);

            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = "../index.html";
            }

            return;
        }

        const data = await response.json();

        todayLessonsData = Array.isArray(data.schedule) ? data.schedule : [];

        renderTodayPanel(lang);
    } catch (err) {
        if (typeof showToast === "function") {
            showToast(getTranslation(lang, "errors.UNKNOWN_ERROR"), "error");
        }

        console.error("[Teacher Schedule] Critical failure during today lessons load:", err);
    }
}

function renderTodayPanel(lang) {
    const todayStr = toLocalDateString(new Date());

    const todayItems = todayLessonsData
        .filter(lesson => getLessonDateString(lesson.lesson_date) === todayStr)
        .sort((a, b) => String(a.time_start || "").localeCompare(String(b.time_start || "")));

    const todayCount = document.getElementById("todayCount");
    const list = document.getElementById("todayLessons");

    if (todayCount) {
        todayCount.textContent = todayItems.length;
    }

    if (!list) {
        return;
    }

    if (!todayItems.length) {
        list.innerHTML = `<p class="today-empty">${getTranslation(lang, "schedule.empty_today")}</p>`;
        return;
    }

    list.innerHTML = todayItems.map(lesson => {
        const isOpen = lesson.is_open_for_attendance === true;

        return `
            <div class="lesson-today-card" style="--accent: ${lesson.color_accent || "var(--accent-gold)"}">
                <div class="l-time">
                    <b>${formatTime(lesson.time_start)}</b>
                </div>

                <div class="l-info">
                    <p class="l-name">${lesson.course_name || "—"}</p>

                    <p class="l-meta">
                        <span class="type-tag">${getLessonTypeText(lesson.lesson_type, lang)}</span>
                        •
                        <span class="text-gold">${lesson.group_name || getTranslation(lang, "teacher_schedule.no_group")}</span>
                    </p>

                    <p class="l-meta">
                        <span class="${isOpen ? "text-green" : "text-muted"}">
                            ${
                                isOpen
                                    ? getTranslation(lang, "teacher_schedule.attendance_open")
                                    : getTranslation(lang, "teacher_schedule.attendance_closed")
                            }
                        </span>
                    </p>
                </div>
            </div>
        `;
    }).join("");
}

function getMonday(offset) {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7;

    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    return monday;
}

function updateWeekLabel(mon, sun, lang) {
    const label = weekOffset === 0
        ? getTranslation(lang, "schedule.current_week")
        : `${mon.toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
            day: "numeric",
            month: "short"
        })} — ${sun.toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
            day: "numeric",
            month: "short"
        })}`;

    const weekLabel = document.getElementById("weekLabel");

    if (weekLabel) {
        weekLabel.textContent = label;
    }
}

function initControls() {
    const prevWeekBtn = document.getElementById("prevWeekBtn");
    const nextWeekBtn = document.getElementById("nextWeekBtn");

    if (prevWeekBtn) {
        prevWeekBtn.onclick = () => {
            weekOffset--;
            loadSchedule();
        };
    }

    if (nextWeekBtn) {
        nextWeekBtn.onclick = () => {
            weekOffset++;
            loadSchedule();
        };
    }
}

function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getLessonDateString(dateValue) {
    if (!dateValue) {
        return "";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue).split("T")[0];
    }

    return toLocalDateString(date);
}

function formatTime(timeValue) {
    if (!timeValue) {
        return "—";
    }

    return String(timeValue).slice(0, 5);
}

function getLessonTypeText(type, lang) {
    if (!type) {
        return "—";
    }

    const scheduleKey = `schedule.type_${type}`;
    const scheduleText = getTranslation(lang, scheduleKey);

    if (scheduleText !== scheduleKey) {
        return scheduleText;
    }

    const courseDetailKey = `course_detail.lesson_${type}`;
    const courseDetailText = getTranslation(lang, courseDetailKey);

    return courseDetailText !== courseDetailKey ? courseDetailText : type;
}

function getLessonFormatText(format, lang) {
    if (!format) {
        return "—";
    }

    const key = `schedule.format_${format}`;
    const result = getTranslation(lang, key);

    return result !== key ? result : format;
}