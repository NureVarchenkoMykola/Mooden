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

    let allGrades = [];

    function formatDate(dateValue) {
        if (!dateValue) return "—";
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return dateValue;

        const lang = document.documentElement.lang || "uk";
        return date.toLocaleDateString(lang === "en" ? "en-US" : "uk-UA", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function getGradeClass(grade) {
        const value = Number(grade);
        if (Number.isNaN(value) || grade === null) return "";
        if (value >= 90) return "high";
        if (value >= 75) return "medium";
        if (value >= 60) return "low";
        return "fail";
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
            const colors = ["#FFD54A", "#4EC9A4", "#6C63FF", "#FF8A3D", "#4DA3FF", "#FF5EA8"];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        }

        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1800);
    }

    function launchPerfectGradeEffect(element) {
        if (!element || element.dataset.effectLocked === "1") return;

        element.dataset.effectLocked = "1";
        setTimeout(() => { element.dataset.effectLocked = "0"; }, 900);

        const rect = element.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        for (let i = 0; i < 18; i++) {
            createCelebrationParticle("confetti", startX, startY);
        }
        for (let i = 0; i < 5; i++) {
            setTimeout(() => { createCelebrationParticle("bee", startX, startY); }, i * 80);
        }
    }

    function bindPerfectGradeHoverEffects() {
        document.querySelectorAll(".perfect-grade").forEach(element => {
            if (element.dataset.effectBound === "1") return;
            element.dataset.effectBound = "1";
            element.addEventListener("mouseenter", () => launchPerfectGradeEffect(element));
        });
    }

    async function loadGrades() {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const lang = document.documentElement.lang || "uk";

        if (!token) {
            showEmptyState(getTranslation(lang, "errors.UNAUTHORIZED"), "");
            return;
        }

        try {
            gradesTableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-grades">
                            <h3>${getTranslation(lang, "profile.loading")}</h3>
                            <p>${getTranslation(lang, "dashboard.status_loading")}</p>
                        </div>
                    </td>
                </tr>
            `;

            const response = await fetch(`${API_BASE_URL}/student/grades`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                showToast(getTranslation(lang, `errors.${errorData.message}`), 'error');
                console.error(`[Dev Mode] Grades API error. Status: ${response.status}, Code: ${errorData.message}`);

                if (response.status === 401 || response.status === 403) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '../index.html';
                }
                showEmptyState(getTranslation(lang, "grades.empty_title"), getTranslation(lang, "errors.SERVER_ERROR_PROFILE"));
                return;
            }

            const data = await response.json();
            allGrades = data.grades || [];

            renderStats(data.stats);
            fillCourseFilter(allGrades, lang);
            renderGradesTable(allGrades, lang);
            renderCourseProgress(allGrades, lang);

        } catch (error) {
            console.error("[Dev Mode] Critical failure during grades load:", error);
            showToast(getTranslation(lang, 'errors.UNKNOWN_ERROR'), 'error');
            showEmptyState(getTranslation(lang, "grades.empty_title"), getTranslation(lang, "errors.SERVER_ERROR_PROFILE"));
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
        if (courseProgressList) courseProgressList.innerHTML = "";
        if (avgGradeValue) avgGradeValue.textContent = "—";
        if (gradedTasksValue) gradedTasksValue.textContent = "0";
        if (coursesCountValue) coursesCountValue.textContent = "0";
        if (bestGradeValue) {
            bestGradeValue.textContent = "—";
            bestGradeValue.classList.remove("perfect-grade");
        }
    }

    function renderStats(stats) {
        if (avgGradeValue) avgGradeValue.textContent = stats.avgGrade ? stats.avgGrade.toFixed(1) : "—";
        if (gradedTasksValue) gradedTasksValue.textContent = stats.gradedCount || 0;
        if (coursesCountValue) coursesCountValue.textContent = stats.coursesCount || 0;
        
        if (bestGradeValue) {
            bestGradeValue.textContent = stats.bestGrade || "—";
            if (Number(stats.bestGrade) === 100) {
                bestGradeValue.classList.add("perfect-grade");
            } else {
                bestGradeValue.classList.remove("perfect-grade");
            }
        }
        bindPerfectGradeHoverEffects();
    }

    function fillCourseFilter(data, lang) {
        if (!gradeFilter) return;

        const currentValue = gradeFilter.value || "all";
        const uniqueCourses = [...new Set(data.map(item => item.course_title))].filter(Boolean);

        gradeFilter.innerHTML = `<option value="all">${getTranslation(lang, "grades.filter_all")}</option>`;

        uniqueCourses.forEach(course => {
            const option = document.createElement("option");
            option.value = course;
            option.textContent = course;
            gradeFilter.appendChild(option);
        });

        gradeFilter.value = uniqueCourses.includes(currentValue) ? currentValue : "all";
    }

    function renderGradesTable(dataToRender, lang) {
        gradesTableBody.innerHTML = "";

        if (dataToRender.length === 0) {
            gradesTableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-grades">
                            <h3>${getTranslation(lang, "grades.empty_title")}</h3>
                            <p>${getTranslation(lang, "grades.empty_text")}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        dataToRender.forEach(item => {
            const row = document.createElement("tr");

            const gradeValue = item.grade_value !== null ? Number(item.grade_value) : null;
            const isNumeric = gradeValue !== null && !Number.isNaN(gradeValue);
            const gradeText = isNumeric ? gradeValue : getTranslation(lang, "grades.no_grade");

            const gradeClass = getGradeClass(item.grade_value);
            const isPerfectGrade = gradeValue === 100;

            let statusClass = "passed";
            let statusKey = "grades.status_passed";

            if (isNumeric && gradeValue < 60) {
                statusClass = "failed";
                statusKey = "grades.status_failed";
            }

            row.innerHTML = `
                <td>
                    <span class="grade-course" style="color: ${item.color_accent || 'var(--text-gold)'}">
                        ${item.course_title || getTranslation(lang, "grades.course_not_specified")}
                    </span>
                </td>
                <td>
                    <span class="grade-task">${item.task_title || getTranslation(lang, "grades.task_not_specified")}</span>
                    ${item.feedback ? `<p class="grade-feedback">${item.feedback}</p>` : ""}
                </td>
                <td>${formatDate(item.created_at)}</td>
                <td>
                    <span class="grade-value ${gradeClass} ${isPerfectGrade ? "perfect-grade" : ""}">
                        ${gradeText}
                    </span>
                </td>
                <td><span class="grade-status ${statusClass}">${getTranslation(lang, statusKey)}</span></td>
            `;
            gradesTableBody.appendChild(row);
        });

        bindPerfectGradeHoverEffects();
    }

    function renderCourseProgress(data, lang) {
        if (!courseProgressList) return;

        const grouped = {};
        data.forEach(item => {
            if (!item.course_title) return;
            if (!grouped[item.course_title]) grouped[item.course_title] = [];
            
            if (item.grade_value !== null && !Number.isNaN(Number(item.grade_value))) {
                grouped[item.course_title].push(Number(item.grade_value));
            }
        });

        courseProgressList.innerHTML = "";
        const courseNames = Object.keys(grouped);

        if (courseNames.length === 0) {
            courseProgressList.innerHTML = `
                <div class="empty-grades"><p>${getTranslation(lang, "grades.empty_text")}</p></div>
            `;
            return;
        }

        courseNames.forEach(courseName => {
            const courseGrades = grouped[courseName];
            const avg = courseGrades.length
                ? Math.round(courseGrades.reduce((sum, value) => sum + value, 0) / courseGrades.length)
                : 0;

            const div = document.createElement("div");
            div.className = "course-progress-item";
            div.innerHTML = `
                <div class="course-progress-top">
                    <span class="course-progress-title">${courseName}</span>
                    <span class="course-progress-grade">${avg || "—"}</span>
                </div>
                <div class="course-progress-bar">
                    <div class="course-progress-fill" style="width: ${avg || 0}%"></div>
                </div>
            `;
            courseProgressList.appendChild(div);
        });
    }

    function applyFilters() {
        const lang = document.documentElement.lang || "uk";
        const searchValue = gradeSearch ? gradeSearch.value.toLowerCase().trim() : "";
        const selectedCourse = gradeFilter ? gradeFilter.value : "all";

        const filteredGrades = allGrades.filter(item => {
            const course = (item.course_title || "").toLowerCase();
            const task = (item.task_title || "").toLowerCase();
            const feedback = (item.feedback || "").toLowerCase();

            const matchesSearch = course.includes(searchValue) || task.includes(searchValue) || feedback.includes(searchValue);
            const matchesFilter = selectedCourse === "all" || item.course_title === selectedCourse;

            return matchesSearch && matchesFilter;
        });

        renderGradesTable(filteredGrades, lang);
    }

    if (gradeSearch) gradeSearch.addEventListener("input", applyFilters);
    if (gradeFilter) gradeFilter.addEventListener("change", applyFilters);

    document.querySelectorAll('input[name="lang"]').forEach(radio => {
        radio.addEventListener("change", () => {
            setTimeout(loadGrades, 200);
        });
    });

    loadGrades();
});