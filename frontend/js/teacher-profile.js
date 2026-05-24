document.addEventListener("DOMContentLoaded", () => {
    const content = document.getElementById("teacherProfileContent");

    if (!content) {
        console.error("Не знайдено #teacherProfileContent");
        return;
    }

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
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
            year: "numeric"
        });
    }

    async function fetchJson(url, token) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Request failed: ${response.status}`);
        }

        return data;
    }

    function showEmpty(title, text = "") {
        content.innerHTML = `
            <div class="teacher-profile-empty">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    async function loadProfile() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!token) {
            showEmpty(getTranslation(lang, "errors.UNAUTHORIZED"), "");
            return;
        }

        try {
            content.innerHTML = `
                <div class="teacher-profile-loading">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/teacher/profile`, token);

            renderProfile({
                user: data.user || {},
                stats: data.stats || {},
                courses: Array.isArray(data.courses) ? data.courses : []
            });
        } catch (error) {
            console.error("[Teacher Profile] Помилка:", error);

            showEmpty(
                getTranslation(lang, "teacher_profile.unavailable_title"),
                getTranslation(lang, "teacher_profile.unavailable_text")
            );
        }
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

    function renderProfile(data) {
        const lang = getCurrentLang();

        const user = data.user;
        const stats = data.stats;
        const courses = data.courses;

        const rating = Number(user.rating || 0);
        const activeCourses = Number(stats.activeCourses || 0);
        const totalStudents = Number(stats.totalStudents || 0);
        const pendingGrading = Number(stats.pendingGrading || 0);
        const gradedCount = Number(stats.gradedCount || 0);

        content.innerHTML = `
            <header class="teacher-profile-hero">
                <div class="teacher-profile-avatar">
                    ${getInitials(user.full_name)}
                </div>

                <div class="teacher-profile-main">
                    <span class="teacher-profile-role">
                        ${getTranslation(lang, "teacher_profile.role_label")}
                    </span>

                    <h1>${user.full_name || getTranslation(lang, "teacher_profile.unknown_teacher")}</h1>

                    <p>
                        ${user.title || "—"}
                        ${user.department ? ` • ${user.department}` : ""}
                    </p>

                    <div class="teacher-profile-tags">
                        <span>📧 ${user.email || "—"}</span>
                        <span>⭐ ${rating.toFixed(1)}</span>
                        <span>📅 ${getTranslation(lang, "teacher_profile.since")} ${user.regYear || "—"}</span>
                    </div>
                </div>
            </header>

            <section class="teacher-profile-stats">
                <div class="teacher-profile-stat">
                    <span>📚</span>
                    <div>
                        <strong>${activeCourses}</strong>
                        <p>${getTranslation(lang, "teacher_profile.stat_courses")}</p>
                    </div>
                </div>

                <div class="teacher-profile-stat">
                    <span>👥</span>
                    <div>
                        <strong>${totalStudents}</strong>
                        <p>${getTranslation(lang, "teacher_profile.stat_students")}</p>
                    </div>
                </div>

                <div class="teacher-profile-stat">
                    <span>⏳</span>
                    <div>
                        <strong>${pendingGrading}</strong>
                        <p>${getTranslation(lang, "teacher_profile.stat_pending")}</p>
                    </div>
                </div>

                <div class="teacher-profile-stat">
                    <span>✅</span>
                    <div>
                        <strong>${gradedCount}</strong>
                        <p>${getTranslation(lang, "teacher_profile.stat_graded")}</p>
                    </div>
                </div>
            </section>

            <section class="teacher-profile-layout">
                <div class="teacher-profile-card">
                    <div class="teacher-profile-card-header">
                        <h2>${getTranslation(lang, "teacher_profile.info_title")}</h2>
                    </div>

                    <div class="teacher-profile-info-grid">
                        <div>
                            <span>${getTranslation(lang, "teacher_profile.full_name")}</span>
                            <strong>${user.full_name || "—"}</strong>
                        </div>

                        <div>
                            <span>Email</span>
                            <strong>${user.email || "—"}</strong>
                        </div>

                        <div>
                            <span>${getTranslation(lang, "teacher_profile.title")}</span>
                            <strong>${user.title || "—"}</strong>
                        </div>

                        <div>
                            <span>${getTranslation(lang, "teacher_profile.department")}</span>
                            <strong>${user.department || "—"}</strong>
                        </div>

                        <div>
                            <span>${getTranslation(lang, "teacher_profile.rating")}</span>
                            <strong>${rating.toFixed(1)}</strong>
                        </div>

                        <div>
                            <span>${getTranslation(lang, "teacher_profile.registration_year")}</span>
                            <strong>${user.regYear || "—"}</strong>
                        </div>
                    </div>
                </div>

                <div class="teacher-profile-card">
                    <div class="teacher-profile-card-header">
                        <h2>${getTranslation(lang, "teacher_profile.courses_title")}</h2>
                    </div>

                    ${renderCourses(courses)}
                </div>
            </section>
        `;
    }

    function renderCourses(courses) {
        const lang = getCurrentLang();

        if (!courses.length) {
            return `
                <p class="teacher-profile-empty-line">
                    ${getTranslation(lang, "teacher_profile.no_courses")}
                </p>
            `;
        }

        return `
            <div class="teacher-profile-courses">
                ${courses.map(course => {
                    const progress = Math.round(Number(course.group_avg_progress || 0));
                    const accent = course.color_accent || "#E8A44A";

                    return `
                        <article class="teacher-profile-course" style="--course-accent: ${accent}">
                            <div>
                                <h3>${course.title || getTranslation(lang, "teacher_courses.untitled_course")}</h3>
                                <p>
                                    ${Number(course.students_count || 0)}
                                    ${getTranslation(lang, "teacher_courses.students_label")}
                                    ·
                                    ${Number(course.tasks_count || 0)}
                                    ${getTranslation(lang, "teacher_courses.tasks_label")}
                                </p>
                            </div>

                            <div class="teacher-profile-course-progress">
                                <strong>${progress}%</strong>
                                <span>${getTranslation(lang, "teacher_profile.progress_label")}</span>
                            </div>
                        </article>
                    `;
                }).join("")}
            </div>
        `;
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadProfile();
});