document.addEventListener("DOMContentLoaded", () => {
    const content = document.getElementById("moderatorProfileContent");

    const editProfileForm = document.getElementById("moderatorEditProfileForm");
    const moderatorUserIdInput = document.getElementById("moderatorUserId");
    const moderatorEditFullName = document.getElementById("moderatorEditFullName");
    const moderatorEditEmail = document.getElementById("moderatorEditEmail");
    const moderatorEditLang = document.getElementById("moderatorEditLang");

    let currentModerator = {
        id: null,
        full_name: "",
        email: "",
        lang: "uk",
        sub_info: ""
    };

    if (!content) {
        console.error("Не знайдено #moderatorProfileContent");
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

    function showMessage(message, type = "success") {
        if (typeof showToast === "function") {
            showToast(message, type);
        } else {
            alert(message);
        }
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

    function decodeTokenPayload(token) {
        try {
            const payload = token.split(".")[1];

            if (!payload) {
                return null;
            }

            const normalizedPayload = payload
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            return JSON.parse(atob(normalizedPayload));
        } catch (error) {
            return null;
        }
    }

    function getCurrentUserIdFromToken() {
        const token = getToken();
        const payload = token ? decodeTokenPayload(token) : null;

        return payload?.id || payload?.userId || payload?.sub || null;
    }

    function getInitials(name) {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);

        if (!parts.length) {
            return "?";
        }

        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }

        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }

    function showEmpty(title, text = "") {
        content.innerHTML = `
            <div class="moderator-profile-empty">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    function fillEditForm() {
        if (!editProfileForm) {
            return;
        }

        moderatorUserIdInput.value = currentModerator.id || "";
        moderatorEditFullName.value = currentModerator.full_name || "";
        moderatorEditEmail.value = currentModerator.email || "";
        moderatorEditLang.value = currentModerator.lang || "uk";
    }

    function renderProfile(dashboardData = {}) {
        const stats = dashboardData.stats || {};

        const totalUsers = Number(stats.totalUsers || 0);
        const totalCourses = Number(stats.totalCourses || 0);
        const totalAnnouncements = Number(stats.totalAnnouncements || 0);
        const openAttendance = Number(stats.openAttendance || 0);

        content.innerHTML = `
            <header class="moderator-profile-hero">
                <div class="moderator-profile-avatar">
                    ${getInitials(currentModerator.full_name)}
                </div>

                <div class="moderator-profile-main">
                    <span class="moderator-profile-badge">
                        ${tr("moderator_profile.role_badge", "Профіль модератора")}
                    </span>

                    <h1>${currentModerator.full_name || tr("moderator_profile.fallback_name", "Модератор")}</h1>

                    <p>
                        ${currentModerator.sub_info || tr("moderator_profile.sub_info", "Модератор системи")}
                    </p>

                    <div class="moderator-profile-tags">
                        <span>📧 ${currentModerator.email || tr("moderator_profile.no_email", "Email не вказано")}</span>
                        <span>🌐 ${currentModerator.lang || "uk"}</span>
                        <span>${tr("moderator_profile.role_tag", "🛡️ moderator")}</span>
                    </div>
                </div>
            </header>

            <section class="moderator-profile-stats">
                <div class="moderator-profile-stat">
                    <span>👥</span>
                    <div>
                        <strong>${totalUsers}</strong>
                        <p>${tr("moderator_profile.stat_users", "Користувачів")}</p>
                    </div>
                </div>

                <div class="moderator-profile-stat">
                    <span>📚</span>
                    <div>
                        <strong>${totalCourses}</strong>
                        <p>${tr("moderator_profile.stat_courses", "Курсів")}</p>
                    </div>
                </div>

                <div class="moderator-profile-stat">
                    <span>📢</span>
                    <div>
                        <strong>${totalAnnouncements}</strong>
                        <p>${tr("moderator_profile.stat_announcements", "Оголошень")}</p>
                    </div>
                </div>

                <div class="moderator-profile-stat">
                    <span>✅</span>
                    <div>
                        <strong>${openAttendance}</strong>
                        <p>${tr("moderator_profile.stat_attendance", "Відкритих відміток")}</p>
                    </div>
                </div>
            </section>

            <section class="moderator-profile-layout">
                <div class="moderator-profile-card">
                    <div class="moderator-profile-card-header">
                        <h2>${tr("moderator_profile.info_title", "Особиста інформація")}</h2>
                    </div>

                    <div class="moderator-profile-info-grid">
                        <div>
                            <span>${tr("moderator_profile.full_name", "ПІБ")}</span>
                            <strong>${currentModerator.full_name || "—"}</strong>
                        </div>

                        <div>
                            <span>Email</span>
                            <strong>${currentModerator.email || "—"}</strong>
                        </div>

                        <div>
                            <span>${tr("moderator_profile.role", "Роль")}</span>
                            <strong>${tr("moderator_profile.role_value", "Модератор")}</strong>
                        </div>

                        <div>
                            <span>${tr("moderator_profile.lang", "Мова інтерфейсу")}</span>
                            <strong>${currentModerator.lang || "uk"}</strong>
                        </div>
                    </div>
                </div>

                <div class="moderator-profile-card">
                    <div class="moderator-profile-card-header">
                        <h2>${tr("moderator_profile.permissions_title", "Зона відповідальності")}</h2>
                    </div>

                    <div class="moderator-profile-permissions">
                        <div class="moderator-permission-item">
                            <span>👥</span>
                            <div>
                                <strong>${tr("moderator_profile.permission_users_title", "Користувачі")}</strong>
                                <p>${tr("moderator_profile.permission_users_text", "Перегляд користувачів, редагування даних, зміна ролей, блокування та розблокування облікових записів.")}</p>
                            </div>
                        </div>

                        <div class="moderator-permission-item">
                            <span>📚</span>
                            <div>
                                <strong>${tr("moderator_profile.permission_courses_title", "Курси")}</strong>
                                <p>${tr("moderator_profile.permission_courses_text", "Перегляд курсів, редагування інформації, зарахування студентів і призначення викладачів.")}</p>
                            </div>
                        </div>

                        <div class="moderator-permission-item">
                            <span>📌</span>
                            <div>
                                <strong>${tr("moderator_profile.permission_activity_title", "Активність")}</strong>
                                <p>${tr("moderator_profile.permission_activity_text", "Перегляд системних подій, зданих робіт, оголошень та інших змін у платформі.")}</p>
                            </div>
                        </div>

                        <div class="moderator-permission-item">
                            <span>🔔</span>
                            <div>
                                <strong>${tr("moderator_profile.permission_communication_title", "Комунікація")}</strong>
                                <p>${tr("moderator_profile.permission_communication_text", "Перегляд оголошень і сповіщень, пов’язаних з роботою освітньої платформи.")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;

        fillEditForm();
    }

    async function loadProfile() {
        const token = getToken();

        if (!token) {
            showEmpty(tr("errors.UNAUTHORIZED", "Не авторизовано"));
            return;
        }

        try {
            content.innerHTML = `
                <div class="moderator-profile-loading">
                    <h2>${tr("profile.loading", "Завантаження...")}</h2>
                    <p>${tr("dashboard.status_loading", "Отримуємо актуальну інформацію...")}</p>
                </div>
            `;

            const sidebarData = await fetchJson(`${API_BASE_URL}/user/sidebar`);
            const dashboardData = await fetchJson(`${API_BASE_URL}/moderator/dashboard`);

            const tokenUserId = getCurrentUserIdFromToken();
            const users = Array.isArray(dashboardData.users) ? dashboardData.users : [];

            let currentUser = null;

            if (tokenUserId) {
                currentUser = users.find(user => String(user.id) === String(tokenUserId));
            }

            if (!currentUser) {
                currentUser = users.find(user => user.full_name === sidebarData.full_name);
            }

            currentModerator = {
                id: currentUser?.id || tokenUserId || null,
                full_name: sidebarData.full_name || currentUser?.full_name || tr("moderator_profile.fallback_name", "Модератор"),
                email: currentUser?.email || tr("moderator_profile.no_email", "Email не вказано"),
                lang: sidebarData.lang || dashboardData.user?.lang || currentUser?.lang || "uk",
                sub_info: sidebarData.sub_info || tr("moderator_profile.sub_info", "Модератор системи")
            };

            renderProfile(dashboardData);
        } catch (error) {
            console.error("[Moderator Profile] Помилка:", error);

            showEmpty(
                tr("moderator_profile.unavailable_title", "Профіль недоступний"),
                tr("moderator_profile.unavailable_text", "Не вдалося завантажити профіль модератора.")
            );
        }
    }

    async function updateProfile(event) {
        event.preventDefault();

        const userId = moderatorUserIdInput.value || currentModerator.id;

        const payload = {
            full_name: moderatorEditFullName.value.trim(),
            email: moderatorEditEmail.value.trim(),
            lang: moderatorEditLang.value
        };

        if (!payload.full_name || !payload.email) {
            showMessage(tr("moderator_profile.validation_error", "Заповніть ПІБ та email."), "error");
            return;
        }

        try {
            if (!userId) {
                throw new Error("USER_ID_NOT_FOUND");
            }

            await fetchJson(`${API_BASE_URL}/moderator/users/${userId}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            currentModerator = {
                ...currentModerator,
                ...payload
            };

            localStorage.setItem("mooden-lang", payload.lang);

            if (typeof applyStaticTranslations === "function") {
                applyStaticTranslations(payload.lang);
            }

            showMessage(tr("moderator_profile.update_success", "Профіль оновлено."), "success");

            await loadProfile();
        } catch (error) {
            console.error("[Moderator Profile] Помилка оновлення:", error);
            showMessage(tr("moderator_profile.update_error", "Не вдалося оновити профіль модератора."), "error");
        }
    }

    if (editProfileForm) {
        editProfileForm.addEventListener("submit", updateProfile);
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadProfile();

    if (typeof initGlobalPasswordChange === "function") {
        initGlobalPasswordChange("moderatorChangePasswordForm");
    }
});