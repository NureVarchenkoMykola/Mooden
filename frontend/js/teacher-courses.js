document.addEventListener("DOMContentLoaded", () => {
    const coursesList = document.getElementById("teacherCoursesList");
    const searchInput = document.getElementById("courseSearch");
    const sortSelect = document.getElementById("courseSort");

    const totalCoursesEl = document.getElementById("totalCourses");
    const totalStudentsEl = document.getElementById("totalStudents");
    const totalTasksEl = document.getElementById("totalTasks");
    const avgProgressEl = document.getElementById("avgProgress");

    let courses = [];

    if (!coursesList) {
        console.error("Не знайдено елемент #teacherCoursesList");
        return;
    }

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
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
        coursesList.innerHTML = `
            <div class="teacher-courses-empty">
                <h2>${title}</h2>
                ${text ? `<p>${text}</p>` : ""}
            </div>
        `;
    }

    async function loadCourses() {
        const lang = getCurrentLang();
        const token = getToken();

        if (!token) {
            showEmpty(getTranslation(lang, "errors.UNAUTHORIZED"), "");
            return;
        }

        try {
            coursesList.innerHTML = `
                <div class="teacher-courses-loading">
                    <h2>${getTranslation(lang, "profile.loading")}</h2>
                    <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/teacher/courses`, token);

            courses = Array.isArray(data.courses) ? data.courses : [];

            updateStats(courses);
            renderCourses();
        } catch (error) {
            console.error("[Teacher Courses] Не вдалося завантажити курси:", error);

            showEmpty(
                getTranslation(lang, "teacher_courses.unavailable_title"),
                getTranslation(lang, "teacher_courses.unavailable_text")
            );
        }
    }

    function updateStats(items) {
        const totalCourses = items.length;

        const totalStudents = items.reduce((sum, course) => {
            return sum + Number(course.students_count || 0);
        }, 0);

        const totalTasks = items.reduce((sum, course) => {
            return sum + Number(course.tasks_count || 0);
        }, 0);

        const avgProgress = items.length
            ? Math.round(
                items.reduce((sum, course) => {
                    return sum + Number(course.group_avg_progress || 0);
                }, 0) / items.length
            )
            : 0;

        totalCoursesEl.textContent = totalCourses;
        totalStudentsEl.textContent = totalStudents;
        totalTasksEl.textContent = totalTasks;
        avgProgressEl.textContent = `${avgProgress}%`;
    }

    function getFilteredCourses() {
        const query = String(searchInput?.value || "").trim().toLowerCase();
        const sortValue = sortSelect?.value || "default";

        let result = [...courses];

        if (query) {
            result = result.filter(course => {
                const title = String(course.title || "").toLowerCase();
                const description = String(course.description || "").toLowerCase();

                return title.includes(query) || description.includes(query);
            });
        }

        if (sortValue === "progress_desc") {
            result.sort((a, b) => Number(b.group_avg_progress || 0) - Number(a.group_avg_progress || 0));
        }

        if (sortValue === "progress_asc") {
            result.sort((a, b) => Number(a.group_avg_progress || 0) - Number(b.group_avg_progress || 0));
        }

        if (sortValue === "students_desc") {
            result.sort((a, b) => Number(b.students_count || 0) - Number(a.students_count || 0));
        }

        if (sortValue === "tasks_desc") {
            result.sort((a, b) => Number(b.tasks_count || 0) - Number(a.tasks_count || 0));
        }

        return result;
    }

    function renderCourses() {
        const lang = getCurrentLang();
        const filteredCourses = getFilteredCourses();

        if (!filteredCourses.length) {
            showEmpty(
                getTranslation(lang, "teacher_courses.empty_title"),
                getTranslation(lang, "teacher_courses.empty_text")
            );
            return;
        }

        coursesList.innerHTML = filteredCourses.map(course => {
            const progress = Math.round(Number(course.group_avg_progress || 0));
            const accent = course.color_accent || "#E8A44A";

            return `
                <article class="teacher-course-card" style="--course-accent: ${accent}">
                    <div class="teacher-course-top">
                        <div class="teacher-course-icon">📚</div>

                        <span class="teacher-course-progress">
                            ${progress}%
                        </span>
                    </div>

                    <h2>${course.title || getTranslation(lang, "teacher_courses.untitled_course")}</h2>

                    <p class="teacher-course-description">
                        ${course.description || getTranslation(lang, "teacher_courses.no_description")}
                    </p>

                    <div class="teacher-course-progress-bar">
                        <div class="teacher-course-progress-fill" style="width: ${progress}%"></div>
                    </div>

                    <div class="teacher-course-meta">
                        <div>
                            <strong>${Number(course.students_count || 0)}</strong>
                            <span>${getTranslation(lang, "teacher_courses.students_label")}</span>
                        </div>

                        <div>
                            <strong>${Number(course.tasks_count || 0)}</strong>
                            <span>${getTranslation(lang, "teacher_courses.tasks_label")}</span>
                        </div>
                    </div>

                    <button class="teacher-course-open-btn" type="button" data-course-id="${course.id}">
                        ${getTranslation(lang, "teacher_courses.open_btn")}
                    </button>
                </article>
            `;
        }).join("");

        bindCourseButtons();
    }

    function bindCourseButtons() {
        document.querySelectorAll(".teacher-course-open-btn").forEach(button => {
            button.addEventListener("click", () => {
                const courseId = button.dataset.courseId;
                window.location.href = `./teacher-course-detail.html?id=${courseId}`;
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderCourses);
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", renderCourses);
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadCourses();
});