document.addEventListener("DOMContentLoaded", () => {
    const openBtn = document.getElementById("openAnnouncementModalBtn");
    const modalOverlay = document.getElementById("announcementModalOverlay");
    const closeBtn = document.getElementById("closeAnnouncementModalBtn");
    const cancelBtn = document.getElementById("cancelAnnouncementModalBtn");
    const form = document.getElementById("announcementForm");

    const courseInput = document.getElementById("announcementCourseInput");
    const titleUkInput = document.getElementById("announcementTitleUkInput");
    const titleEnInput = document.getElementById("announcementTitleEnInput");
    const contentUkInput = document.getElementById("announcementContentUkInput");
    const contentEnInput = document.getElementById("announcementContentEnInput");

    if (!openBtn || !modalOverlay || !form) {
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

    function openModal() {
        modalOverlay.classList.add("active");
        loadCoursesForAnnouncement();
    }

    function closeModal() {
        modalOverlay.classList.remove("active");
        form.reset();
    }

    async function loadCoursesForAnnouncement() {
        if (!courseInput || courseInput.dataset.loaded === "true") {
            return;
        }

        const pageRole = document.querySelector('meta[name="page-role"]')?.content || "";

        try {
            const data = await fetchJson(`${API_BASE_URL}/user/announcement-courses`);
            const courses = Array.isArray(data.courses) ? data.courses : [];

            const lang = getCurrentLang();

            const courseOptions = courses.map(course => {
                const courseTitle = lang === "en"
                    ? (course.title_en || course.title_uk)
                    : (course.title_uk || course.title_en);

                return `
                    <option value="${course.id}">
                        ${courseTitle || `Course #${course.id}`}
                    </option>
                `;
            }).join("");

            if (pageRole === "moderator") {
                courseInput.innerHTML = `
                    <option value="">${tr("announcements.course_all")}</option>
                    ${courseOptions}
                `;
            } else {
                courseInput.innerHTML = courseOptions;
            }

            if (pageRole === "teacher" && courses.length === 0) {
                courseInput.innerHTML = `
                    <option value="">${tr("announcements.no_courses_available")}</option>
                `;

                courseInput.disabled = true;
            }

            courseInput.dataset.loaded = "true";
        } catch (error) {
            console.error("[Announcements] Courses load failed:", error);
            showToast(tr("announcements.courses_load_error"), "error");
        }
    }

    async function handleAnnouncementSubmit(event) {
        event.preventDefault();

        const payload = {
            course_id: courseInput.value || null,
            title_uk: titleUkInput.value.trim(),
            title_en: titleEnInput.value.trim(),
            content_uk: contentUkInput.value.trim(),
            content_en: contentEnInput.value.trim()
        };

        const pageRole = document.querySelector('meta[name="page-role"]')?.content || "";

        if (pageRole === "teacher" && !payload.course_id) {
            showToast(tr("announcements.course_required_for_teacher"), "error");
            return;
        }

        if (
            !payload.title_uk ||
            !payload.title_en ||
            !payload.content_uk ||
            !payload.content_en
        ) {
            showToast(tr("announcements.fields_required"), "error");
            return;
        }

        try {
            await fetchJson(`${API_BASE_URL}/user/announcements`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showToast(tr("announcements.create_success"), "success");

            closeModal();

            if (typeof loadAnnouncements === "function") {
                await loadAnnouncements();
            }
        } catch (error) {
            console.error("[Announcements] Create failed:", error);

            if (error.message === "ANNOUNCEMENT_FIELDS_REQUIRED") {
                showToast(tr("announcements.fields_required"), "error");
                return;
            }

            if (error.message === "COURSE_REQUIRED_FOR_TEACHER") {
                showToast(tr("announcements.course_required_for_teacher"), "error");
                return;
            }

            if (error.message === "COURSE_NOT_FOUND") {
                showToast(tr("errors.COURSE_NOT_FOUND"), "error");
                return;
            }

            showToast(tr("announcements.create_error"), "error");
        }
    }

    openBtn.addEventListener("click", openModal);
    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);
    form.addEventListener("submit", handleAnnouncementSubmit);

    modalOverlay.addEventListener("click", event => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });
});