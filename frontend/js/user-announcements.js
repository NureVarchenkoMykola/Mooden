let allAnnouncements = [];
let announcementsLang = "uk";

document.addEventListener("DOMContentLoaded", () => {
    loadAnnouncements();
    document.getElementById("markAllReadBtn")?.addEventListener("click", markAllRead);
    document.getElementById("announcementSearch")?.addEventListener("input", applyAnnouncementFilters);
    document.getElementById("announcementFilter")?.addEventListener("change", applyAnnouncementFilters);
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

        allAnnouncements = data.announcements || [];
        announcementsLang = data.user?.lang || lang;

        updateAnnouncementStats();
        applyAnnouncementFilters();
    } catch (err) {
        console.error("[Dev Mode] Announcements load failed:", err);
        list.innerHTML = `<p class="announcements-empty">${getTranslation(lang, "errors.UNKNOWN_ERROR")}</p>`;
    }
}

function updateAnnouncementStats() {
    const total = allAnnouncements.length;
    const unread = allAnnouncements.filter(item => !item.is_read).length;
    const read = allAnnouncements.filter(item => item.is_read).length;

    document.getElementById("totalAnnouncements").textContent = total;
    document.getElementById("unreadAnnouncements").textContent = unread;
    document.getElementById("readAnnouncements").textContent = read;
}

function applyAnnouncementFilters() {
    const query = (document.getElementById("announcementSearch")?.value || "").toLowerCase().trim();
    const filter = document.getElementById("announcementFilter")?.value || "all";

    const filtered = allAnnouncements.filter(item => {
        const matchesStatus =
            filter === "all" ||
            (filter === "read" && item.is_read) ||
            (filter === "unread" && !item.is_read);

        const text = [
            item.title,
            item.content,
            item.course_name,
            item.author_name
        ].filter(Boolean).join(" ").toLowerCase();

        return matchesStatus && (!query || text.includes(query));
    });

    renderAnnouncements(filtered, announcementsLang);
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