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
    const openAddCourseModalBtn = document.getElementById("openAddCourseModalBtn");
    const courseModalTitle = document.getElementById("courseModalTitle");
    const courseModalDesc = document.getElementById("courseModalDesc");

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
    let modalMode = "edit";
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

    function normalizeCourse(course) {
        return {
            id: course.id,
            title: course.title || course.title_uk || course.title_en || getTranslation(getCurrentLang(), "moderator_courses.untitled"),
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
                    <h2>${getTranslation(getCurrentLang(), "moderator_courses.empty_title")}</h2>
                    <p>${getTranslation(getCurrentLang(), "moderator_courses.empty_text")}</p>
                </div>
            `;
            return;
        }

        coursesList.innerHTML = filteredCourses.map(course => `
            <article class="moderator-course-card ${course.is_hidden ? "is-hidden" : ""}" style="--course-accent: ${course.color_accent}">
                <div class="moderator-course-top">
                    <div class="moderator-course-icon">📚</div>

                    <span class="moderator-course-status ${course.is_hidden ? "hidden-course" : "active-course"}">
                        ${
                            course.is_hidden
                                ? getTranslation(getCurrentLang(), "moderator_courses.hidden")
                                : getTranslation(getCurrentLang(), "moderator_courses.active")
                        }
                    </span>
                </div>

                <h2>${course.title}</h2>

                <p class="moderator-course-description">
                    ${course.description || getTranslation(getCurrentLang(), "moderator_courses.no_description")}
                </p>

                <div class="moderator-course-meta">
                    <div>
                        <strong>${course.students_count}</strong>
                        <span>${getTranslation(getCurrentLang(), "moderator_courses.students")}</span>
                    </div>

                    <div>
                        <strong>${course.teachers_count}</strong>
                        <span>${getTranslation(getCurrentLang(), "moderator_courses.teachers")}</span>
                    </div>

                    <div>
                        <strong>${course.tasks_count}</strong>
                        <span>${getTranslation(getCurrentLang(), "moderator_courses.tasks")}</span>
                    </div>
                </div>

                <div class="moderator-course-actions">
                    <button class="edit-course-btn" type="button" data-course-id="${course.id}">
                        ${getTranslation(getCurrentLang(), "moderator_courses.edit")}
                    </button>

                    <button class="members-course-btn" type="button" data-course-id="${course.id}">
                        ${getTranslation(getCurrentLang(), "moderator_courses.members")}
                    </button>

                    <button class="visibility-course-btn ${course.is_hidden ? "show" : "hide"}" type="button" data-course-id="${course.id}" data-hidden="${course.is_hidden}">
                        ${
                            course.is_hidden
                                ? getTranslation(getCurrentLang(), "moderator_courses.show_course")
                                : getTranslation(getCurrentLang(), "moderator_courses.hide_course")
                        }
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

        document.querySelectorAll(".visibility-course-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const courseId = button.dataset.courseId;
                const currentlyHidden = button.dataset.hidden === "true";
                const nextHidden = !currentlyHidden;

                button.disabled = true;

                try {
                    await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/visibility`, {
                        method: "PATCH",
                        body: JSON.stringify({
                            isHidden: nextHidden
                        })
                    });

                    showToast(
                        nextHidden
                            ? getTranslation(getCurrentLang(), "moderator_courses.hide_success")
                            : getTranslation(getCurrentLang(), "moderator_courses.show_success"),
                        "success"
                    );

                    await loadCourses();
                } catch (error) {
                    console.error("[Moderator Courses] Course visibility update failed:", error);
                    showToast(getTranslation(getCurrentLang(), "moderator_courses.visibility_error"), "error");
                    button.disabled = false;
                }
            });
        });
    }

    function openCreateCourseModal() {
        modalMode = "create";

        courseModalTitle.textContent = getTranslation(getCurrentLang(), "moderator_courses.add_modal_title");
        courseModalDesc.textContent = getTranslation(getCurrentLang(), "moderator_courses.add_modal_desc");

        courseIdInput.value = "";
        courseTitleUkInput.value = "";
        courseTitleEnInput.value = "";
        courseDescriptionUkInput.value = "";
        courseDescriptionEnInput.value = "";
        courseColorInput.value = "#E8A44A";

        courseModalOverlay.classList.add("active");
    }

    function openCourseModal(course) {
        modalMode = "edit";

        courseModalTitle.textContent = getTranslation(getCurrentLang(), "moderator_courses.edit_modal_title");
        courseModalDesc.textContent = getTranslation(getCurrentLang(), "moderator_courses.edit_modal_desc");

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
            if (modalMode === "create") {
                await fetchJson(`${API_BASE_URL}/moderator/courses`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                showToast(getTranslation(getCurrentLang(), "moderator_courses.create_success"), "success");
            } else {
                await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                });

                showToast(getTranslation(getCurrentLang(), "moderator_courses.update_success"), "success");
            }

            closeCourseModal();
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Course save failed:", error);
            showToast(getTranslation(getCurrentLang(), "moderator_courses.save_error"), "error");
        }
    }

    async function loadUsersForSelects() {
        try {
            const data = await fetchJson(`${API_BASE_URL}/moderator/users`);
            users = Array.isArray(data.users) ? data.users : [];
        } catch (error) {
            console.error("[Moderator Courses] User list loading failed:", error);
            users = [];
        }
    }

    async function openMembersModal(course) {
        membersCourseIdInput.value = course.id;
        membersModalTitle.textContent = `${getTranslation(getCurrentLang(), "moderator_courses.members_title")}: ${course.title}`;

        membersModalOverlay.classList.add("active");

        courseStudentsList.innerHTML = `<p class="empty-msg">${getTranslation(getCurrentLang(), "moderator_courses.loading_title")}</p>`;
        courseTeachersList.innerHTML = `<p class="empty-msg">${getTranslation(getCurrentLang(), "moderator_courses.loading_title")}</p>`;

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
            console.error("[Moderator Courses] Course members loading failed:", error);

            currentMembers = {
                students: [],
                teachers: []
            };

            renderMembers();
            renderUserSelects();

            showToast(getTranslation(getCurrentLang(), "moderator_courses.members_error"), "error");
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
            : `<option value="">${getTranslation(getCurrentLang(), "moderator_courses.no_available_students")}</option>`;

        teacherSelect.innerHTML = availableTeachers.length
            ? availableTeachers.map(user => `<option value="${user.id}">${user.full_name} (${user.email})</option>`).join("")
            : `<option value="">${getTranslation(getCurrentLang(), "moderator_courses.no_available_teachers")}</option>`;
    }

    function renderMembers() {
        if (!currentMembers.students.length) {
            courseStudentsList.innerHTML = `<p class="empty-msg">${getTranslation(getCurrentLang(), "moderator_courses.students_empty")}</p>`;
        } else {
            courseStudentsList.innerHTML = currentMembers.students.map(student => `
                <div class="member-card">
                    <div>
                        <strong>${student.full_name || student.name || getTranslation(getCurrentLang(), "moderator_courses.student_default")}</strong>
                        <p>${student.email || ""}</p>
                    </div>

                    <button class="remove-student-btn" type="button" data-student-id="${student.id}">
                        ${getTranslation(getCurrentLang(), "moderator_courses.remove_student")}
                    </button>
                </div>
            `).join("");
        }

        if (!currentMembers.teachers.length) {
            courseTeachersList.innerHTML = `<p class="empty-msg">${getTranslation(getCurrentLang(), "moderator_courses.teachers_empty")}</p>`;
        } else {
            courseTeachersList.innerHTML = currentMembers.teachers.map(teacher => `
                <div class="member-card">
                    <div>
                        <strong>${teacher.full_name || teacher.name || getTranslation(getCurrentLang(), "moderator_courses.teacher_default")}</strong>
                        <p>${teacher.email || ""}</p>
                    </div>

                    <button class="remove-teacher-btn" type="button" data-teacher-id="${teacher.id}">
                        ${getTranslation(getCurrentLang(), "moderator_courses.remove_teacher")}
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
            showToast(getTranslation(getCurrentLang(), "moderator_courses.choose_student"), "error");
            return;
        }

        try {
            await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/students`, {
                method: "POST",
                body: JSON.stringify({ studentId })
            });

            showToast(getTranslation(getCurrentLang(), "moderator_courses.add_student_success"), "success");
            await loadCourseMembers(courseId);
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Student enrollment failed:", error);
            showToast(getTranslation(getCurrentLang(), "moderator_courses.add_student_error"), "error");
        }
    }

    async function removeStudentFromCourse(courseId, studentId) {
        try {
            await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/students/${studentId}`, {
                method: "DELETE"
            });

            showToast(getTranslation(getCurrentLang(), "moderator_courses.remove_student_success"), "success");
            await loadCourseMembers(courseId);
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Student removal from course failed:", error);
            showToast(getTranslation(getCurrentLang(), "moderator_courses.remove_student_error"), "error");
        }
    }

    async function addTeacherToCourse() {
        const courseId = membersCourseIdInput.value;
        const teacherId = teacherSelect.value;

        if (!teacherId) {
            showToast(getTranslation(getCurrentLang(), "moderator_courses.choose_teacher"), "error");
            return;
        }

        try {
            await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/teachers`, {
                method: "POST",
                body: JSON.stringify({ teacherId })
            });

            showToast(getTranslation(getCurrentLang(), "moderator_courses.add_teacher_success"), "success");
            await loadCourseMembers(courseId);
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Teacher assignment failed:", error);
            showToast(getTranslation(getCurrentLang(), "moderator_courses.add_teacher_error"), "error");
        }
    }

    async function removeTeacherFromCourse(courseId, teacherId) {
        try {
            await fetchJson(`${API_BASE_URL}/moderator/courses/${courseId}/teachers/${teacherId}`, {
                method: "DELETE"
            });

            showToast(getTranslation(getCurrentLang(), "moderator_courses.remove_teacher_success"), "success");
            await loadCourseMembers(courseId);
            await loadCourses();
        } catch (error) {
            console.error("[Moderator Courses] Teacher removal from course failed:", error);
            showToast(getTranslation(getCurrentLang(), "moderator_courses.remove_teacher_error"), "error");
        }
    }

    async function loadCourses() {
        const token = getToken();

        if (!token) {
            coursesList.innerHTML = `
                <div class="moderator-courses-empty">
                    <h2>${getTranslation(getCurrentLang(), "moderator_courses.no_access_title")}</h2>
                    <p>${getTranslation(getCurrentLang(), "moderator_courses.no_access_text")}</p>
                </div>
            `;
            return;
        }

        try {
            coursesList.innerHTML = `
                <div class="moderator-courses-loading">
                    <h2>${getTranslation(getCurrentLang(), "moderator_courses.loading_title")}</h2>
                    <p>${getTranslation(getCurrentLang(), "moderator_courses.loading_text")}</p>
                </div>
            `;

            const data = await fetchJson(`${API_BASE_URL}/moderator/courses`);

            courses = Array.isArray(data.courses)
                ? data.courses.map(normalizeCourse)
                : [];

            updateStats();
            renderCourses();
        } catch (error) {
            console.error("[Moderator Courses] Courses loading failed:", error);

            coursesList.innerHTML = `
                <div class="moderator-courses-empty">
                    <h2>${getTranslation(getCurrentLang(), "moderator_courses.load_error_title")}</h2>
                    <p>${getTranslation(getCurrentLang(), "moderator_courses.load_error_text")}</p>
                </div>
            `;
        }
    }

    if (openAddCourseModalBtn) {
        openAddCourseModalBtn.addEventListener("click", openCreateCourseModal);
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