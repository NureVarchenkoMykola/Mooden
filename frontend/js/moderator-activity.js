document.addEventListener("DOMContentLoaded", () => {
    const activityList = document.getElementById("activityList");
    const activitySearch = document.getElementById("activitySearch");
    const activityTypeFilter = document.getElementById("activityTypeFilter");
    const activitySort = document.getElementById("activitySort");
    const refreshActivityBtn = document.getElementById("refreshActivityBtn");

    const totalActivityEl = document.getElementById("totalActivity");
    const submissionsCountEl = document.getElementById("submissionsCount");
    const announcementsCountEl = document.getElementById("announcementsCount");
    const attendanceCountEl = document.getElementById("attendanceCount");

    let activityItems = [];

    if (!activityList) {
        console.error("[Moderator Activity] #activityList element was not found.");
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

        return document.documentElement.lang || "uk";
    }

    async function fetchJson(url, options = {}) {
        const token = getToken();

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

    function getActivityIcon(type) {
        if (type === "submission") return "📤";
        if (type === "announcement") return "📢";
        if (type === "attendance") return "✅";
        if (type === "notification") return "🔔";

        return "📌";
    }

    function getActivityTypeLabel(type) {
        if (type === "submission") return getTranslation(getCurrentLang(), "moderator_activity.type_submission");
        if (type === "announcement") return getTranslation(getCurrentLang(), "moderator_activity.type_announcement");
        if (type === "attendance") return getTranslation(getCurrentLang(), "moderator_activity.type_attendance");
        if (type === "notification") return getTranslation(getCurrentLang(), "moderator_activity.type_notification");

        return getTranslation(getCurrentLang(), "moderator_activity.type_default");
    }

    function normalizeActivityItem(item) {
        const type = item.type || item.activity_type || "system";

        return {
            id: item.id || `${type}-${crypto.randomUUID()}`,
            type,
            title: item.title || getTranslation(getCurrentLang(), "moderator_activity.default_title"),
            description: item.description || "",
            student_name: item.student_name || "",
            course_title: item.course_title || item.course_name || "",
            author_name: item.author_name || "",
            created_at: item.created_at || item.submitted_at || item.updated_at || item.date || null
        };
    }

    function updateStats() {
        const total = activityItems.length;
        const submissions = activityItems.filter(item => item.type === "submission").length;
        const announcements = activityItems.filter(item => item.type === "announcement").length;
        const attendance = activityItems.filter(item => item.type === "attendance").length;

        totalActivityEl.textContent = total;
        submissionsCountEl.textContent = submissions;
        announcementsCountEl.textContent = announcements;
        attendanceCountEl.textContent = attendance;
    }

    function getFilteredActivity() {
        const query = String(activitySearch?.value || "").trim().toLowerCase();
        const type = activityTypeFilter?.value || "all";
        const sort = activitySort?.value || "newest";

        let result = [...activityItems];

        if (type !== "all") {
            result = result.filter(item => item.type === type);
        }

        if (query) {
            result = result.filter(item => {
                const text = [
                    item.title,
                    item.description,
                    item.student_name,
                    item.course_title,
                    item.author_name
                ].join(" ").toLowerCase();

                return text.includes(query);
            });
        }

        result.sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();

            if (sort === "oldest") {
                return dateA - dateB;
            }

            return dateB - dateA;
        });

        return result;
    }

    function getActivityDescription(item) {
        if (item.type === "attendance") {
            if (item.description) {
                return `${getTranslation(getCurrentLang(), "moderator_activity.desc_attendance")} <span class="activity-time-highlight">${item.description}</span>.`;
            }

            return getTranslation(getCurrentLang(), "moderator_activity.desc_attendance");
        }

        if (item.description) {
            return item.description;
        }

        if (item.type === "submission") {
            return getTranslation(getCurrentLang(), "moderator_activity.desc_submission");
        }

        if (item.type === "announcement") {
            return getTranslation(getCurrentLang(), "moderator_activity.desc_announcement");
        }

        if (item.type === "notification") {
            return getTranslation(getCurrentLang(), "moderator_activity.desc_notification");
        }

        return getTranslation(getCurrentLang(), "moderator_activity.desc_default");
    }

    function renderActivity() {
        const filtered = getFilteredActivity();

        if (!filtered.length) {
            activityList.innerHTML = `
                <div class="moderator-activity-empty">
                    <h2>${getTranslation(getCurrentLang(), "moderator_activity.empty_title")}</h2>
                    <p>${getTranslation(getCurrentLang(), "moderator_activity.empty_text")}</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = filtered.map(item => {
            return `
                <article class="moderator-activity-card type-${item.type}">
                    <div class="moderator-activity-icon">
                        ${getActivityIcon(item.type)}
                    </div>

                    <div class="moderator-activity-content">
                        <div class="activity-title-row">
                            <h2>${item.title}</h2>

                            <span class="activity-type-badge ${item.type}">
                                ${getActivityTypeLabel(item.type)}
                            </span>
                        </div>

                        <p class="activity-description">
                            ${getActivityDescription(item)}
                        </p>

                        <div class="activity-meta">
                            ${item.student_name ? `<span>👤 ${item.student_name}</span>` : ""}
                            ${item.course_title ? `<span>📚 ${item.course_title}</span>` : ""}
                            ${item.author_name ? `<span>✍️ ${item.author_name}</span>` : ""}
                        </div>
                    </div>

                    <time class="activity-date">
                        ${formatDate(item.created_at)}
                    </time>
                </article>
            `;
        }).join("");
    }

    async function loadActivity() {
        const token = getToken();

        if (!token) {
            activityList.innerHTML = `
                <div class="moderator-activity-empty">
                    <h2>${getTranslation(getCurrentLang(), "moderator_activity.no_access_title")}</h2>
                    <p>${getTranslation(getCurrentLang(), "moderator_activity.no_access_text")}</p>
                </div>
            `;
            return;
        }

        try {
            activityList.innerHTML = `
                <div class="moderator-activity-loading">
                    <h2>${getTranslation(getCurrentLang(), "moderator_activity.loading_title")}</h2>
                    <p>${getTranslation(getCurrentLang(), "moderator_activity.loading_text")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/moderator/activity`);

            const sourceItems = Array.isArray(data.activity)
                ? data.activity
                : [];

            activityItems = sourceItems.map(normalizeActivityItem);

            updateStats();
            renderActivity();
        } catch (error) {
            console.error("[Moderator Activity] Activity loading failed:", error);

            showToast(getTranslation(getCurrentLang(), "moderator_activity.load_error"), "error");

            activityList.innerHTML = `
                <div class="moderator-activity-empty">
                    <h2>${getTranslation(getCurrentLang(), "moderator_activity.load_error_title")}</h2>
                    <p>${getTranslation(getCurrentLang(), "moderator_activity.load_error_text")}</p>
                </div>
            `;
        }
    }

    if (activitySearch) {
        activitySearch.addEventListener("input", renderActivity);
    }

    if (activityTypeFilter) {
        activityTypeFilter.addEventListener("change", renderActivity);
    }

    if (activitySort) {
        activitySort.addEventListener("change", renderActivity);
    }

    if (refreshActivityBtn) {
        refreshActivityBtn.addEventListener("click", async () => {
            refreshActivityBtn.disabled = true;

            try {
                await loadActivity();
                showToast(getTranslation(getCurrentLang(), "moderator_activity.refreshed"), "success");
            } finally {
                refreshActivityBtn.disabled = false;
            }
        });
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadActivity();
});