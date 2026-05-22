document.addEventListener("DOMContentLoaded", () => {
    loadAnnouncements();
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

async function loadAnnouncements() {
    const list = document.getElementById("announcementsList");
    const token = getToken();
    const lang = document.documentElement.lang || "uk";

    try {
        list.innerHTML = `<p class="announcements-empty">${getTranslation(lang, "profile.loading")}</p>`;

        const response = await fetch(`${API_BASE_URL}/user/announcements`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "ANNOUNCEMENTS_ERROR");

        renderAnnouncements(data.announcements || [], data.user?.lang || lang);
    } catch (err) {
        console.error("[Dev Mode] Announcements load failed:", err);
        list.innerHTML = `<p class="announcements-empty">${getTranslation(lang, "errors.UNKNOWN_ERROR")}</p>`;
    }
}

function renderAnnouncements(items, lang) {
    const list = document.getElementById("announcementsList");

    if (!items.length) {
        list.innerHTML = `<p class="announcements-empty">${getTranslation(lang, "announcements.empty")}</p>`;
        return;
    }

    list.innerHTML = items.map(item => `
        <article class="announcement-full-item ${item.is_read ? "read" : "unread"}">
            <div class="announcement-full-top">
                <span class="announcement-label">
                    ${item.course_name || getTranslation(lang, "dashboard.label_general")}
                </span>
                <time>${formatDate(item.created_at, lang)}</time>
            </div>

            <h3>${item.title}</h3>
            <p>${item.content}</p>

            <div class="announcement-full-meta">
                <span>${item.author_name || ""}</span>

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

    await fetch(`${API_BASE_URL}/user/announcements/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });

    loadAnnouncements();
}

async function markAllRead() {
    const token = getToken();
    if (!token) return;

    await fetch(`${API_BASE_URL}/user/announcements/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });

    loadAnnouncements();
}