document.addEventListener("DOMContentLoaded", () => {
    const usersList = document.getElementById("usersList");
    const searchInput = document.getElementById("userSearch");
    const roleFilter = document.getElementById("roleFilter");
    const statusFilter = document.getElementById("statusFilter");

    const totalUsersEl = document.getElementById("totalUsers");
    const studentsCountEl = document.getElementById("studentsCount");
    const teachersCountEl = document.getElementById("teachersCount");
    const blockedCountEl = document.getElementById("blockedCount");

    const openAddUserModalBtn = document.getElementById("openAddUserModalBtn");
    const userModalOverlay = document.getElementById("userModalOverlay");
    const closeUserModalBtn = document.getElementById("closeUserModalBtn");
    const cancelUserModalBtn = document.getElementById("cancelUserModalBtn");
    const userForm = document.getElementById("userForm");

    const userModalTitle = document.getElementById("userModalTitle");
    const userModalDesc = document.getElementById("userModalDesc");

    const userIdInput = document.getElementById("userIdInput");
    const fullNameInput = document.getElementById("fullNameInput");
    const emailInput = document.getElementById("emailInput");
    const roleInput = document.getElementById("roleInput");
    const langInput = document.getElementById("langInput");
    const passwordInput = document.getElementById("passwordInput");
    const passwordField = document.getElementById("passwordField");

    let users = [];
    let modalMode = "create";

    if (!usersList) {
        console.error("[Moderator Users] #usersList element was not found.");
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

    function tr(path) {
        const lang = getCurrentLang();

        if (typeof getTranslation !== "function") {
            return path;
        }

        return getTranslation(lang, path);
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
            year: "numeric"
        });
    }

    function getRoleLabel(role) {
        if (role === "student") return tr("moderator_users.role_student");
        if (role === "teacher") return tr("moderator_users.role_teacher");
        if (role === "moderator") return tr("moderator_users.role_moderator");

        return role || "—";
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

    function isUserBlocked(user) {
        return user.is_blocked === true || user.isBlocked === true;
    }

    function normalizeUser(user) {
        return {
            ...user,
            is_blocked: isUserBlocked(user)
        };
    }

    function updateStats() {
        const total = users.length;
        const students = users.filter(user => user.role === "student").length;
        const teachers = users.filter(user => user.role === "teacher").length;
        const blocked = users.filter(user => isUserBlocked(user)).length;

        totalUsersEl.textContent = total;
        studentsCountEl.textContent = students;
        teachersCountEl.textContent = teachers;
        blockedCountEl.textContent = blocked;
    }

    function getFilteredUsers() {
        const query = String(searchInput?.value || "").trim().toLowerCase();
        const role = roleFilter?.value || "all";
        const status = statusFilter?.value || "all";

        let result = [...users];

        if (role !== "all") {
            result = result.filter(user => user.role === role);
        }

        if (status === "active") {
            result = result.filter(user => !isUserBlocked(user));
        }

        if (status === "blocked") {
            result = result.filter(user => isUserBlocked(user));
        }

        if (query) {
            result = result.filter(user => {
                const name = String(user.full_name || "").toLowerCase();
                const email = String(user.email || "").toLowerCase();

                return name.includes(query) || email.includes(query);
            });
        }

        return result;
    }

    function renderUsers() {
        const filteredUsers = getFilteredUsers();

        if (!filteredUsers.length) {
            usersList.innerHTML = `
                <div class="moderator-users-empty">
                    <h2>${tr("moderator_users.empty_title")}</h2>
                    <p>${tr("moderator_users.empty_text")}</p>
                </div>
            `;
            return;
        }

        usersList.innerHTML = filteredUsers.map(user => {
            const blocked = isUserBlocked(user);

            return `
                <article class="moderator-user-card role-${user.role} ${blocked ? "is-blocked" : "is-active"}">
                    <div class="moderator-user-avatar">
                        ${getInitials(user.full_name)}
                    </div>

                    <div class="moderator-user-info">
                        <div class="moderator-user-title-row">
                            <h2>${user.full_name || tr("moderator_users.unknown_user")}</h2>

                            <span class="user-status-badge ${blocked ? "blocked" : "active"}">
                                ${
                                    blocked
                                        ? tr("moderator_users.blocked")
                                        : tr("moderator_users.active")
                                }
                            </span>
                        </div>

                        <p>${user.email || tr("moderator_users.no_email")}</p>

                        <div class="moderator-user-meta">
                            <span>${getRoleLabel(user.role)}</span>
                            <span>${user.lang || "uk"}</span>
                            <span>${formatDate(user.created_at)}</span>
                        </div>
                    </div>

                    <div class="moderator-user-actions">
                        <label>
                            <span>${tr("moderator_users.role")}</span>

                            <select class="role-select" data-user-id="${user.id}">
                                <option value="student" ${user.role === "student" ? "selected" : ""}>
                                    ${tr("moderator_users.role_student")}
                                </option>
                                <option value="teacher" ${user.role === "teacher" ? "selected" : ""}>
                                    ${tr("moderator_users.role_teacher")}
                                </option>
                                <option value="moderator" ${user.role === "moderator" ? "selected" : ""}>
                                    ${tr("moderator_users.role_moderator")}
                                </option>
                            </select>
                        </label>

                        <div class="user-action-buttons">
                            <button class="edit-user-btn" type="button" data-user-id="${user.id}">
                                ${tr("moderator_users.edit")}
                            </button>

                            <button class="block-user-btn ${blocked ? "unblock" : "block"}" type="button" data-user-id="${user.id}" data-blocked="${blocked}">
                                ${
                                    blocked
                                        ? tr("moderator_users.unban")
                                        : tr("moderator_users.ban")
                                }
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        bindRoleSelects();
        bindEditButtons();
        bindBlockButtons();
    }

    function bindRoleSelects() {
        document.querySelectorAll(".role-select").forEach(select => {
            select.addEventListener("change", async () => {
                const userId = select.dataset.userId;
                const newRole = select.value;
                const oldUser = users.find(user => String(user.id) === String(userId));

                select.disabled = true;

                try {
                    await fetchJson(`${API_BASE_URL}/moderator/users/${userId}/role`, {
                        method: "PATCH",
                        body: JSON.stringify({
                            role: newRole
                        })
                    });

                    showToast(tr("moderator_users.role_updated"), "success");

                    await loadUsers();
                } catch (error) {
                    console.error("[Moderator Users] Role update failed:", error);

                    if (oldUser) {
                        select.value = oldUser.role;
                    }

                    showToast(tr("moderator_users.role_update_error"), "error");

                    select.disabled = false;
                }
            });
        });
    }

    function bindEditButtons() {
        document.querySelectorAll(".edit-user-btn").forEach(button => {
            button.addEventListener("click", () => {
                const userId = button.dataset.userId;
                const user = users.find(item => String(item.id) === String(userId));

                if (!user) {
                    return;
                }

                openEditModal(user);
            });
        });
    }

    function bindBlockButtons() {
        document.querySelectorAll(".block-user-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const userId = button.dataset.userId;
                const currentlyBlocked = button.dataset.blocked === "true";
                const nextBlocked = !currentlyBlocked;

                button.disabled = true;

                try {
                    await fetchJson(`${API_BASE_URL}/moderator/users/${userId}/block`, {
                        method: "PATCH",
                        body: JSON.stringify({
                            isBlocked: nextBlocked
                        })
                    });

                    showToast(
                        nextBlocked
                            ? tr("moderator_users.ban_success")
                            : tr("moderator_users.unban_success"),
                        "success"
                    );

                    await loadUsers();
                } catch (error) {
                    console.error("[Moderator Users] Block status update failed:", error);

                    showToast(tr("moderator_users.ban_error"), "error");

                    button.disabled = false;
                }
            });
        });
    }

    function openCreateModal() {
        modalMode = "create";

        userModalTitle.textContent = tr("moderator_users.add_modal_title");
        userModalDesc.textContent = tr("moderator_users.add_modal_desc");

        userIdInput.value = "";
        fullNameInput.value = "";
        emailInput.value = "";
        roleInput.value = "student";
        langInput.value = "uk";
        passwordInput.value = "";

        passwordField.style.display = "block";
        passwordInput.required = true;

        userModalOverlay.classList.add("active");
    }

    function openEditModal(user) {
        modalMode = "edit";

        userModalTitle.textContent = tr("moderator_users.edit_modal_title");
        userModalDesc.textContent = tr("moderator_users.edit_modal_desc");

        userIdInput.value = user.id;
        fullNameInput.value = user.full_name || "";
        emailInput.value = user.email || "";
        roleInput.value = user.role || "student";
        langInput.value = user.lang || "uk";
        passwordInput.value = "";

        passwordField.style.display = "none";
        passwordInput.required = false;

        userModalOverlay.classList.add("active");
    }

    function closeModal() {
        userModalOverlay.classList.remove("active");
    }

    async function handleUserFormSubmit(event) {
        event.preventDefault();

        const payload = {
            full_name: fullNameInput.value.trim(),
            email: emailInput.value.trim(),
            role: roleInput.value,
            lang: langInput.value
        };

        if (modalMode === "create") {
            payload.password = passwordInput.value;
        }

        if (!payload.full_name) {
            showToast(tr("moderator_users.full_name_required"), "error");
            return;
        }

        if (!payload.email) {
            showToast(tr("moderator_users.email_required"), "error");
            return;
        }

        if (modalMode === "create" && String(payload.password || "").length < 6) {
            showToast(tr("moderator_users.password_too_short"), "error");
            return;
        }

        const userId = userIdInput.value;

        try {
            if (modalMode === "create") {
                await fetchJson(`${API_BASE_URL}/moderator/users`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                showToast(tr("moderator_users.create_success"), "success");
            } else {
                await fetchJson(`${API_BASE_URL}/moderator/users/${userId}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                });

                showToast(tr("moderator_users.update_success"), "success");
            }

            closeModal();
            await loadUsers();
        } catch (error) {
            console.error("[Moderator Users] User save failed:", error);

            if (error.message === "FULL_NAME_REQUIRED") {
                showToast(tr("moderator_users.full_name_required"), "error");
                return;
            }

            if (error.message === "EMAIL_REQUIRED") {
                showToast(tr("moderator_users.email_required"), "error");
                return;
            }

            if (error.message === "PASSWORD_TOO_SHORT") {
                showToast(tr("moderator_users.password_too_short"), "error");
                return;
            }

            if (error.message === "EMAIL_ALREADY_EXISTS") {
                showToast(tr("moderator_users.email_already_exists"), "error");
                return;
            }

            showToast(tr("moderator_users.save_error"), "error");
        }
    }

    async function loadUsers() {
        const token = getToken();

        if (!token) {
            usersList.innerHTML = `
                <div class="moderator-users-empty">
                    <h2>${tr("moderator_users.no_access_title")}</h2>
                    <p>${tr("moderator_users.no_access_text")}</p>
                </div>
            `;
            return;
        }

        try {
            usersList.innerHTML = `
                <div class="moderator-users-loading">
                    <h2>${tr("moderator_users.loading_title")}</h2>
                    <p>${tr("moderator_users.loading_text")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/moderator/users`);

            users = Array.isArray(data.users)
                ? data.users.map(normalizeUser)
                : [];

            updateStats();
            renderUsers();
        } catch (error) {
            console.error("[Moderator Users] Users loading failed:", error);

            usersList.innerHTML = `
                <div class="moderator-users-empty">
                    <h2>${tr("moderator_users.load_error_title")}</h2>
                    <p>${tr("moderator_users.load_error_text")}</p>
                </div>
            `;
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderUsers);
    }

    if (roleFilter) {
        roleFilter.addEventListener("change", renderUsers);
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", renderUsers);
    }

    if (openAddUserModalBtn) {
        openAddUserModalBtn.addEventListener("click", openCreateModal);
    }

    if (closeUserModalBtn) {
        closeUserModalBtn.addEventListener("click", closeModal);
    }

    if (cancelUserModalBtn) {
        cancelUserModalBtn.addEventListener("click", closeModal);
    }

    if (userModalOverlay) {
        userModalOverlay.addEventListener("click", event => {
            if (event.target === userModalOverlay) {
                closeModal();
            }
        });
    }

    if (userForm) {
        userForm.addEventListener("submit", handleUserFormSubmit);
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadUsers();
});