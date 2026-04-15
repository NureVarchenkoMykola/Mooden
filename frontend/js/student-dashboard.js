const API_BASE_URL = 'http://localhost:5000/api';
let currentAnnouncements = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '../index.html';
        });
    }

    try {
        const response = await fetch(`${API_BASE_URL}/student/dashboard`, {
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
        console.error(`[Dev Mode] Dashboard load failed. Status: ${response.status}, Code: ${errorData.message}`); // сделать лог

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
        showToast(getTranslation(currentLang, 'errors.UNKNOWN_ERROR'), 'error');
        console.error('[Dev Mode] Critical failure during dashboard initialization:', error);  // сделать лог
    }
});

/**
 * Функція для заповнення сторінки дашборду даними
 * @param {Object} data - дані з беку (user, stats, courses, deadlines)
 */
function renderDashboard(data) {
    if (!data) return;

    const lang = data.user.lang || 'uk';
    applyStaticTranslations(lang);
    const activeRadio = document.querySelector(`.lang-slider input[value="${lang}"]`);
    if (activeRadio) {
        activeRadio.checked = true;
    }

    const firstName = data.user.full_name.split(' ')[0];
    document.getElementById('welcomeName').textContent = firstName;
    
    const naText = getTranslation(lang, 'dashboard.not_available');
    const groupName = data.user.group_name || naText;
    
    const statusText = getTranslation(lang, 'dashboard.status_info'); 
    document.getElementById('headerStatus').textContent = `${statusText} ${groupName}.`;

    document.getElementById('profileName').textContent = data.user.full_name;
    
    const role = getTranslation(lang, 'common.student_role');
    document.getElementById('profileGroup').textContent = `${role} • ${groupName}`;
    
    const avatarElem = document.getElementById('avatarInitial');
    if (avatarElem) {
        avatarElem.textContent = data.user.full_name[0].toUpperCase();
    }

    document.getElementById('activeCourses').textContent = data.stats.activeCourses;
    document.getElementById('completedTasks').textContent = data.stats.completedTasks;
    document.getElementById('avgGrade').textContent = Number(data.stats.avgGrade).toFixed(1);
    document.getElementById('userCoins').textContent = data.user.coins;

    const coursesContainer = document.getElementById('coursesContainer');
    if (data.courses && data.courses.length > 0) {
        coursesContainer.innerHTML = data.courses.map(course => `
        <a href="course.html?id=${course.id}" class="course-item" style="--accent-color: ${course.color_accent}">
            <div class="course-info">
                <p class="course-title"><strong>${course.title}</strong></p>
                <div class="progress-wrapper">
                    <div class="progress-bar">
                        <div class="progress-fill" style="--progress-width: ${course.progress_percent}%"></div>
                    </div>
                    <span class="progress-val">${course.progress_percent}%</span>
                </div>
            </div>
            <span class="btn-enter">➔</span>
        </a>
    `).join('');
    } else {
        coursesContainer.innerHTML = `<p class="empty-msg">${getTranslation(lang, 'dashboard.empty_courses')}</p>`;
    }

    const deadlinesContainer = document.getElementById('deadlinesContainer');
    if (data.deadlines && data.deadlines.length > 0) {
        deadlinesContainer.innerHTML = data.deadlines.map(task => `
            <div class="deadline-card" style="--dot-color: ${task.color_accent}">
                <div class="deadline-dot"></div>
                <div class="deadline-info">
                    <p class="deadline-task">${task.title}</p>
                    <p class="deadline-course">${task.course_name}</p>
                    <div class="deadline-time">${formatDeadlineDate(task.deadline, lang)}</div>
                </div>
            </div>
        `).join('');
    } else {
        deadlinesContainer.innerHTML = `<p class="empty-msg">${getTranslation(lang, 'dashboard.empty_deadlines')}</p>`;
    }

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
}

function formatDeadlineDate(dateStr, lang) {
    const d = new Date(dateStr);
    const now = new Date();
    
    if (d.toDateString() === now.toDateString()) {
        const todayText = getTranslation(lang, 'dashboard.today');
        return `<span style="color: var(--text-gold); font-weight: bold;">${todayText}</span>`;
    }

    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'uk-UA', { day: 'numeric', month: 'short' });
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
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/student/announcements/${info.id}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (err) {
        console.error("[Dev Mode] Failed to mark announcement as read via API:", err); // сделать лог
    }
}

function closeAnnouncementModal() {
    document.getElementById('announcementModal').style.display = 'none';
    location.reload(); 
}