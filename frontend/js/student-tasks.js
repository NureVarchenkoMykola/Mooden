document.addEventListener("DOMContentLoaded", () => {
    const tasksList = document.getElementById("tasksList");
    const taskSearch = document.getElementById("taskSearch");
    const taskFilter = document.getElementById("taskFilter");

    const totalTasks = document.getElementById("totalTasks");
    const pendingTasks = document.getElementById("pendingTasks");
    const completedTasksPage = document.getElementById("completedTasksPage");
    const avgTaskGrade = document.getElementById("avgTaskGrade");

    if (!tasksList) {
        console.error("Не знайдено елемент #tasksList");
        return;
    }

    let tasks = [];

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
            return translate("tasks.no_deadline", "Дедлайн не вказано");
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

    function isOverdue(dateValue) {
        if (!dateValue) {
            return false;
        }

        const deadline = new Date(dateValue);

        if (Number.isNaN(deadline.getTime())) {
            return false;
        }

        return deadline < new Date();
    }

    function getTaskStatus(task) {
        if (task.status) {
            return task.status;
        }

        if (task.grade !== null && task.grade !== undefined) {
            return "graded";
        }

        if (isOverdue(task.deadline)) {
            return "overdue";
        }

        return "pending";
    }

    function getStatusText(status) {
        if (status === "submitted") {
            return translate("tasks.status_submitted", "Здано");
        }

        if (status === "graded") {
            return translate("tasks.status_graded", "Оцінено");
        }

        if (status === "overdue") {
            return translate("tasks.status_overdue", "Прострочено");
        }

        return translate("tasks.status_pending", "Очікує");
    }

    function getLocalizedField(item, fieldName) {
        const lang = getCurrentLang();

        return (
            item[`${fieldName}_${lang}`] ||
            item[`${fieldName}_uk`] ||
            item[`${fieldName}_en`] ||
            item[fieldName] ||
            ""
        );
    }

    function normalizeTask(task, index) {
        const title =
            task.title ||
            task.task_title ||
            getLocalizedField(task, "title") ||
            translate("tasks.unknown_task", "Завдання без назви");

        const description =
            task.description ||
            task.task_description ||
            getLocalizedField(task, "description") ||
            "";

        const courseName =
            task.course_name ||
            task.course_title ||
            task.course ||
            getLocalizedField(task, "course") ||
            translate("tasks.course_not_specified", "Курс не вказано");

        const deadline =
            task.deadline ||
            task.due_date ||
            task.deadline_at ||
            null;

        const grade =
            task.grade ??
            task.grade_value ??
            null;

        const normalizedTask = {
            id: task.id || task.task_id || index + 1,
            title,
            description,
            courseName,
            deadline,
            grade,
            isExam: Boolean(task.is_exam),
            colorAccent: task.color_accent || task.color || null,
            status: task.status || null
        };

        normalizedTask.status = getTaskStatus(normalizedTask);

        return normalizedTask;
    }

    async function loadTasks() {
        const token = getToken();

        if (!token) {
            tasksList.innerHTML = `
                <div class="empty-tasks">
                    <h3>${translate("errors.UNAUTHORIZED", "Ви не авторизовані")}</h3>
                </div>
            `;
            return;
        }

        try {
            tasksList.innerHTML = `
                <div class="empty-tasks">
                    <h3>${translate("profile.loading", "Завантаження...")}</h3>
                    <p>${translate("dashboard.status_loading", "Отримуємо актуальну інформацію...")}</p>
                </div>
            `;

            const response = await fetch(`${API_BASE_URL}/student/dashboard`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Dashboard API error: ${response.status}`);
            }

            const data = await response.json();

            console.log("DASHBOARD DATA:", data);
            console.log("TASKS FROM API:", data.tasks);
            console.log("DEADLINES FROM API:", data.deadlines);

            const backendTasks = Array.isArray(data.tasks)
                ? data.tasks
                : Array.isArray(data.deadlines)
                    ? data.deadlines
                    : [];

            tasks = backendTasks.map(normalizeTask);

            updateStats();
            renderTasks();
        } catch (error) {
            console.error("[Tasks Page] Не вдалося завантажити завдання:", error);

            tasksList.innerHTML = `
                <div class="empty-tasks">
                    <h3>${translate("tasks.empty_title", "Завдань не знайдено")}</h3>
                    <p>${translate("errors.SERVER_ERROR_DASHBOARD", "Не вдалося завантажити дані панелі.")}</p>
                </div>
            `;
        }
    }

    function updateStats() {
        const pendingCount = tasks.filter(task => {
            return task.status === "pending" || task.status === "overdue";
        }).length;

        const completedCount = tasks.filter(task => {
            return task.status === "submitted" || task.status === "graded";
        }).length;

        const gradedTasks = tasks.filter(task => {
            return typeof task.grade === "number";
        });

        const avgGrade = gradedTasks.length
            ? Math.round(
                gradedTasks.reduce((sum, task) => sum + Number(task.grade), 0) / gradedTasks.length
            )
            : 0;

        if (totalTasks) {
            totalTasks.textContent = tasks.length;
        }

        if (pendingTasks) {
            pendingTasks.textContent = pendingCount;
        }

        if (completedTasksPage) {
            completedTasksPage.textContent = completedCount;
        }

        if (avgTaskGrade) {
            avgTaskGrade.textContent = avgGrade || "—";
        }
    }

    function renderTasks() {
        const searchValue = taskSearch ? taskSearch.value.toLowerCase().trim() : "";
        const selectedFilter = taskFilter ? taskFilter.value : "all";

        const filteredTasks = tasks.filter(task => {
            const title = task.title.toLowerCase();
            const course = task.courseName.toLowerCase();
            const description = task.description.toLowerCase();

            const matchesSearch =
                title.includes(searchValue) ||
                course.includes(searchValue) ||
                description.includes(searchValue);

            const matchesFilter =
                selectedFilter === "all" || task.status === selectedFilter;

            return matchesSearch && matchesFilter;
        });

        tasksList.innerHTML = "";

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-tasks">
                    <h3>${translate("tasks.empty_title", "Завдань не знайдено")}</h3>
                    <p>${translate("tasks.empty_text", "Спробуйте змінити пошук або фільтр.")}</p>
                </div>
            `;
            return;
        }

        filteredTasks.forEach(task => {
            const card = document.createElement("article");
            card.className = `task-card ${task.status}`;

            if (task.colorAccent) {
                card.style.setProperty("--task-accent", task.colorAccent);
            }

            const gradeText =
                task.grade === null || task.grade === undefined
                    ? translate("tasks.no_grade", "Немає")
                    : task.grade;

            const descriptionHtml = task.description
                ? `<p class="task-description">${task.description}</p>`
                : "";

            const examBadge = task.isExam
                ? `<span class="task-exam-badge">${translate("tasks.exam", "Іспит")}</span>`
                : "";

            card.innerHTML = `
                <div class="task-main">
                    <div class="task-top">
                        <span class="task-course">${task.courseName}</span>
                        ${examBadge}
                        <span class="task-status ${task.status}">
                            ${getStatusText(task.status)}
                        </span>
                    </div>

                    <h2 class="task-title">${task.title}</h2>

                    ${descriptionHtml}

                    <div class="task-meta">
                        <span>
                            ${translate("tasks.deadline", "Дедлайн")}:
                            <strong>${formatDate(task.deadline)}</strong>
                        </span>

                        <span>
                            ${translate("tasks.grade", "Оцінка")}:
                            <strong>${gradeText}</strong>
                        </span>
                    </div>
                </div>

                <div class="task-actions">
                    <button class="task-btn" type="button">
                        ${translate("tasks.open_btn", "Відкрити")}
                    </button>
                </div>
            `;

            const button = card.querySelector(".task-btn");

            button.addEventListener("click", () => {
                alert(`${translate("tasks.open_btn", "Відкрити")}: ${task.title}`);
            });

            tasksList.appendChild(card);
        });
    }

    function updatePageAfterLanguageChange() {
        applyPageTranslations();
        loadTasks();
    }

    if (taskSearch) {
        taskSearch.addEventListener("input", renderTasks);
    }

    if (taskFilter) {
        taskFilter.addEventListener("change", renderTasks);
    }

    document.querySelectorAll('input[name="lang"]').forEach(radio => {
        radio.addEventListener("change", () => {
            setTimeout(updatePageAfterLanguageChange, 200);
        });
    });

    applyPageTranslations();
    loadTasks();
});