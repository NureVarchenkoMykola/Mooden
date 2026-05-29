document.addEventListener("DOMContentLoaded", () => {
    const totalUsersEl = document.getElementById("totalUsers");
    const totalCoursesEl = document.getElementById("totalCourses");
    const totalTasksEl = document.getElementById("totalTasks");
    const totalSubmissionsEl = document.getElementById("totalSubmissions");

    const totalStudentsEl = document.getElementById("totalStudents");
    const totalTeachersEl = document.getElementById("totalTeachers");
    const totalAnnouncementsEl = document.getElementById("totalAnnouncements");
    const openAttendanceEl = document.getElementById("openAttendance");

    const activityList = document.getElementById("moderatorActivityList");
    const announcementsList = document.getElementById("moderatorAnnouncementsList");

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        const savedLang = localStorage.getItem("mooden-lang");

        if (savedLang === "uk" || savedLang === "en") {
            return savedLang;
        }

        return document.documentElement.lang || "uk";
    }

    function tr(path, fallback = "") {
        const lang = getCurrentLang();

        if (typeof getTranslation === "function") {
            const value = getTranslation(lang, path);

            if (value && value !== path) {
                return value;
            }
        }

        return fallback || path;
    }

    async function fetchJson(url) {
        const token = getToken();

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Request failed: ${response.status}`);
        }

        return data;
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString(getCurrentLang() === "en" ? "en-US" : "uk-UA", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function setText(element, value) {
        if (element) {
            element.textContent = value;
        }
    }

    function renderStats(stats = {}) {
        setText(totalUsersEl, Number(stats.totalUsers || 0));
        setText(totalCoursesEl, Number(stats.totalCourses || 0));
        setText(totalTasksEl, Number(stats.totalTasks || 0));
        setText(totalSubmissionsEl, Number(stats.totalSubmissions || 0));

        setText(totalStudentsEl, Number(stats.totalStudents || 0));
        setText(totalTeachersEl, Number(stats.totalTeachers || 0));
        setText(totalAnnouncementsEl, Number(stats.totalAnnouncements || 0));
        setText(openAttendanceEl, Number(stats.openAttendance || 0));
    }

    function renderActivity(items = []) {
        if (!activityList) {
            return;
        }

        if (!items.length) {
            activityList.innerHTML = `
                <p class="empty-msg">${tr("moderator_dashboard.no_activity", "Активності поки немає.")}</p>
            `;
            return;
        }

        activityList.innerHTML = items.slice(0, 5).map(item => {
            return `
                <div class="moderator-activity-item">
                    <div class="moderator-activity-icon">📤</div>

                    <div class="moderator-activity-info">
                        <h3>${item.task_title || tr("moderator_dashboard.submission_default", "Здана робота")}</h3>
                        <p>
                            ${item.student_name || tr("moderator_dashboard.student_default", "Студент")} •
                            ${item.course_title || tr("moderator_dashboard.course_default", "Курс")}
                        </p>
                    </div>

                    <time>${formatDate(item.created_at)}</time>
                </div>
            `;
        }).join("");
    }

    function renderAnnouncements(items = []) {
        if (!announcementsList) {
            return;
        }

        if (!items.length) {
            announcementsList.innerHTML = `
                <p class="empty-msg">${tr("moderator_dashboard.no_announcements", "Оголошень поки немає.")}</p>
            `;
            return;
        }

        announcementsList.innerHTML = items.slice(0, 4).map(item => {
            return `
                <article class="moderator-announcement-item">
                    <div class="announcement-header">
                        <span class="announcement-label">
                            ${item.course_title || tr("moderator_dashboard.general", "Загальне")}
                        </span>
                        <span class="announcement-date">
                            ${formatDate(item.created_at)}
                        </span>
                    </div>

                    <h3>${item.title || tr("moderator_dashboard.announcement_default", "Оголошення без назви")}</h3>

                    <p>
                        ${tr("moderator_dashboard.author", "Автор")}: ${item.author_name || "—"}
                    </p>
                </article>
            `;
        }).join("");
    }

    function showError() {
        if (activityList) {
            activityList.innerHTML = `
                <p class="empty-msg">${tr("moderator_dashboard.activity_error", "Не вдалося завантажити активність.")}</p>
            `;
        }

        if (announcementsList) {
            announcementsList.innerHTML = `
                <p class="empty-msg">${tr("moderator_dashboard.announcements_error", "Не вдалося завантажити оголошення.")}</p>
            `;
        }
    }

    async function loadDashboard() {
        const token = getToken();

        if (!token) {
            showError();
            return;
        }

        try {
            const data = await fetchJson(`${API_BASE_URL}/moderator/dashboard`);

            renderStats(data.stats || {});
            renderActivity(data.activity || []);
            renderAnnouncements(data.announcements || []);
        } catch (error) {
            console.error("[Moderator Dashboard] Помилка:", error);

            if (typeof showToast === "function") {
                showToast(
                    tr("moderator_dashboard.load_error", "Не вдалося завантажити панель модератора."),
                    "error"
                );
            }

            showError();
        }
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadDashboard();
});