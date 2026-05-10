document.addEventListener("DOMContentLoaded", () => {
    const coursesGrid = document.getElementById("coursesGrid");
    const courseSearch = document.getElementById("courseSearch");
    const courseFilter = document.getElementById("courseFilter");

    if (!coursesGrid) {
        console.error("Не знайдено елемент #coursesGrid");
        return;
    }

    let courses = [];

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

        return fallbackValue || fallback;
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

    function getCourseIcon(index) {
        const icons = ["📚", "🗄️", "💻", "🏗️", "🧠", "🌍"];
        return icons[index % icons.length];
    }

    function getCourseProgress(course) {
        return Number(
            course.progress_percent ??
            course.progress ??
            course.progressPercent ??
            0
        );
    }

    function getCourseStatus(progress) {
        if (progress >= 100) {
            return "completed";
        }

        return "active";
    }

    function getStatusText(status) {
        if (status === "completed") {
            return translate("courses.status_completed", "Завершений");
        }

        if (status === "new") {
            return translate("courses.status_new", "Новий");
        }

        return translate("courses.status_active", "Активний");
    }

    function normalizeCourse(course, index) {
        const lang = getCurrentLang();
        const progress = getCourseProgress(course);

        const title =
            course.title ||
            course[`title_${lang}`] ||
            course.title_uk ||
            course.title_en ||
            translate("courses.unknown_course", "Курс без назви");

        const description =
            course.description ||
            course[`description_${lang}`] ||
            course.description_uk ||
            course.description_en ||
            "";

        return {
            id: course.id || course.course_id || index + 1,
            title,
            description,
            progress,
            status: getCourseStatus(progress),
            icon: course.icon || getCourseIcon(index),
            colorAccent: course.color_accent || course.color || null
        };
    }

    async function loadCourses() {
        const token = getToken();

        if (!token) {
            coursesGrid.innerHTML = `
                <div class="empty-courses">
                    <h3>${translate("errors.UNAUTHORIZED", "Ви не авторизовані")}</h3>
                </div>
            `;
            return;
        }

        try {
            coursesGrid.innerHTML = `
                <div class="empty-courses">
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

            courses = Array.isArray(data.courses)
                ? data.courses.map(normalizeCourse)
                : [];

            renderCourses();
        } catch (error) {
            console.error("[Courses Page] Не вдалося завантажити курси:", error);

            coursesGrid.innerHTML = `
                <div class="empty-courses">
                    <h3>${translate("courses.empty_title", "Курсів не знайдено")}</h3>
                    <p>${translate("errors.SERVER_ERROR_DASHBOARD", "Не вдалося завантажити дані панелі.")}</p>
                </div>
            `;
        }
    }

    function renderCourses() {
        const searchValue = courseSearch ? courseSearch.value.toLowerCase().trim() : "";
        const selectedFilter = courseFilter ? courseFilter.value : "all";

        const filteredCourses = courses.filter(course => {
            const title = course.title.toLowerCase();
            const description = course.description.toLowerCase();

            const matchesSearch =
                title.includes(searchValue) ||
                description.includes(searchValue);

            const matchesFilter =
                selectedFilter === "all" || course.status === selectedFilter;

            return matchesSearch && matchesFilter;
        });

        coursesGrid.innerHTML = "";

        if (filteredCourses.length === 0) {
            coursesGrid.innerHTML = `
                <div class="empty-courses">
                    <h3>${translate("courses.empty_title", "Курсів не знайдено")}</h3>
                    <p>${translate("courses.empty_text", "Спробуйте змінити пошук або фільтр.")}</p>
                </div>
            `;
            return;
        }

        filteredCourses.forEach(course => {
            const card = document.createElement("article");
            card.className = `course-card ${course.status}`;

            if (course.colorAccent) {
                card.style.setProperty("--course-accent", course.colorAccent);
            }

            const descriptionHtml = course.description
                ? `<p class="course-description">${course.description}</p>`
                : `<p class="course-description muted-description">${translate("courses.short_backend_desc", "Деталі курсу доступні у навчальному кабінеті.")}</p>`;

            card.innerHTML = `
                <div class="course-top">
                    <div class="course-icon">${course.icon}</div>

                    <span class="course-status ${course.status}">
                        ${getStatusText(course.status)}
                    </span>
                </div>

                <h2 class="course-title">${course.title}</h2>

                ${descriptionHtml}

                <div class="progress-info">
                    <span>${translate("courses.progress", "Прогрес")}</span>
                    <strong>${course.progress}%</strong>
                </div>

                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${course.progress}%"></div>
                </div>

                <div class="course-footer">
                    <span class="course-deadline">
                        ${course.progress >= 100
                            ? translate("courses.course_finished", "Курс завершено")
                            : translate("courses.in_progress", "Курс у процесі проходження")
                        }
                    </span>

                    <button class="open-course-btn" type="button">
                        ${translate("courses.open_btn", "Відкрити")}
                    </button>
                </div>
            `;

            const openButton = card.querySelector(".open-course-btn");

            openButton.addEventListener("click", () => {
                window.location.href = `./student-course-detail.html?id=${course.id}`;
            });

            coursesGrid.appendChild(card);
        });
    }

    function updatePageAfterLanguageChange() {
        applyPageTranslations();
        loadCourses();
    }

    if (courseSearch) {
        courseSearch.addEventListener("input", renderCourses);
    }

    if (courseFilter) {
        courseFilter.addEventListener("change", renderCourses);
    }

    document.querySelectorAll('input[name="lang"]').forEach(radio => {
        radio.addEventListener("change", () => {
            setTimeout(updatePageAfterLanguageChange, 200);
        });
    });

    applyPageTranslations();
    loadCourses();
});