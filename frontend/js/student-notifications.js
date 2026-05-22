document.addEventListener("DOMContentLoaded", () => {
    loadNotifications();

    document.getElementById("markAllReadBtn")?.addEventListener("click", markAllRead);
});

function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function formatDate(value, lang) {
    return new Date(value).toLocaleString(lang === "en" ? "en-US" : "uk-UA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function loadNotifications() {
    const list = document.getElementById("notificationsList");
    const token = getToken();
    const lang = document.documentElement.lang || "uk";

    try {
        list.innerHTML = `<p class="notifications-empty">${getTranslation(lang, "profile.loading")}</p>`;

        const response = await fetch(`${API_BASE_URL}/user/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "NOTIFICATIONS_ERROR");
        }

        renderNotifications(data.notifications || [], data.user?.lang || lang);
    } catch (err) {
        console.error("[Dev Mode] Notifications load failed:", err);
        list.innerHTML = `<p class="notifications-empty">${getTranslation(lang, "errors.UNKNOWN_ERROR")}</p>`;
    }
}

function renderNotifications(notifications, lang) {
    const list = document.getElementById("notificationsList");

    if (!notifications.length) {
        list.innerHTML = `<p class="notifications-empty">${getTranslation(lang, "notifications.empty")}</p>`;
        return;
    }

    list.innerHTML = notifications.map(item => `
        <article class="notification-item ${item.is_read ? "read" : "unread"}">
            <div class="notification-icon">${item.is_read ? "🔔" : "✨"}</div>

            <div class="notification-body">
                <div class="notification-top">
                    <span class="notification-status">
                        ${item.is_read 
                            ? getTranslation(lang, "notifications.read") 
                            : getTranslation(lang, "notifications.unread")}
                    </span>
                    <time>${formatDate(item.created_at, lang)}</time>
                </div>

                <p>${item.message}</p>

                ${!item.is_read ? `
                    <button class="mark-read-btn" type="button" data-id="${item.id}">
                        ${getTranslation(lang, "notifications.mark_read")}
                    </button>
                ` : ""}
            </div>
        </article>
    `).join("");

    document.querySelectorAll(".mark-read-btn").forEach(btn => {
        btn.addEventListener("click", () => markRead(btn.dataset.id));
    });
}

async function markRead(id) {
    const token = getToken();
    if (!id || !token) return;

    await fetch(`${API_BASE_URL}/user/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });

    loadNotifications();
}

async function markAllRead() {
    const token = getToken();
    if (!token) return;

    await fetch(`${API_BASE_URL}/user/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });

    loadNotifications();
}