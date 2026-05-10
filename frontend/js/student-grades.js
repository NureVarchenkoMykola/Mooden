document.addEventListener("DOMContentLoaded", () => {
    const gradesTableBody = document.getElementById("gradesTableBody");
    const courseProgressList = document.getElementById("courseProgressList");
    const gradeSearch = document.getElementById("gradeSearch");
    const gradeFilter = document.getElementById("gradeFilter");

    const avgGradeValue = document.getElementById("avgGradeValue");
    const gradedTasksValue = document.getElementById("gradedTasksValue");
    const coursesCountValue = document.getElementById("coursesCountValue");
    const bestGradeValue = document.getElementById("bestGradeValue");

    if (!gradesTableBody) {
        console.error("Не знайдено елемент #gradesTableBody");
        return;
    }

    let grades = [];

    function getToken() {
        return localStorage.getItem("token") || sessionStorage.getItem("token");
    }

    function getCurrentLang() {
        return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
    }

    function translate(key, fallback = "") {
        const lang = getCurrentLang();
        const parts = key.split(".");

        let value = translations?.[lang];

        for (const part of parts) {
            if (!value || value[part] === undefined) {
                value = null;
                break;
            }

            value = value[part];
        }

        if (value) {
            return value;
        }

        let fallbackValue = translations?.uk;

        for (const part of parts) {
            if (!fallbackValue || fallbackValue[part] === undefined) {
                fallbackValue = null;
                break;
            }

            fallbackValue = fallbackValue[part];
        }

        return fallbackValue || fallback || key;
    }

    function applyPageTranslations() {
        document.querySelectorAll("[data-i18n]").forEach(element => {
            const key = element.getAttribute("data-i18n");
            const translatedText = translate(key);

            if (translatedText) {
                element.textContent = translatedText;
            }
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
            const key = element.getAttribute("data-i18n-placeholder");
            const translatedText = translate(key);

            if (translatedText) {
                element.setAttribute("placeholder", translatedText);
            }
        });
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        const lang = getCurrentLang();

        return date.toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function getGradeClass(grade) {
        const value = Number(grade);

        if (Number.isNaN(value)) {
            return "";
        }

        if (value >= 90) {
            return "high";
        }

        if (value >= 75) {
            return "medium";
        }

        return "low";
    }

    function randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    function createCelebrationParticle(type, x, y) {
        const particle = document.createElement("div");
        particle.classList.add("celebration-particle");

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;

        const dx = `${randomBetween(-140, 140)}px`;
        const dy = `${randomBetween(-170, -40)}px`;
        const rot = `${randomBetween(-300, 300)}deg`;
        const dur = `${randomBetween(900, 1500)}ms`;

        particle.style.setProperty("--dx", dx);
        particle.style.setProperty("--dy", dy);
        particle.style.setProperty("--rot", rot);
        particle.style.setProperty("--dur", dur);

        if (type === "bee") {
            particle.classList.add("bee-particle");
            particle.textContent = "🐝";
        } else {
            particle.classList.add("confetti-piece");

            const colors = [
                "#FFD54A",
                "#4EC9A4",
                "#6C63FF",
                "#FF8A3D",
                "#4DA3FF",
                "#FF5EA8"
            ];

            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        }

        document.body.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 1800);
    }

    function launchPerfectGradeEffect(element) {
        if (!element) return;

        if (element.dataset.effectLocked === "1") {
            return;
        }

        element.dataset.effectLocked = "1";

        setTimeout(() => {
            element.dataset.effectLocked = "0";
        }, 900);

        const rect = element.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        for (let i = 0; i < 18; i++) {
            createCelebrationParticle("confetti", startX, startY);
        }

        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                createCelebrationParticle("bee", startX, startY);
            }, i * 80);
        }
    }

    function bindPerfectGradeHoverEffects() {
        document.querySelectorAll(".perfect-grade").forEach(element => {
            if (element.dataset.effectBound === "1") {
                return;
            }

            element.dataset.effectBound = "1";

            element.addEventListener("mouseenter", () => {
                launchPerfectGradeEffect(element);
            });
        });
    }

    function normalizeGrade(item, index) {
        const gradeValue =
            item.grade_value ??
            item.grade ??
            item.value ??
            null;

        const courseTitle =
            item.course_title ||
            item.course_name ||
            item.course ||
            translate("grades.course_not_specified", "Курс не вказано");

        const taskTitle =
            item.task_title ||
            item.task_name ||
            item.task ||
            translate("grades.task_not_specified", "Завдання не вказано");

        return {
            id: item.id || `${item.student_id || "student"}-${item.task_id || index}`,
            studentId: item.student_id || null,
            taskId: item.task_id || null,
            courseTitle,
            taskTitle,
            gradeValue: gradeValue === null ? null : Number(gradeValue),
            feedback: item.feedback || "",
            createdAt: item.created_at || item.date || null,
            colorAccent: item.color_accent || item.color || null
        };
    }

    async function loadGrades() {
        const token = getToken();

        if (!token) {
            showEmptyState(
                translate("errors.UNAUTHORIZED", "Ви не авторизовані."),
                ""
            );
            return;
        }

        try {
            gradesTableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-grades">
                            <h3>${translate("profile.loading", "Завантаження...")}</h3>
                            <p>${translate("dashboard.status_loading", "Отримуємо актуальну інформацію...")}</p>
                        </div>
                    </td>
                </tr>
            `;

            const response = await fetch(`${API_BASE_URL}/student/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Profile API error: ${response.status}`);
            }

            const data = await response.json();

            const backendGrades = Array.isArray(data.fullGrades)
                ? data.fullGrades
                : Array.isArray(data.grades)
                    ? data.grades
                    : [];

            grades = backendGrades.map(normalizeGrade);

            fillCourseFilter();
            updateStats();
            renderGrades();
            renderCourseProgress();
            bindPerfectGradeHoverEffects();
        } catch (error) {
            console.error("[Grades Page] Не вдалося завантажити оцінки:", error);

            showEmptyState(
                translate("grades.empty_title", "Оцінок не знайдено"),
                translate("errors.SERVER_ERROR_PROFILE", "Не вдалося завантажити дані профілю")
            );
        }
    }

    function showEmptyState(title, text) {
        gradesTableBody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-grades">
                        <h3>${title}</h3>
                        ${text ? `<p>${text}</p>` : ""}
                    </div>
                </td>
            </tr>
        `;

        if (courseProgressList) {
            courseProgressList.innerHTML = "";
        }

        if (avgGradeValue) avgGradeValue.textContent = "—";
        if (gradedTasksValue) gradedTasksValue.textContent = "0";
        if (coursesCountValue) coursesCountValue.textContent = "0";
        if (bestGradeValue) {
            bestGradeValue.textContent = "—";
            bestGradeValue.classList.remove("perfect-grade");
        }
    }

    function fillCourseFilter() {
        if (!gradeFilter) {
            return;
        }

        const currentValue = gradeFilter.value || "all";
        const uniqueCourses = [...new Set(grades.map(item => item.courseTitle))];

        gradeFilter.innerHTML = `
            <option value="all">${translate("grades.filter_all", "Усі курси")}</option>
        `;

        uniqueCourses.forEach(course => {
            const option = document.createElement("option");
            option.value = course;
            option.textContent = course;
            gradeFilter.appendChild(option);
        });

        gradeFilter.value = uniqueCourses.includes(currentValue) ? currentValue : "all";
    }

    function updateStats() {
        const validGrades = grades.filter(item => {
            return typeof item.gradeValue === "number" && !Number.isNaN(item.gradeValue);
        });

        const avg = validGrades.length
            ? Math.round(validGrades.reduce((sum, item) => sum + item.gradeValue, 0) / validGrades.length)
            : 0;

        const best = validGrades.length
            ? Math.max(...validGrades.map(item => item.gradeValue))
            : 0;

        const uniqueCourses = new Set(grades.map(item => item.courseTitle));

        if (avgGradeValue) avgGradeValue.textContent = avg || "—";
        if (gradedTasksValue) gradedTasksValue.textContent = validGrades.length;
        if (coursesCountValue) coursesCountValue.textContent = uniqueCourses.size;

        if (bestGradeValue) {
            bestGradeValue.textContent = best || "—";
            bestGradeValue.classList.remove("perfect-grade");
        }
    }

    function renderGrades() {
        const searchValue = gradeSearch ? gradeSearch.value.toLowerCase().trim() : "";
        const selectedCourse = gradeFilter ? gradeFilter.value : "all";

        const filteredGrades = grades.filter(item => {
            const course = item.courseTitle.toLowerCase();
            const task = item.taskTitle.toLowerCase();
            const feedback = item.feedback.toLowerCase();

            const matchesSearch =
                course.includes(searchValue) ||
                task.includes(searchValue) ||
                feedback.includes(searchValue);

            const matchesFilter =
                selectedCourse === "all" || item.courseTitle === selectedCourse;

            return matchesSearch && matchesFilter;
        });

        gradesTableBody.innerHTML = "";

        if (filteredGrades.length === 0) {
            showEmptyState(
                translate("grades.empty_title", "Оцінок не знайдено"),
                translate("grades.empty_text", "Спробуйте змінити пошук або фільтр.")
            );
            return;
        }

        filteredGrades.forEach(item => {
            const row = document.createElement("tr");

            if (item.colorAccent) {
                row.style.setProperty("--grade-accent", item.colorAccent);
            }

            const gradeText =
                item.gradeValue === null || Number.isNaN(item.gradeValue)
                    ? translate("grades.no_grade", "Немає")
                    : item.gradeValue;

            const gradeClass = getGradeClass(item.gradeValue);
            const isPerfectGrade = item.gradeValue === 100;

            row.innerHTML = `
                <td>
                    <span class="grade-course">${item.courseTitle}</span>
                </td>

                <td>
                    <span class="grade-task">${item.taskTitle}</span>
                    ${
                        item.feedback && getCurrentLang() === "uk"
                            ? `<p class="grade-feedback">${item.feedback}</p>`
                            : ""
                    }
                </td>

                <td>${formatDate(item.createdAt)}</td>

                <td>
                    <span class="grade-value ${gradeClass} ${isPerfectGrade ? "perfect-grade" : ""}">
                        ${gradeText}
                    </span>
                </td>

                <td>
                    <span class="grade-status passed">
                        ${translate("grades.status_passed", "Зараховано")}
                    </span>
                </td>
            `;

            gradesTableBody.appendChild(row);
        });

        bindPerfectGradeHoverEffects();
    }

    function renderCourseProgress() {
        if (!courseProgressList) {
            return;
        }

        const grouped = {};

        grades.forEach(item => {
            if (!grouped[item.courseTitle]) {
                grouped[item.courseTitle] = [];
            }

            if (typeof item.gradeValue === "number" && !Number.isNaN(item.gradeValue)) {
                grouped[item.courseTitle].push(item.gradeValue);
            }
        });

        courseProgressList.innerHTML = "";

        const courseNames = Object.keys(grouped);

        if (courseNames.length === 0) {
            courseProgressList.innerHTML = `
                <div class="empty-grades">
                    <p>${translate("grades.empty_text", "Оцінок поки немає.")}</p>
                </div>
            `;
            return;
        }

        courseNames.forEach(courseName => {
            const courseGrades = grouped[courseName];

            const avg = courseGrades.length
                ? Math.round(courseGrades.reduce((sum, value) => sum + value, 0) / courseGrades.length)
                : 0;

            const item = document.createElement("div");
            item.className = "course-progress-item";

            item.innerHTML = `
                <div class="course-progress-top">
                    <span class="course-progress-title">${courseName}</span>
                    <span class="course-progress-grade">${avg || "—"}</span>
                </div>

                <div class="course-progress-bar">
                    <div class="course-progress-fill" style="width: ${avg || 0}%"></div>
                </div>
            `;

            courseProgressList.appendChild(item);
        });
    }

    function updatePageAfterLanguageChange() {
        applyPageTranslations();
        loadGrades();
    }

    if (gradeSearch) {
        gradeSearch.addEventListener("input", renderGrades);
    }

    if (gradeFilter) {
        gradeFilter.addEventListener("change", renderGrades);
    }

    document.querySelectorAll('input[name="lang"]').forEach(radio => {
        radio.addEventListener("change", () => {
            setTimeout(updatePageAfterLanguageChange, 200);
        });
    });

    applyPageTranslations();
    loadGrades();
});