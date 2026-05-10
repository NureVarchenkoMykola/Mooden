document.addEventListener("DOMContentLoaded", () => {
    const scheduleDays = document.getElementById("scheduleDays");
    const todayLessons = document.getElementById("todayLessons");
    const todayCount = document.getElementById("todayCount");
    const weekLabel = document.getElementById("weekLabel");
    const prevWeekBtn = document.getElementById("prevWeekBtn");
    const nextWeekBtn = document.getElementById("nextWeekBtn");

    if (!scheduleDays) {
        console.error("Не знайдено елемент #scheduleDays");
        return;
    }

    let lessons = [];
    let weekOffset = 0;

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
    }

    function translate(key, fallback = "") {
        const lang = getCurrentLang();
        const parts = key.split(".");

        let value = translations?.[lang];

        for (const part of parts) {
            if (!value || value[part] === undefined) {
                value = null;
                break;
            }

            value = value[part];
        }

        if (value) {
            return value;
        }

        let fallbackValue = translations?.uk;

        for (const part of parts) {
            if (!fallbackValue || fallbackValue[part] === undefined) {
                fallbackValue = null;
                break;
            }

            fallbackValue = fallbackValue[part];
        }

        return fallbackValue || fallback || key;
    }

    function applyPageTranslations() {
        document.querySelectorAll("[data-i18n]").forEach(element => {
            const key = element.getAttribute("data-i18n");
            const translatedText = translate(key);

            if (translatedText) {
                element.textContent = translatedText;
            }
        });
    }

    function getLocalizedField(item, fieldName) {
        const lang = getCurrentLang();

        return (
            item[`${fieldName}_${lang}`] ||
            item[`${fieldName}_uk`] ||
            item[`${fieldName}_en`] ||
            item[fieldName] ||
            ""
        );
    }

    function getWeekStart(offset = 0) {
        const today = new Date();
        const currentDay = today.getDay();

        const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday + offset * 7);
        monday.setHours(0, 0, 0, 0);

        return monday;
    }

    function getWeekEnd(offset = 0) {
        const monday = getWeekStart(offset);
        const friday = new Date(monday);

        friday.setDate(monday.getDate() + 4);
        friday.setHours(23, 59, 59, 999);

        return friday;
    }

    function formatDate(dateValue) {
        const date = new Date(dateValue);
        const lang = getCurrentLang();

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
            day: "2-digit",
            month: "short"
        });
    }

    function formatDateForApi(date) {
        return date.toISOString().split("T")[0];
    }

    function formatTime(timeValue) {
        if (!timeValue) {
            return "—";
        }

        return String(timeValue).slice(0, 5);
    }

    function getDayIndex(dateValue) {
        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        const day = date.getDay();

        if (day === 0 || day === 6) {
            return null;
        }

        return day;
    }

    function getDayNames() {
        return [
            translate("schedule.monday", "Понеділок"),
            translate("schedule.tuesday", "Вівторок"),
            translate("schedule.wednesday", "Середа"),
            translate("schedule.thursday", "Четвер"),
            translate("schedule.friday", "П’ятниця")
        ];
    }

    function getFormatClass(typeText) {
        const type = String(typeText || "").toLowerCase();

        if (
            type.includes("online") ||
            type.includes("онлайн")
        ) {
            return "online";
        }

        if (
            type.includes("mixed") ||
            type.includes("зміш")
        ) {
            return "mixed";
        }

        return "offline";
    }

    function normalizeLesson(item, index) {
        const title =
            item.course_title ||
            item.title ||
            item.course_name ||
            getLocalizedField(item, "title") ||
            translate("schedule.unknown_lesson", "Заняття без назви");

        const type =
            item.type ||
            getLocalizedField(item, "type") ||
            translate("schedule.format_offline", "Аудиторно");

        const teacher =
            item.teacher_name ||
            item.teacher ||
            item.full_name ||
            translate("schedule.teacher_not_specified", "Викладача не вказано");

        const lessonDate =
            item.lesson_date ||
            item.date ||
            item.lessonDate ||
            null;

        return {
            id: item.id || index + 1,
            courseId: item.course_id || null,
            title,
            teacher,
            room: item.room || item.auditorium || item.classroom || "—",
            type,
            formatClass: getFormatClass(type),
            lessonDate,
            timeStart: item.time_start || item.start_time || item.timeStart,
            timeEnd: item.time_end || item.end_time || item.timeEnd,
            colorAccent: item.color_accent || item.color || null
        };
    }

    function renderWeekLabel() {
        const monday = getWeekStart(weekOffset);
        const friday = getWeekEnd(weekOffset);

        if (weekOffset === 0) {
            weekLabel.textContent = translate("schedule.current_week", "Поточний тиждень");
            return;
        }

        weekLabel.textContent = `${formatDate(monday)} — ${formatDate(friday)}`;
    }

    function getLessonsForCurrentWeek() {
        const monday = getWeekStart(weekOffset);
        const friday = getWeekEnd(weekOffset);

        return lessons.filter(lesson => {
            if (!lesson.lessonDate) {
                return false;
            }

            const lessonDate = new Date(lesson.lessonDate);

            if (Number.isNaN(lessonDate.getTime())) {
                return false;
            }

            return lessonDate >= monday && lessonDate <= friday;
        });
    }

    function createLessonCard(lesson) {
        const accentStyle = lesson.colorAccent
            ? `style="--lesson-accent: ${lesson.colorAccent};"`
            : "";

        return `
            <article class="lesson-card" ${accentStyle}>
                <div class="lesson-time">
                    ${formatTime(lesson.timeStart)}–${formatTime(lesson.timeEnd)}
                </div>

                <h3 class="lesson-title">${lesson.title}</h3>

                <div class="lesson-meta">
                    <span>${translate("schedule.teacher", "Викладач")}: ${lesson.teacher}</span>
                    <span>${translate("schedule.room", "Аудиторія")}: ${lesson.room}</span>
                </div>

                <span class="lesson-format ${lesson.formatClass}">
                    ${lesson.type}
                </span>
            </article>
        `;
    }

    function renderSchedule() {
        const monday = getWeekStart(weekOffset);
        const dayNames = getDayNames();
        const weekLessons = getLessonsForCurrentWeek();

        scheduleDays.innerHTML = "";

        for (let i = 0; i < 5; i++) {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + i);

            const dayIndex = i + 1;

            const dayLessons = weekLessons
                .filter(lesson => getDayIndex(lesson.lessonDate) === dayIndex)
                .sort((a, b) => String(a.timeStart).localeCompare(String(b.timeStart)));

            const dayCard = document.createElement("article");
            dayCard.className = "day-card";

            dayCard.innerHTML = `
                <div class="day-header">
                    <h2 class="day-name">${dayNames[i]}</h2>
                    <div class="day-date">${formatDate(currentDate)}</div>
                </div>

                <div class="lessons-list">
                    ${
                        dayLessons.length
                            ? dayLessons.map(createLessonCard).join("")
                            : `<div class="empty-day">${translate("schedule.empty_day", "Занять немає")}</div>`
                    }
                </div>
            `;

            scheduleDays.appendChild(dayCard);
        }
    }

    function renderTodayPanel() {
        const today = new Date();
        const todayDate = today.toISOString().split("T")[0];

        const todayItems = lessons
            .filter(lesson => {
                if (!lesson.lessonDate) {
                    return false;
                }

                return String(lesson.lessonDate).startsWith(todayDate);
            })
            .sort((a, b) => String(a.timeStart).localeCompare(String(b.timeStart)));

        todayCount.textContent = todayItems.length;
        todayLessons.innerHTML = "";

        if (todayItems.length === 0) {
            todayLessons.innerHTML = `
                <p class="today-empty">
                    ${translate("schedule.empty_today", "На сьогодні занять немає.")}
                </p>
            `;
            return;
        }

        todayLessons.innerHTML = todayItems.map(createLessonCard).join("");
    }

    function renderUnavailable(message) {
        scheduleDays.innerHTML = `
            <div class="schedule-empty-state">
                <h3>${translate("schedule.unavailable_title", "Розклад поки недоступний")}</h3>
                <p>${message}</p>
            </div>
        `;

        todayCount.textContent = "0";
        todayLessons.innerHTML = `
            <p class="today-empty">
                ${translate("schedule.empty_today", "На сьогодні занять немає.")}
            </p>
        `;
    }

    async function loadSchedule() {
        const token = getToken();

        if (!token) {
            renderUnavailable(translate("errors.UNAUTHORIZED", "Ви не авторизовані."));
            return;
        }

        try {
            scheduleDays.innerHTML = `
                <div class="schedule-empty-state">
                    <h3>${translate("profile.loading", "Завантаження...")}</h3>
                    <p>${translate("dashboard.status_loading", "Отримуємо актуальну інформацію...")}</p>
                </div>
            `;

            const monday = getWeekStart(weekOffset);
            const friday = getWeekEnd(weekOffset);

            const url = `${API_BASE_URL}/student/schedule?from=${formatDateForApi(monday)}&to=${formatDateForApi(friday)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Schedule API error: ${response.status}`);
            }

            const data = await response.json();

            console.log("SCHEDULE DATA:", data);

            const backendSchedule = Array.isArray(data)
                ? data
                : Array.isArray(data.schedule)
                    ? data.schedule
                    : Array.isArray(data.lessons)
                        ? data.lessons
                        : [];

            lessons = backendSchedule.map(normalizeLesson);

            renderWeekLabel();
            renderSchedule();
            renderTodayPanel();
        } catch (error) {
            console.error("[Schedule Page] Не вдалося завантажити розклад:", error);

            renderWeekLabel();

            renderUnavailable(
                translate(
                    "schedule.unavailable_text",
                    "Backend endpoint для розкладу ще не реалізовано або тимчасово недоступний."
                )
            );
        }
    }

    function updatePageAfterLanguageChange() {
        applyPageTranslations();
        loadSchedule();
    }

    if (prevWeekBtn) {
        prevWeekBtn.addEventListener("click", () => {
            weekOffset--;
            loadSchedule();
        });
    }

    if (nextWeekBtn) {
        nextWeekBtn.addEventListener("click", () => {
            weekOffset++;
            loadSchedule();
        });
    }

    document.querySelectorAll('input[name="lang"]').forEach(radio => {
        radio.addEventListener("change", () => {
            setTimeout(updatePageAfterLanguageChange, 200);
        });
    });

    applyPageTranslations();
    renderWeekLabel();
    loadSchedule();
});