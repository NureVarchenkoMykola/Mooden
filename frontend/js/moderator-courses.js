document.addEventListener("DOMContentLoaded", () => {
    const coursesList = document.getElementById("coursesList");
    const courseSearch = document.getElementById("courseSearch");
    const courseSort = document.getElementById("courseSort");

    const totalCoursesEl = document.getElementById("totalCourses");
    const totalStudentsOnCoursesEl = document.getElementById("totalStudentsOnCourses");
    const totalTeachersOnCoursesEl = document.getElementById("totalTeachersOnCourses");
    const totalTasksEl = document.getElementById("totalTasks");

    const courseModalOverlay = document.getElementById("courseModalOverlay");
    const closeCourseModalBtn = document.getElementById("closeCourseModalBtn");
    const cancelCourseModalBtn = document.getElementById("cancelCourseModalBtn");
    const courseForm = document.getElementById("courseForm");

    const courseIdInput = document.getElementById("courseIdInput");
    const courseTitleUkInput = document.getElementById("courseTitleUkInput");
    const courseTitleEnInput = document.getElementById("courseTitleEnInput");
    const courseDescriptionUkInput = document.getElementById("courseDescriptionUkInput");
    const courseDescriptionEnInput = document.getElementById("courseDescriptionEnInput");
    const courseColorInput = document.getElementById("courseColorInput");

    const membersModalOverlay = document.getElementById("membersModalOverlay");
    const closeMembersModalBtn = document.getElementById("closeMembersModalBtn");
    const membersModalTitle = document.getElementById("membersModalTitle");
    const membersCourseIdInput = document.getElementById("membersCourseIdInput");

    const studentSelect = document.getElementById("studentSelect");
    const teacherSelect = document.getElementById("teacherSelect");
    const addStudentBtn = document.getElementById("addStudentBtn");
    const addTeacherBtn = document.getElementById("addTeacherBtn");

    const courseStudentsList = document.getElementById("courseStudentsList");
    const courseTeachersList = document.getElementById("courseTeachersList");

    let courses = [];
    let users = [];
    let currentMembers = {
        students: [],
        teachers: []
    };

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

    function showMessage(message, type = "success") {
        if (typeof showToast === "function") {
            showToast(message, type);
        } else {
            alert(message);
        }
    }

    function normalizeCourse(course) {
        return {
            id: course.id,
            title: course.title || course.title_uk || course.title_en || tr("moderator_courses.untitled", "Курс без назви"),
            title_uk: course.title_uk || course.title || "",
            title_en: course.title_en || "",
            description: course.description || course.description_uk || course.description_en || "",
            description_uk: course.description_uk || course.description || "",
            description_en: course.description_en || "",
            color_accent: course.color_accent || "#E8A44A",
            students_count: Number(course.students_count || 0),
            teachers_count: Number(course.teachers_count || 0),
            tasks_count: Number(course.tasks_count || 0),
            is_hidden: course.is_hidden === true || course.isHidden === true
        };
    }

    function updateStats() {
        const totalCourses = courses.length;
        const totalStudents = courses.reduce((sum, course) => sum + Number(course.students_count || 0), 0);
        const totalTeachers = courses.reduce((sum, course) => sum + Number(course.teachers_count || 0), 0);
        const totalTasks = courses.reduce((sum, course) => sum + Number(course.tasks_count || 0), 0);

        totalCoursesEl.textContent = totalCourses;
        totalStudentsOnCoursesEl.textContent = totalStudents;
        totalTeachersOnCoursesEl.textContent = totalTeachers;
        totalTasksEl.textContent = totalTasks;
    }

    function getFilteredCourses() {
        const query = String(courseSearch?.value || "").trim().toLowerCase();
        const sort = courseSort?.value || "title";

        let result = [...courses];

        if (query) {
            result = result.filter(course => {
                const title = String(course.title || "").toLowerCase();
                const desc = String(course.description || "").toLowerCase();

                return title.includes(query) || desc.includes(query);
            });
        }

        result.sort((a, b) => {
            if (sort === "students") {
                return Number(b.students_count || 0) - Number(a.students_count || 0);
            }

            if (sort === "teachers") {
                return Number(b.teachers_count || 0) - Number(a.teachers_count || 0);
            }

            if (sort === "tasks") {
                return Number(b.tasks_count || 0) - Number(a.tasks_count || 0);
            }

            return String(a.title || "").localeCompare(String(b.title || ""));
        });

        return result;
    }

    function renderCourses() {
        const filteredCourses = getFilteredCourses();

        if (!filteredCourses.length) {
            coursesList.innerHTML = `
                <div class="moderator-courses-empty">
                    <h2>${tr("moderator_courses.empty_title", "Курсів не знайдено")}</h2>
                    <p>${tr("moderator_courses.empty_text", "Спробуйте змінити пошук або сортування.")}</p>
                </div>
            `;
            return;
        }

        coursesList.innerHTML = filteredCourses.map(course => `
            <article class="moderator-course-card" style="--course-accent: ${course.color_accent}">
                <div class="moderator-course-top">
                    <div class="moderator-course-icon">📚</div>

                    <span class="moderator-course-status ${course.is_hidden ? "hidden-course" : "active-course"}">
                        ${course.is_hidden
                            ? tr("moderator_courses.hidden", "Прихований")
                            : tr("moderator_courses.active", "Активний")
                        }
                    </span>
                </div>

                <h2>${course.title}</h2>

                <p class="moderator-course-description">
                    ${course.description || tr("moderator_courses.no_description", "Опис курсу не вказано.")}
                </p>

                <div class="moderator-course-meta">
                    <div>
                        <strong>${course.students_count}</strong>
                        <span>${tr("moderator_courses.students", "студентів")}</span>
                    </div>

                    <div>
                        <strong>${course.teachers_count}</strong>
                        <span>${tr("moderator_courses.teachers", "викладачів")}</span>
                    </div>

                    <div>
                        <strong>${course.tasks_count}</strong>
                        <span>${tr("moderator_courses.tasks", "завдань")}</span>
                    </div>
                </div>

                <div class="moderator-course-actions">
                    <button class="edit-course-btn" type="button" data-course-id="${course.id}">
                        ${tr("moderator_courses.edit", "Редагувати")}
                    </button>

                    <button class="members-course-btn" type="button" data-course-id="${course.id}">
                        ${tr("moderator_courses.members", "Учасники")}
                    </button>
                </div>
            </article>
        `).join("");

        bindCourseButtons();
    }

    function bindCourseButtons() {
        document.querySelectorAll(".edit-course-btn").forEach(button => {
            button.addEventListener("click", () => {
                const courseId = button.dataset.courseId;
                const course = courses.find(item => String(item.id) === String(courseId));

                if (course) {
                    openCourseModal(course);
                }
            });
        });

        document.querySelectorAll(".members-course-btn").forEach(button => {
            button.addEventListener("click", () => {
                const courseId = button.dataset.courseId;
                const course = courses.find(item => String(item.id) === String(courseId));

                if (course) {
                    openMembersModal(course);
                }
            });
        });
    }

    function openCourseModal(course) {
        courseIdInput.value = course.id;
        courseTitleUkInput.value = course.title_uk || course.title || "";
        courseTitleEnInput.value = course.title_en || "";
        courseDescriptionUkInput.value = course.description_uk || course.description || "";
        courseDescriptionEnInput.value = course.description_en || "";
        courseColorInput.value = course.color_accent || "#E8A44A";

        courseModalOverlay.classList.add("active");
    }

    function closeCourseModal() {
        courseModalOverlay.classList.remove("active");
    }

    async function handleCourseSubmit(event) {
        event.preventDefault();

        const courseId = courseIdInput.value;

        const payload = {
            title_uk: courseTitleUkInput.value.trim(),
            title_en: courseTitleEnInput.value.trim(),
            description_uk: courseDescriptionUkInput.value.trim(),
            description_en: courseDescriptionEnInput.value.trim(),
            color_accent: courseColorInput.value
        };

        try {
            await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            showMessage(tr("moderator_courses.update_success", "Курс оновлено."), "success");
            closeCourseModal();
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Помилка редагування курсу:", error);
            showMessage(
                tr("moderator_courses.update_error", "Backend ще не підтримує редагування курсів або сталася помилка."),
                "error"
            );
        }
    }

    async function loadUsersForSelects() {
        try {
            const data = await fetchJson(`${API_BASE_URL}/moderator/users`);
            users = Array.isArray(data.users) ? data.users : [];
        } catch (error) {
            console.error("[Moderator Courses] Не вдалося завантажити користувачів:", error);
            users = [];
        }
    }

    async function openMembersModal(course) {
        membersCourseIdInput.value = course.id;
        membersModalTitle.textContent = `${tr("moderator_courses.members_title", "Учасники курсу")}: ${course.title}`;

        membersModalOverlay.classList.add("active");

        courseStudentsList.innerHTML = `<p class="empty-msg">${tr("moderator_courses.loading_title", "Завантаження...")}</p>`;
        courseTeachersList.innerHTML = `<p class="empty-msg">${tr("moderator_courses.loading_title", "Завантаження...")}</p>`;

        await loadUsersForSelects();
        await loadCourseMembers(course.id);
    }

    function closeMembersModal() {
        membersModalOverlay.classList.remove("active");
    }

    async function loadCourseMembers(courseId) {
        try {
            const data = await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/members`);

            currentMembers = {
                students: Array.isArray(data.students) ? data.students : [],
                teachers: Array.isArray(data.teachers) ? data.teachers : []
            };

            renderMembers();
            renderUserSelects();
        } catch (error) {
            console.error("[Moderator Courses] Не вдалося завантажити учасників:", error);

            currentMembers = {
                students: [],
                teachers: []
            };

            renderMembers();
            renderUserSelects();

            showMessage(
                tr("moderator_courses.members_error", "Backend ще не підтримує перегляд учасників курсу."),
                "error"
            );
        }
    }

    function renderUserSelects() {
        const currentStudentIds = currentMembers.students.map(student => Number(student.id));
        const currentTeacherIds = currentMembers.teachers.map(teacher => Number(teacher.id));

        const availableStudents = users.filter(user => {
            return user.role === "student" && !currentStudentIds.includes(Number(user.id));
        });

        const availableTeachers = users.filter(user => {
            return user.role === "teacher" && !currentTeacherIds.includes(Number(user.id));
        });

        studentSelect.innerHTML = availableStudents.length
            ? availableStudents.map(user => `<option value="${user.id}">${user.full_name} (${user.email})</option>`).join("")
            : `<option value="">${tr("moderator_courses.no_available_students", "Немає доступних студентів")}</option>`;

        teacherSelect.innerHTML = availableTeachers.length
            ? availableTeachers.map(user => `<option value="${user.id}">${user.full_name} (${user.email})</option>`).join("")
            : `<option value="">${tr("moderator_courses.no_available_teachers", "Немає доступних викладачів")}</option>`;
    }

    function renderMembers() {
        if (!currentMembers.students.length) {
            courseStudentsList.innerHTML = `<p class="empty-msg">${tr("moderator_courses.students_empty", "Студентів ще не зараховано.")}</p>`;
        } else {
            courseStudentsList.innerHTML = currentMembers.students.map(student => `
                <div class="member-card">
                    <div>
                        <strong>${student.full_name || student.name || tr("moderator_courses.student_default", "Студент")}</strong>
                        <p>${student.email || ""}</p>
                    </div>

                    <button class="remove-student-btn" type="button" data-student-id="${student.id}">
                        ${tr("moderator_courses.remove_student", "Відрахувати")}
                    </button>
                </div>
            `).join("");
        }

        if (!currentMembers.teachers.length) {
            courseTeachersList.innerHTML = `<p class="empty-msg">${tr("moderator_courses.teachers_empty", "Викладачів ще не призначено.")}</p>`;
        } else {
            courseTeachersList.innerHTML = currentMembers.teachers.map(teacher => `
                <div class="member-card">
                    <div>
                        <strong>${teacher.full_name || teacher.name || tr("moderator_courses.teacher_default", "Викладач")}</strong>
                        <p>${teacher.email || ""}</p>
                    </div>

                    <button class="remove-teacher-btn" type="button" data-teacher-id="${teacher.id}">
                        ${tr("moderator_courses.remove_teacher", "Прибрати")}
                    </button>
                </div>
            `).join("");
        }

        bindMemberButtons();
    }

    function bindMemberButtons() {
        document.querySelectorAll(".remove-student-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const courseId = membersCourseIdInput.value;
                const studentId = button.dataset.studentId;

                await removeStudentFromCourse(courseId, studentId);
            });
        });

        document.querySelectorAll(".remove-teacher-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const courseId = membersCourseIdInput.value;
                const teacherId = button.dataset.teacherId;

                await removeTeacherFromCourse(courseId, teacherId);
            });
        });
    }

    async function addStudentToCourse() {
        const courseId = membersCourseIdInput.value;
        const studentId = studentSelect.value;

        if (!studentId) {
            showMessage(tr("moderator_courses.choose_student", "Оберіть студента."), "error");
            return;
        }

        try {
            await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/students`, {
                method: "POST",
                body: JSON.stringify({ studentId })
            });

            showMessage(tr("moderator_courses.add_student_success", "Студента зараховано на курс."), "success");
            await loadCourseMembers(courseId);
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Помилка зарахування студента:", error);
            showMessage(
                tr("moderator_courses.add_student_error", "Backend ще не підтримує зарахування студентів або сталася помилка."),
                "error"
            );
        }
    }

    async function removeStudentFromCourse(courseId, studentId) {
        if (!confirm(tr("moderator_courses.confirm_remove_student", "Відрахувати студента з курсу?"))) {
            return;
        }

        try {
            await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/students/${studentId}`, {
                method: "DELETE"
            });

            showMessage(tr("moderator_courses.remove_student_success", "Студента відраховано з курсу."), "success");
            await loadCourseMembers(courseId);
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Помилка відрахування студента:", error);
            showMessage(
                tr("moderator_courses.remove_student_error", "Backend ще не підтримує відрахування студентів або сталася помилка."),
                "error"
            );
        }
    }

    async function addTeacherToCourse() {
        const courseId = membersCourseIdInput.value;
        const teacherId = teacherSelect.value;

        if (!teacherId) {
            showMessage(tr("moderator_courses.choose_teacher", "Оберіть викладача."), "error");
            return;
        }

        try {
            await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/teachers`, {
                method: "POST",
                body: JSON.stringify({ teacherId })
            });

            showMessage(tr("moderator_courses.add_teacher_success", "Викладача призначено на курс."), "success");
            await loadCourseMembers(courseId);
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Помилка призначення викладача:", error);
            showMessage(
                tr("moderator_courses.add_teacher_error", "Backend ще не підтримує призначення викладачів або сталася помилка."),
                "error"
            );
        }
    }

    async function removeTeacherFromCourse(courseId, teacherId) {
        if (!confirm(tr("moderator_courses.confirm_remove_teacher", "Прибрати викладача з курсу?"))) {
            return;
        }

        try {
            await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/teachers/${teacherId}`, {
                method: "DELETE"
            });

            showMessage(tr("moderator_courses.remove_teacher_success", "Викладача прибрано з курсу."), "success");
            await loadCourseMembers(courseId);
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Помилка видалення викладача:", error);
            showMessage(
                tr("moderator_courses.remove_teacher_error", "Backend ще не підтримує видалення викладачів або сталася помилка."),
                "error"
            );
        }
    }

    async function loadCourses() {
        const token = getToken();

        if (!token) {
            coursesList.innerHTML = `
                <div class="moderator-courses-empty">
                    <h2>${tr("moderator_courses.no_access_title", "Немає доступу")}</h2>
                    <p>${tr("moderator_courses.no_access_text", "Потрібно авторизуватися.")}</p>
                </div>
            `;
            return;
        }

        try {
            coursesList.innerHTML = `
                <div class="moderator-courses-loading">
                    <h2>${tr("moderator_courses.loading_title", "Завантаження...")}</h2>
                    <p>${tr("moderator_courses.loading_text", "Отримуємо список курсів.")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/moderator/courses`);

            courses = Array.isArray(data.courses)
                ? data.courses.map(normalizeCourse)
                : [];

            updateStats();
            renderCourses();
        } catch (error) {
            console.error("[Moderator Courses] Помилка:", error);

            coursesList.innerHTML = `
                <div class="moderator-courses-empty">
                    <h2>${tr("moderator_courses.load_error_title", "Не вдалося завантажити курси")}</h2>
                    <p>${tr("moderator_courses.load_error_text", "Перевірте backend або права доступу модератора.")}</p>
                </div>
            `;
        }
    }

    if (courseSearch) {
        courseSearch.addEventListener("input", renderCourses);
    }

    if (courseSort) {
        courseSort.addEventListener("change", renderCourses);
    }

    if (courseForm) {
        courseForm.addEventListener("submit", handleCourseSubmit);
    }

    if (closeCourseModalBtn) {
        closeCourseModalBtn.addEventListener("click", closeCourseModal);
    }

    if (cancelCourseModalBtn) {
        cancelCourseModalBtn.addEventListener("click", closeCourseModal);
    }

    if (courseModalOverlay) {
        courseModalOverlay.addEventListener("click", event => {
            if (event.target === courseModalOverlay) {
                closeCourseModal();
            }
        });
    }

    if (closeMembersModalBtn) {
        closeMembersModalBtn.addEventListener("click", closeMembersModal);
    }

    if (membersModalOverlay) {
        membersModalOverlay.addEventListener("click", event => {
            if (event.target === membersModalOverlay) {
                closeMembersModal();
            }
        });
    }

    if (addStudentBtn) {
        addStudentBtn.addEventListener("click", addStudentToCourse);
    }

    if (addTeacherBtn) {
        addTeacherBtn.addEventListener("click", addTeacherToCourse);
    }

    if (typeof applyStaticTranslations === "function") {
        applyStaticTranslations(getCurrentLang());
    }

    loadCourses();
});