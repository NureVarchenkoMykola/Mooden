let currentAnnouncements = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE_URL}/teacher/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            const currentLang = document.documentElement.lang || 'uk';
            showToast(getTranslation(currentLang, `errors.${errorData.message}`), 'error');

            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../index.html';
            }
            return;
        }

        const data = await response.json();
        currentAnnouncements = data.announcements;
        renderDashboard(data);
    } catch (error) {
        const currentLang = document.documentElement.lang || 'uk';
        showToast(getTranslation(currentLang, 'errors.SERVER_ERROR_DASHBOARD'), 'error');
        console.error('[Dev Mode] Teacher dashboard error:', error);
    }
});

function renderDashboard(data) {
    if (!data) return;
    const lang = data.user.lang || 'uk';
    
    const firstName = data.user.full_name.split(' ')[0];
    document.getElementById('welcomeName').textContent = firstName;

    const statusPrefix = getTranslation(lang, 'dashboard.teacher_status_info');
    document.getElementById('headerStatus').textContent = `${statusPrefix} ${data.user.department}.`;

    document.getElementById('activeCourses').textContent = data.stats.activeCourses;
    document.getElementById('totalStudents').textContent = data.stats.totalStudents;
    document.getElementById('pendingGrading').textContent = data.stats.pendingGrading;
    document.getElementById('avgRating').textContent = Number(data.stats.avgRating).toFixed(1);

    const coursesContainer = document.getElementById('coursesContainer');
    if (data.courses && data.courses.length > 0) {
        coursesContainer.innerHTML = data.courses.map(course => `
            <a href="course-manage.html?id=${course.id}" class="course-item" style="--accent-color: ${course.color_accent}">
                <div class="course-info">
                    <p class="course-title"><strong>${course.title}</strong></p>
                    <div class="progress-wrapper">
                        <div class="progress-bar">
                            <div class="progress-fill" style="--progress-width: ${course.group_avg_progress}%"></div>
                        </div>
                        <span class="progress-val">${course.group_avg_progress}%</span>
                    </div>
                </div>
                <span class="btn-enter">➔</span>
            </a>
        `).join('');
    } else {
        coursesContainer.innerHTML = `<p class="empty-msg">${getTranslation(lang, 'dashboard.empty_courses_teacher')}</p>`;
    }

    const scheduleContainer = document.getElementById('scheduleContainer');
    if (data.schedule && data.schedule.length > 0) {
        scheduleContainer.innerHTML = data.schedule.map(item => `
            <div class="schedule-item-card" style="--accent-color: ${item.color_accent}">
                 <div class="item-details">
                    <p class="item-title">${item.title}</p>
                    <p class="item-meta">
                        ${item.group_name} • ${item.room}
                    </p>
                    
                    <div class="lesson-badges">
                        <span class="lesson-badge type-${item.lesson_type}">
                            ${getTranslation(lang, 'schedule.type_' + item.lesson_type)}
                        </span>
                        <span class="lesson-badge format-${item.lesson_format}">
                            ${getTranslation(lang, 'schedule.format_' + item.lesson_format)}
                        </span>
                    </div>

                    <div class="item-time-range">${item.time_start.substring(0, 5)} - ${item.time_end.substring(0, 5)}</div>
                </div>
            </div>
        `).join('');
    } else {
        scheduleContainer.innerHTML = `<p class="empty-msg">${getTranslation(lang, 'dashboard.no_classes_today')}</p>`;
    }

    const gradingContainer = document.getElementById('gradingContainer');
    if (data.stats.pendingGrading > 0) {
        gradingContainer.innerHTML = `
            <div class="schedule-item-card">
                <div class="item-details">
                    <p class="item-title">${getTranslation(lang, 'dashboard.pending_submissions')}</p>
                    <p class="item-meta">${data.stats.pendingGrading} ${getTranslation(lang, 'dashboard.items')}</p>
                </div>
            </div>
        `;
    } else {
        gradingContainer.innerHTML = `<p class="empty-msg">${getTranslation(lang, 'dashboard.all_graded')}</p>`;
    }

    const announcementsContainer = document.getElementById('announcementsContainer');

    if (data.announcements && data.announcements.length > 0) {
        announcementsContainer.innerHTML = data.announcements.map(info => {
            const previewText = info.content.length > 100 
                ? info.content.substring(0, 100) + '...' 
                : info.content;

            return `
                <div class="announcement-card" onclick="openAnnouncement(${info.id})">
                    <div class="announcement-header">
                        <span class="announcement-label">${info.course_name || getTranslation(lang, 'dashboard.label_general')}</span>
                        <span class="announcement-date">${new Date(info.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'uk-UA')}</span>
                    </div>
                    <h4 class="announcement-title">${info.title}</h4>
                    <p class="announcement-text">${previewText}</p>
                </div>
            `;
        }).join('');
    } else {
        announcementsContainer.innerHTML = `<p class="empty-msg">${getTranslation(lang, 'dashboard.empty_announcements')}</p>`;
    }
}

async function openAnnouncement(id) {
    const info = currentAnnouncements.find(a => a.id === id);
    if (!info) return;
    
    const modal = document.getElementById('announcementModal');
    const lang = document.documentElement.lang || 'uk';

    document.getElementById('modalTitle').innerText = info.title;
    document.getElementById('modalFullText').innerText = info.content;
    document.getElementById('modalLabel').innerText = info.course_name || getTranslation(lang, 'dashboard.label_general');
    
    modal.style.display = 'flex';

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        await fetch(`${API_BASE_URL}/teacher/announcements/${info.id}/read`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (err) {
        console.error("Mark read error:", err);
    }
}

function closeAnnouncementModal() {
    document.getElementById('announcementModal').style.display = 'none';
    location.reload(); 
}