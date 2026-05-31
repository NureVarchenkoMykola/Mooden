document.addEventListener("DOMContentLoaded", () => {
    const content = document.getElementById("moderatorProfileContent");

    const editProfileForm = document.getElementById("moderatorEditProfileForm");
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
        console.error("[Moderator Profile] #moderatorProfileContent element was not found.");
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

        moderatorEditFullName.value = currentModerator.full_name || "";
        moderatorEditEmail.value = currentModerator.email || "";
        moderatorEditLang.value = currentModerator.lang || "uk";
        updateSidebarProfile();
    }

    function updateSidebarProfile() {
        const profileName = document.getElementById("profileName");
        const profileRole = document.getElementById("profileGroup") || document.getElementById("profileRole");
        const avatarInitial = document.getElementById("avatarInitial");

        if (profileName) {
            profileName.textContent = currentModerator.full_name || "...";
        }

        if (profileRole) {
            profileRole.textContent = currentModerator.sub_info || getTranslation(getCurrentLang(), "moderator_profile.sub_info");
        }

        if (avatarInitial) {
            avatarInitial.textContent = getInitials(currentModerator.full_name);
        }
    }

    function renderProfile(profileData = {}) {
        const stats = profileData.stats || {};

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
                        ${getTranslation(getCurrentLang(), "moderator_profile.role_badge")}
                    </span>

                    <h1>${currentModerator.full_name || getTranslation(getCurrentLang(), "moderator_profile.fallback_name")}</h1>

                    <p>
                        ${currentModerator.sub_info || getTranslation(getCurrentLang(), "moderator_profile.sub_info")}
                    </p>

                    <div class="moderator-profile-tags">
                        <span>📧 ${currentModerator.email || getTranslation(getCurrentLang(), "moderator_profile.no_email")}</span>
                        <span>🌐 ${currentModerator.lang || "uk"}</span>
                        <span>${getTranslation(getCurrentLang(), "moderator_profile.role_tag")}</span>
                    </div>
                </div>
            </header>

            <section class="moderator-profile-stats">
                <div class="moderator-profile-stat">
                    <span>👥</span>
                    <div>
                        <strong>${totalUsers}</strong>
                        <p>${getTranslation(getCurrentLang(), "moderator_profile.stat_users")}</p>
                    </div>
                </div>

                <div class="moderator-profile-stat">
                    <span>📚</span>
                    <div>
                        <strong>${totalCourses}</strong>
                        <p>${getTranslation(getCurrentLang(), "moderator_profile.stat_courses")}</p>
                    </div>
                </div>

                <div class="moderator-profile-stat">
                    <span>📢</span>
                    <div>
                        <strong>${totalAnnouncements}</strong>
                        <p>${getTranslation(getCurrentLang(), "moderator_profile.stat_announcements")}</p>
                    </div>
                </div>

                <div class="moderator-profile-stat">
                    <span>✅</span>
                    <div>
                        <strong>${openAttendance}</strong>
                        <p>${getTranslation(getCurrentLang(), "moderator_profile.stat_attendance")}</p>
                    </div>
                </div>
            </section>

            <section class="moderator-profile-layout">
                <div class="moderator-profile-card">
                    <div class="moderator-profile-card-header">
                        <h2>${getTranslation(getCurrentLang(), "moderator_profile.info_title")}</h2>
                    </div>

                    <div class="moderator-profile-info-grid">
                        <div>
                            <span>${getTranslation(getCurrentLang(), "moderator_profile.full_name")}</span>
                            <strong>${currentModerator.full_name || "—"}</strong>
                        </div>

                        <div>
                            <span>Email</span>
                            <strong>${currentModerator.email || "—"}</strong>
                        </div>

                        <div>
                            <span>${getTranslation(getCurrentLang(), "moderator_profile.role")}</span>
                            <strong>${getTranslation(getCurrentLang(), "moderator_profile.role_value")}</strong>
                        </div>

                        <div>
                            <span>${getTranslation(getCurrentLang(), "moderator_profile.lang")}</span>
                            <strong>${currentModerator.lang || "uk"}</strong>
                        </div>
                    </div>
                </div>

                <div class="moderator-profile-card">
                    <div class="moderator-profile-card-header">
                        <h2>${getTranslation(getCurrentLang(), "moderator_profile.permissions_title")}</h2>
                    </div>

                    <div class="moderator-profile-permissions">
                        <div class="moderator-permission-item">
                            <span>👥</span>
                            <div>
                                <strong>${getTranslation(getCurrentLang(), "moderator_profile.permission_users_title")}</strong>
                                <p>${getTranslation(getCurrentLang(), "moderator_profile.permission_users_text")}</p>
                            </div>
                        </div>

                        <div class="moderator-permission-item">
                            <span>📚</span>
                            <div>
                                <strong>${getTranslation(getCurrentLang(), "moderator_profile.permission_courses_title")}</strong>
                                <p>${getTranslation(getCurrentLang(), "moderator_profile.permission_courses_text")}</p>
                            </div>
                        </div>

                        <div class="moderator-permission-item">
                            <span>📌</span>
                            <div>
                                <strong>${getTranslation(getCurrentLang(), "moderator_profile.permission_activity_title")}</strong>
                                <p>${getTranslation(getCurrentLang(), "moderator_profile.permission_activity_text")}</p>
                            </div>
                        </div>

                        <div class="moderator-permission-item">
                            <span>🔔</span>
                            <div>
                                <strong>${getTranslation(getCurrentLang(), "moderator_profile.permission_communication_title")}</strong>
                                <p>${getTranslation(getCurrentLang(), "moderator_profile.permission_communication_text")}</p>
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
            showEmpty(getTranslation(getCurrentLang(), "errors.UNAUTHORIZED"));
            return;
        }

        try {
            content.innerHTML = `
                <div class="moderator-profile-loading">
                    <h2>${getTranslation(getCurrentLang(), "profile.loading")}</h2>
                    <p>${getTranslation(getCurrentLang(), "dashboard.status_loading")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/moderator/profile`);
            const moderator = data.moderator || {};

            currentModerator = {
                id: moderator.id || null,
                full_name: moderator.full_name || getTranslation(getCurrentLang(), "moderator_profile.fallback_name"),
                email: moderator.email || "",
                lang: moderator.lang || "uk",
                sub_info: getTranslation(getCurrentLang(), "moderator_profile.sub_info")
            };

            renderProfile(data);
        } catch (error) {
            console.error("[Moderator Profile] Profile loading failed:", error);

            showEmpty(
                getTranslation(getCurrentLang(), "moderator_profile.unavailable_title"),
                getTranslation(getCurrentLang(), "moderator_profile.unavailable_text")
            );
        }
    }

    async function updateProfile(event) {
        event.preventDefault();

        const payload = {
            full_name: moderatorEditFullName.value.trim(),
            email: moderatorEditEmail.value.trim(),
            lang: moderatorEditLang.value
        };

        if (!payload.full_name || !payload.email) {
            showToast(getTranslation(getCurrentLang(), "moderator_profile.validation_error"), "error");
            return;
        }

        try {
            const data = await fetchJson(`${API_BASE_URL}/moderator/profile`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            currentModerator = {
                ...currentModerator,
                ...(data.moderator || payload)
            };

            localStorage.setItem("mooden-lang", payload.lang);
            document.documentElement.lang = payload.lang;

            if (typeof applyStaticTranslations === "function") {
                applyStaticTranslations(payload.lang);
            }

            showToast(getTranslation(payload.lang, "moderator_profile.update_success"), "success");

            await loadProfile();
        } catch (error) {
            console.error("[Moderator Profile] Profile update failed:", error);
            showToast(getTranslation(getCurrentLang(), "moderator_profile.update_error"), "error");
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
        initGlobalPasswordChange("changePasswordForm");
    }
});