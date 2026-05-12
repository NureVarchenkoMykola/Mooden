let allCourses = [];

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) return;

    await loadCourses();
});

async function loadCourses() {
    const coursesGrid = document.getElementById("coursesGrid");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const currentLang = document.documentElement.lang || 'uk';

    try {
        const response = await fetch(`${API_BASE_URL}/student/courses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            showToast(getTranslation(currentLang, `errors.${errorData.message}`), 'error');
            console.error(`[Dev Mode] Courses load failed. Status: ${response.status}, Code: ${errorData.message}`);

            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../index.html';
            }
            coursesGrid.innerHTML = `<p class="empty-msg">${getTranslation(currentLang, 'errors.SERVER_ERROR_COURSES')}</p>`;
            return;
        }

        const data = await response.json();
        allCourses = data.courses;
        renderCourses(data.courses, data.user.lang);

    } catch (error) {
        showToast(getTranslation(currentLang, 'errors.UNKNOWN_ERROR'), 'error');
        console.error('[Dev Mode] Critical failure during courses fetch:', error);
        coursesGrid.innerHTML = `<p class="empty-msg">${getTranslation(currentLang, 'errors.SERVER_ERROR_COURSES')}</p>`;
    }
}

function renderCourses(coursesToRender, lang) {
    const coursesGrid = document.getElementById("coursesGrid");
    coursesGrid.innerHTML = "";

    if (allCourses.length === 0) {
        coursesGrid.innerHTML = `
            <div class="empty-courses">
                <h3>${getTranslation(lang, 'courses.no_enrolled_title')}</h3>
                <p>${getTranslation(lang, 'dashboard.empty_courses_student')}</p>
            </div>`;
        return;
    }

    if (coursesToRender.length === 0) {
        coursesGrid.innerHTML = `
            <div class="empty-courses">
                <h3>${getTranslation(lang, 'courses.empty_title')}</h3>
                <p>${getTranslation(lang, 'courses.empty_text')}</p>
            </div>`;
        return;
    }

    coursesGrid.innerHTML = coursesToRender.map(course => {
        const progress = Number(course.progress_percent);
        let statusClass = 'active';
        let statusKey = 'courses.status_active';

        if (progress === 0) {
            statusClass = 'new';
            statusKey = 'courses.status_new';
        } else if (progress >= 100) {
            statusClass = 'completed';
            statusKey = 'courses.status_completed';
        }

        return `
            <article class="course-card ${statusClass}" 
                     style="--course-accent: ${course.color_accent || 'var(--text-gold)'}">
                <div class="course-top">
                    <div class="course-icon">📚</div>
                    <span class="course-status ${statusClass}">
                        ${getTranslation(lang, statusKey)}
                    </span>
                </div>
                <h2 class="course-title">${course.title}</h2>
                <p class="course-description">${course.description || ''}</p>
                <div class="progress-info">
                    <span>${getTranslation(lang, 'courses.progress')}</span>
                    <strong>${progress}%</strong>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="course-footer">
                    <button class="open-course-btn" onclick="location.href='./student-course-detail.html?id=${course.id}'">
                        ${getTranslation(lang, 'courses.open_btn')}
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

document.getElementById('courseSearch')?.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const lang = document.documentElement.lang || 'uk';
    const filtered = allCourses.filter(c => c.title.toLowerCase().includes(val));
    renderCourses(filtered, lang);
});

document.getElementById('courseFilter')?.addEventListener('change', (e) => {
    const val = e.target.value;
    const lang = document.documentElement.lang || 'uk';
    let filtered = allCourses;

    if (val === 'new') {
        filtered = allCourses.filter(c => Number(c.progress_percent) === 0);
    } else if (val === 'active') {
        filtered = allCourses.filter(c => Number(c.progress_percent) > 0 && Number(c.progress_percent) < 100);
    } else if (val === 'completed') {
        filtered = allCourses.filter(c => Number(c.progress_percent) >= 100);
    }
    renderCourses(filtered, lang);
});