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

    function showMessage(message, type = "success") {
        if (typeof showToast === "function") {
            showToast(message, type);
        } else {
            alert(message);
        }
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

    function getActivityType(item) {
        return item.type || item.activity_type || "submission";
    }

    function getActivityIcon(type) {
        if (type === "submission") return "📤";
        if (type === "announcement") return "📢";
        if (type === "attendance") return "✅";
        if (type === "notification") return "🔔";
        if (type === "system") return "⚙️";

        return "📌";
    }

    function getActivityTypeLabel(type) {
        if (type === "submission") {
            return tr("moderator_activity.type_submission", "Здана робота");
        }

        if (type === "announcement") {
            return tr("moderator_activity.type_announcement", "Оголошення");
        }

        if (type === "attendance") {
            return tr("moderator_activity.type_attendance", "Відвідуваність");
        }

        if (type === "notification") {
            return tr("moderator_activity.type_notification", "Сповіщення");
        }

        if (type === "system") {
            return tr("moderator_activity.type_system", "Системна подія");
        }

        return tr("moderator_activity.type_default", "Активність");
    }

    function normalizeActivityItem(item) {
        const type = getActivityType(item);

        return {
            id: item.id || `${type}-${Math.random()}`,
            type,
            title:
                item.title ||
                item.task_title ||
                item.course_title ||
                tr("moderator_activity.default_title", "Подія без назви"),
            description:
                item.description ||
                item.message ||
                item.student_name ||
                item.author_name ||
                "",
            student_name: item.student_name || "",
            course_title: item.course_title || item.course_name || "",
            author_name: item.author_name || "",
            created_at:
                item.created_at ||
                item.submitted_at ||
                item.updated_at ||
                item.date ||
                null
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

    function renderActivity() {
        const filtered = getFilteredActivity();

        if (!filtered.length) {
            activityList.innerHTML = `
                <div class="moderator-activity-empty">
                    <h2>${tr("moderator_activity.empty_title", "Активності не знайдено")}</h2>
                    <p>${tr("moderator_activity.empty_text", "Спробуйте змінити пошук або фільтр.")}</p>
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

    function getActivityDescription(item) {
        if (item.type === "submission") {
            return `${tr("moderator_activity.desc_submission", "Здано роботу")} ${item.title ? `«${item.title}»` : ""}.`;
        }

        if (item.type === "announcement") {
            return `${tr("moderator_activity.desc_announcement", "Створено або опубліковано оголошення")} ${item.title ? `«${item.title}»` : ""}.`;
        }

        if (item.type === "attendance") {
            return item.description || tr("moderator_activity.desc_attendance", "Змінено стан відмітки відвідуваності.");
        }

        if (item.type === "notification") {
            return item.description || tr("moderator_activity.desc_notification", "Створено системне сповіщення.");
        }

        return item.description || tr("moderator_activity.desc_default", "Зафіксовано подію в системі.");
    }

    async function loadActivity() {
        const token = getToken();

        if (!token) {
            activityList.innerHTML = `
                <div class="moderator-activity-empty">
                    <h2>${tr("moderator_activity.no_access_title", "Немає доступу")}</h2>
                    <p>${tr("moderator_activity.no_access_text", "Потрібно авторизуватися як модератор.")}</p>
                </div>
            `;
            return;
        }

        try {
            activityList.innerHTML = `
                <div class="moderator-activity-loading">
                    <h2>${tr("moderator_activity.loading_title", "Завантаження...")}</h2>
                    <p>${tr("moderator_activity.loading_text", "Отримуємо активність системи.")}</p>
                </div>
            `;

            let data;

            try {
                data = await fetchJson(`${API_BASE_URL}/moderator/activity`);
            } catch (activityEndpointError) {
                console.warn("[Moderator Activity] /moderator/activity недоступний, використовую dashboard fallback.");
                data = await fetchJson(`${API_BASE_URL}/moderator/dashboard`);
            }

            const sourceItems = Array.isArray(data.activity)
                ? data.activity
                : [];

            activityItems = sourceItems.map(normalizeActivityItem);

            updateStats();
            renderActivity();
        } catch (error) {
            console.error("[Moderator Activity] Помилка:", error);

            showMessage(
                tr("moderator_activity.load_error_toast", "Не вдалося завантажити активність."),
                "error"
            );

            activityList.innerHTML = `
                <div class="moderator-activity-empty">
                    <h2>${tr("moderator_activity.load_error_title", "Не вдалося завантажити активність")}</h2>
                    <p>${tr("moderator_activity.load_error_text", "Перевірте backend або права доступу модератора.")}</p>
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
            await loadActivity();
            refreshActivityBtn.disabled = false;

            showMessage(
                tr("moderator_activity.refreshed", "Активність оновлено."),
                "success"
            );
        });
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadActivity();
});