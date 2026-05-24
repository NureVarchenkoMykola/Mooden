document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("announcementsList");
    const searchInput = document.getElementById("announcementSearch");
    const filterSelect = document.getElementById("announcementFilter");
    const markAllBtn = document.getElementById("markAllAnnouncementsBtn");

    const totalEl = document.getElementById("totalAnnouncements");
    const unreadEl = document.getElementById("unreadAnnouncements");
    const readEl = document.getElementById("readAnnouncements");

    let announcements = [];

    if (!list) {
        console.error("Не знайдено #announcementsList");
        return;
    }

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
    }

    function getUserRole() {
    const savedRole =
        localStorage.getItem("role") ||
        sessionStorage.getItem("role") ||
        localStorage.getItem("userRole") ||
        sessionStorage.getItem("userRole");

    if (savedRole) {
        return savedRole;
    }

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
        return "";
    }

    try {
        const payloadBase64 = token.split(".")[1];

        if (!payloadBase64) {
            return "";
        }

        const payload = JSON.parse(atob(payloadBase64));

        return payload.role || "";
    } catch (error) {
        console.error("[Announcements] Не вдалося визначити роль з токена:", error);
        return "";
    }
}

    function setupRoleMenu() {
    const role = getUserRole();

    const dashboardLink = document.getElementById("dashboardLink");
    const coursesLink = document.getElementById("coursesLink");
    const tasksLink = document.getElementById("tasksLink");
    const scheduleLink = document.getElementById("scheduleLink");
    const gradesLink = document.getElementById("gradesLink");
    const shopLink = document.getElementById("shopLink");
    const profileBottomLink = document.getElementById("profileBottomLink");

    if (role === "teacher") {
        dashboardLink.href = "./teacher-dashboard.html";
        coursesLink.href = "./teacher-courses.html";
        scheduleLink.href = "./teacher-schedule.html";

        tasksLink.href = "./teacher-submissions.html";
        tasksLink.querySelector("[data-i18n]").setAttribute("data-i18n", "common.nav_grading");

        gradesLink.classList.add("hidden");
        shopLink.classList.add("hidden");

        if (profileBottomLink) {
            profileBottomLink.href = "./teacher-profile.html";
        }

        return;
    }

    dashboardLink.href = "./student-dashboard.html";
    coursesLink.href = "./student-courses.html";
    tasksLink.href = "./student-tasks.html";
    scheduleLink.href = "./student-schedule.html";
    gradesLink.href = "./student-grades.html";

    gradesLink.classList.remove("hidden");
    shopLink.classList.remove("hidden");

    if (profileBottomLink) {
        profileBottomLink.href = "./student-profile.html";
    }
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
            <div class="announcements-empty">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    async function loadAnnouncements() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!token) {
            showEmpty(getTranslation(lang, "errors.UNAUTHORIZED"), "");
            return;
        }

        try {
            list.innerHTML = `
                <div class="announcements-loading">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/user/announcements`, token);

            announcements = Array.isArray(data.announcements)
                ? data.announcements
                : [];

            updateStats();
            renderAnnouncements();
        } catch (error) {
            console.error("[Announcements] Помилка:", error);

            showEmpty(
                getTranslation(lang, "announcements_page.unavailable_title"),
                getTranslation(lang, "announcements_page.unavailable_text")
            );
        }
    }

    function updateStats() {
        const total = announcements.length;
        const unread = announcements.filter(item => !item.is_read).length;
        const read = total - unread;

        totalEl.textContent = total;
        unreadEl.textContent = unread;
        readEl.textContent = read;

        const announcementsBadge = document.getElementById("announcementsBadge");

        if (announcementsBadge) {
            announcementsBadge.textContent = unread;
            announcementsBadge.style.display = unread > 0 ? "inline-flex" : "none";
        }
    }

    function getFilteredAnnouncements() {
        const query = String(searchInput?.value || "").trim().toLowerCase();
        const filter = filterSelect?.value || "all";

        let result = [...announcements];

        if (filter === "unread") {
            result = result.filter(item => !item.is_read);
        }

        if (filter === "read") {
            result = result.filter(item => item.is_read);
        }

        if (query) {
            result = result.filter(item => {
                const title = String(item.title || "").toLowerCase();
                const content = String(item.content || "").toLowerCase();
                const author = String(item.author_name || "").toLowerCase();
                const course = String(item.course_name || "").toLowerCase();

                return (
                    title.includes(query) ||
                    content.includes(query) ||
                    author.includes(query) ||
                    course.includes(query)
                );
            });
        }

        return result;
    }

    function renderAnnouncements() {
        const lang = getCurrentLang();
        const items = getFilteredAnnouncements();

        if (!items.length) {
            showEmpty(
                getTranslation(lang, "announcements_page.empty_title"),
                getTranslation(lang, "announcements_page.empty_text")
            );
            return;
        }

        list.innerHTML = items.map(item => renderAnnouncementCard(item)).join("");

        bindAnnouncementButtons();
    }

    function renderAnnouncementCard(item) {
        const lang = getCurrentLang();
        const isRead = item.is_read === true;
        const courseName = item.course_name || getTranslation(lang, "announcements_page.general_announcement");

        return `
            <article class="announcement-card ${isRead ? "read" : "unread"}">
                <div class="announcement-icon">
                    ${isRead ? "✅" : "📢"}
                </div>

                <div class="announcement-content">
                    <div class="announcement-top">
                        <div>
                            <span class="announcement-course">${courseName}</span>
                            <h2>${item.title || getTranslation(lang, "announcements_page.untitled")}</h2>
                        </div>

                        <span class="announcement-status ${isRead ? "read" : "unread"}">
                            ${
                                isRead
                                    ? getTranslation(lang, "announcements_page.status_read")
                                    : getTranslation(lang, "announcements_page.status_unread")
                            }
                        </span>
                    </div>

                    <p class="announcement-text">
                        ${item.content || getTranslation(lang, "announcements_page.no_content")}
                    </p>

                    <div class="announcement-meta">
                        <span>👤 ${item.author_name || "—"}</span>
                        <span>🕒 ${formatDate(item.created_at)}</span>
                    </div>
                </div>

                ${
                    !isRead
                        ? `
                            <button class="announcement-read-btn" type="button" data-announcement-id="${item.id}">
                                ${getTranslation(lang, "announcements_page.mark_read")}
                            </button>
                        `
                        : ""
                }
            </article>
        `;
    }

    function bindAnnouncementButtons() {
        document.querySelectorAll(".announcement-read-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const lang = getCurrentLang();
                const token = getToken();
                const id = button.dataset.announcementId;

                if (!token || !id) {
                    return;
                }

                button.disabled = true;
                button.textContent = getTranslation(lang, "announcements_page.saving");

                try {
                    await fetchJson(`${API_BASE_URL}/user/announcements/${id}/read`, token, {
                        method: "POST"
                    });

                    if (typeof showToast === "function") {
                        showToast(getTranslation(lang, "announcements_page.marked_read"), "success");
                    }

                    await loadAnnouncements();
                } catch (error) {
                    console.error("[Announcements] Помилка позначення:", error);

                    button.disabled = false;
                    button.textContent = getTranslation(lang, "announcements_page.mark_read");

                    if (typeof showToast === "function") {
                        showToast(getTranslation(lang, "announcements_page.mark_error"), "error");
                    }
                }
            });
        });
    }

    if (markAllBtn) {
        markAllBtn.addEventListener("click", async () => {
            const lang = getCurrentLang();
            const token = getToken();

            if (!token) {
                return;
            }

            markAllBtn.disabled = true;
            markAllBtn.textContent = getTranslation(lang, "announcements_page.saving");

            try {
                await fetchJson(`${API_BASE_URL}/user/announcements/read-all`, token, {
                    method: "POST"
                });

                if (typeof showToast === "function") {
                    showToast(getTranslation(lang, "announcements_page.all_marked_read"), "success");
                }

                await loadAnnouncements();

                markAllBtn.disabled = false;
                markAllBtn.textContent = getTranslation(lang, "announcements_page.mark_all");
            } catch (error) {
                console.error("[Announcements] Помилка позначення всіх:", error);

                markAllBtn.disabled = false;
                markAllBtn.textContent = getTranslation(lang, "announcements_page.mark_all");

                if (typeof showToast === "function") {
                    showToast(getTranslation(lang, "announcements_page.mark_error"), "error");
                }
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderAnnouncements);
    }

    if (filterSelect) {
        filterSelect.addEventListener("change", renderAnnouncements);
    }

    setupRoleMenu();

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadAnnouncements();
});