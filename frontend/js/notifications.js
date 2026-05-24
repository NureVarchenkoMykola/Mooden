document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("notificationsList");
    const searchInput = document.getElementById("notificationSearch");
    const filterSelect = document.getElementById("notificationFilter");
    const markAllBtn = document.getElementById("markAllNotificationsBtn");

    const totalEl = document.getElementById("totalNotifications");
    const unreadEl = document.getElementById("unreadNotifications");
    const readEl = document.getElementById("readNotifications");

    let notifications = [];

    if (!list) {
        console.error("Не знайдено #notificationsList");
        return;
    }

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
    }

    function normalizeRole(role) {
        if (!role) {
            return "";
        }

        return String(role).toLowerCase().trim();
    }

    function getUserRole() {
        const savedRole =
            localStorage.getItem("role") ||
            sessionStorage.getItem("role") ||
            localStorage.getItem("userRole") ||
            sessionStorage.getItem("userRole");

        if (savedRole) {
            return normalizeRole(savedRole);
        }

        const token = getToken();

        if (!token) {
            return "";
        }

        try {
            const payloadBase64 = token.split(".")[1];

            if (!payloadBase64) {
                return "";
            }

            const payload = JSON.parse(atob(payloadBase64));

            return normalizeRole(payload.role || payload.userRole || "");
        } catch (error) {
            console.error("[Notifications] Не вдалося визначити роль з токена:", error);
            return "";
        }
    }
        function fixSidebarProfileStyle() {
            const profileName = document.getElementById("profileName");
            const profileGroup = document.getElementById("profileGroup");
            const userCard = document.querySelector(".sidebar-user .user-card");

            if (userCard) {
                userCard.style.textDecoration = "none";
                userCard.style.color = "inherit";
            }

            if (profileName) {
                profileName.style.color = "var(--text-main)";
            }

            if (profileGroup) {
                profileGroup.style.color = "var(--text-muted)";
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

        if (!dashboardLink || !coursesLink || !tasksLink || !scheduleLink) {
            return;
        }

        if (role === "teacher") {
            dashboardLink.href = "./teacher-dashboard.html";
            coursesLink.href = "./teacher-courses.html";
            scheduleLink.href = "./teacher-schedule.html";
            tasksLink.href = "./teacher-submissions.html";

            const tasksText = tasksLink.querySelector("[data-i18n]");

            if (tasksText) {
                tasksText.setAttribute("data-i18n", "common.nav_grading");
                tasksText.textContent = getTranslation(getCurrentLang(), "common.nav_grading");
            }

            if (gradesLink) {
                gradesLink.classList.add("hidden");
            }

            if (shopLink) {
                shopLink.classList.add("hidden");
            }

            if (profileBottomLink) {
                profileBottomLink.href = "./teacher-profile.html";
            }

            document.body.classList.add("teacher-notifications-page");
            document.body.classList.remove("student-notifications-page");

            return;
        }

        dashboardLink.href = "./student-dashboard.html";
        coursesLink.href = "./student-courses.html";
        tasksLink.href = "./student-tasks.html";
        scheduleLink.href = "./student-schedule.html";

        if (gradesLink) {
            gradesLink.href = "./student-grades.html";
            gradesLink.classList.remove("hidden");
        }

        if (shopLink) {
            shopLink.classList.remove("hidden");
        }

        if (profileBottomLink) {
            profileBottomLink.href = "#";
        }

        document.body.classList.add("student-notifications-page");
        document.body.classList.remove("teacher-notifications-page");
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
            <div class="notifications-empty">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    async function loadNotifications() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!token) {
            showEmpty(getTranslation(lang, "errors.UNAUTHORIZED"), "");
            return;
        }

        try {
            list.innerHTML = `
                <div class="notifications-loading">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/user/notifications`, token);

            notifications = Array.isArray(data.notifications)
                ? data.notifications
                : [];

            updateStats();
            renderNotifications();
        } catch (error) {
            console.error("[Notifications] Помилка:", error);

            showEmpty(
                getTranslation(lang, "notifications_page.unavailable_title"),
                getTranslation(lang, "notifications_page.unavailable_text")
            );
        }
    }

    function updateStats() {
        const total = notifications.length;
        const unread = notifications.filter(item => !item.is_read).length;
        const read = total - unread;

        totalEl.textContent = total;
        unreadEl.textContent = unread;
        readEl.textContent = read;

        const notifBadge = document.getElementById("notifBadge");

        if (notifBadge) {
            notifBadge.textContent = unread;
            notifBadge.style.display = unread > 0 ? "inline-flex" : "none";
        }
    }

    function getFilteredNotifications() {
        const query = String(searchInput?.value || "").trim().toLowerCase();
        const filter = filterSelect?.value || "all";

        let result = [...notifications];

        if (filter === "unread") {
            result = result.filter(item => !item.is_read);
        }

        if (filter === "read") {
            result = result.filter(item => item.is_read);
        }

        if (query) {
            result = result.filter(item => {
                const message = String(item.message || "").toLowerCase();
                return message.includes(query);
            });
        }

        return result;
    }

    function renderNotifications() {
        const lang = getCurrentLang();
        const items = getFilteredNotifications();

        if (!items.length) {
            showEmpty(
                getTranslation(lang, "notifications_page.empty_title"),
                getTranslation(lang, "notifications_page.empty_text")
            );
            return;
        }

        list.innerHTML = items.map(item => renderNotificationCard(item)).join("");

        bindNotificationButtons();
    }

    function renderNotificationCard(item) {
        const lang = getCurrentLang();
        const isRead = item.is_read === true;

        return `
            <article class="notification-card ${isRead ? "read" : "unread"}">
                <div class="notification-icon">
                    ${isRead ? "✅" : "🔔"}
                </div>

                <div class="notification-content">
                    <div class="notification-top">
                        <span class="notification-status ${isRead ? "read" : "unread"}">
                            ${
                                isRead
                                    ? getTranslation(lang, "notifications_page.status_read")
                                    : getTranslation(lang, "notifications_page.status_unread")
                            }
                        </span>

                        <time>${formatDate(item.created_at)}</time>
                    </div>

                    <p>${item.message || "—"}</p>
                </div>

                ${
                    !isRead
                        ? `
                            <button class="notification-read-btn" type="button" data-notification-id="${item.id}">
                                ${getTranslation(lang, "notifications_page.mark_read")}
                            </button>
                        `
                        : ""
                }
            </article>
        `;
    }

    function bindNotificationButtons() {
        document.querySelectorAll(".notification-read-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const lang = getCurrentLang();
                const token = getToken();
                const id = button.dataset.notificationId;

                if (!token || !id) {
                    return;
                }

                button.disabled = true;
                button.textContent = getTranslation(lang, "notifications_page.saving");

                try {
                    await fetchJson(`${API_BASE_URL}/user/notifications/${id}/read`, token, {
                        method: "POST"
                    });

                    if (typeof showToast === "function") {
                        showToast(getTranslation(lang, "notifications_page.marked_read"), "success");
                    }

                    await loadNotifications();
                } catch (error) {
                    console.error("[Notifications] Помилка позначення:", error);

                    button.disabled = false;
                    button.textContent = getTranslation(lang, "notifications_page.mark_read");

                    if (typeof showToast === "function") {
                        showToast(getTranslation(lang, "notifications_page.mark_error"), "error");
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
            markAllBtn.textContent = getTranslation(lang, "notifications_page.saving");

            try {
                await fetchJson(`${API_BASE_URL}/user/notifications/read-all`, token, {
                    method: "POST"
                });

                if (typeof showToast === "function") {
                    showToast(getTranslation(lang, "notifications_page.all_marked_read"), "success");
                }

                await loadNotifications();

                markAllBtn.disabled = false;
                markAllBtn.textContent = getTranslation(lang, "notifications_page.mark_all");
            } catch (error) {
                console.error("[Notifications] Помилка позначення всіх:", error);

                markAllBtn.disabled = false;
                markAllBtn.textContent = getTranslation(lang, "notifications_page.mark_all");

                if (typeof showToast === "function") {
                    showToast(getTranslation(lang, "notifications_page.mark_error"), "error");
                }
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderNotifications);
    }

    if (filterSelect) {
        filterSelect.addEventListener("change", renderNotifications);
    }

    setupRoleMenu();
        fixSidebarProfileStyle();

        if (typeof applyStaticTranslations === "function") {
            applyStaticTranslations(getCurrentLang());
        }

        fixSidebarProfileStyle();

        setTimeout(fixSidebarProfileStyle, 100);
        setTimeout(fixSidebarProfileStyle, 300);
        setTimeout(fixSidebarProfileStyle, 700);

        loadNotifications();
});