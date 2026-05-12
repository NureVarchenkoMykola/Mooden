let weekOffset = 0;
let allLessons = [];
let todayLessonsData = [];

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) return;

    await loadTodayLessons();
    await loadSchedule();
    initControls();
});

async function loadSchedule() {
    const container = document.getElementById("scheduleDays");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const lang = document.documentElement.lang || "uk";

    const monday = getMonday(weekOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    updateWeekLabel(monday, sunday, lang);

    try {
        const fromDate = monday.toISOString().split('T')[0];
        const toDate = sunday.toISOString().split('T')[0];

        const response = await fetch(`${API_BASE_URL}/student/schedule?from=${fromDate}&to=${toDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!response.ok) {
            const errorData = await response.json();
            showToast(getTranslation(lang, `errors.${errorData.message}`), 'error');
            console.error(`[Dev Mode] Schedule load failed. Status: ${response.status}, Code: ${errorData.message}`);

            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../index.html';
            }
            container.innerHTML = `<div class="schedule-empty-state"><h3>${getTranslation(lang, 'errors.SERVER_ERROR_SCHEDULE')}</h3></div>`;
            return;
        }
        const data = await response.json();
        allLessons = data.schedule;

        renderScheduleGrid(monday, lang);

    } catch (err) {
        showToast(getTranslation(lang, 'errors.UNKNOWN_ERROR'), 'error');
        console.error('[Dev Mode] Critical failure during schedule initialization:', err);
        container.innerHTML = `<div class="schedule-empty-state"><h3>${getTranslation(lang, 'errors.SERVER_ERROR_SCHEDULE')}</h3></div>`;
    }
}

function renderScheduleGrid(monday, lang) {
    const container = document.getElementById("scheduleDays");
    container.innerHTML = "";

    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const dayLessons = allLessons.filter(l => l.lesson_date.startsWith(dateStr));

        const dayHtml = `
            <article class="day-card">
                <div class="day-header">
                    <h2 class="day-name">${getTranslation(lang, 'schedule.' + dayKeys[i])}</h2>
                    <div class="day-date">${currentDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'uk-UA', { day: 'numeric', month: 'short' })}</div>
                </div>
                <div class="lessons-list">
                    ${dayLessons.length ? dayLessons.map(l => `
                        <div class="lesson-card" style="--lesson-accent: ${l.color_accent || 'var(--accent-gold)'}">
                            <div class="lesson-time">${l.time_start.slice(0, 5)} – ${l.time_end.slice(0, 5)}</div>
                            <h3 class="lesson-title">${l.course_name}</h3>
                            <div class="lesson-meta">
                                <span>👤 ${l.teacher_name}</span>
                                <span>📍 ${getTranslation(lang, 'schedule.room')} ${l.room || '—'}</span>
                            </div>
                            <div class="lesson-badges">
                                <span class="lesson-badge type-${l.lesson_type}">
                                    ${getTranslation(lang, 'schedule.type_' + l.lesson_type)}
                                </span>
                                <span class="lesson-badge format-${l.lesson_format}">
                                    ${getTranslation(lang, 'schedule.format_' + l.lesson_format)}
                                </span>
                            </div>
                        </div>
                    `).join('') : `<div class="empty-day">${getTranslation(lang, 'schedule.empty_day')}</div>`}
                </div>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', dayHtml);
    }
}

async function loadTodayLessons() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const lang = document.documentElement.lang || "uk";
    const todayStr = new Date().toLocaleDateString('en-CA');

    try {
        const response = await fetch(`${API_BASE_URL}/student/schedule?from=${todayStr}&to=${todayStr}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
                showToast(getTranslation(lang, `errors.${errorData.message}`), 'error');
            console.error(`[Dev Mode] Today lessons fetch failed. Status: ${response.status}, Code: ${errorData.message}`);

            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../index.html';
            }
            return;
        }
        const data = await response.json();
        todayLessonsData = data.schedule;
        renderTodayPanel(lang);

    } catch (err) {
        showToast(getTranslation(lang, 'errors.UNKNOWN_ERROR'), 'error');
        console.error('[Dev Mode] Critical failure during today lessons load:', err);
    }
}

function renderTodayPanel(lang) {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    
    const todayItems = todayLessonsData.filter(l => {
        const lessonDate = new Date(l.lesson_date);
        const lessonDateStr = lessonDate.getFullYear() + '-' + String(lessonDate.getMonth() + 1).padStart(2, '0') + '-' + String(lessonDate.getDate()).padStart(2, '0');
        
        return lessonDateStr === todayStr;
    });
    
    document.getElementById('todayCount').textContent = todayItems.length;
    const list = document.getElementById('todayLessons');
    
    if (!todayItems.length) {
        list.innerHTML = `<p class="today-empty">${getTranslation(lang, 'schedule.empty_today')}</p>`;
        return;
    }

    list.innerHTML = todayItems.map(l => `
        <div class="lesson-today-card" style="--accent: ${l.color_accent || 'var(--accent-gold)'}">
            <div class="l-time"><b>${l.time_start.slice(0, 5)}</b></div>
            <div class="l-info">
                <p class="l-name">${l.course_name}</p>
                <p class="l-meta">
                    <span class="type-tag">${getTranslation(lang, 'schedule.type_' + l.lesson_type)}</span> •
                    <span class="text-gold">${getTranslation(lang, 'schedule.format_' + l.lesson_format)}</span>
                </p>
            </div>
        </div>
    `).join('');
}

function getMonday(offset) {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - (day === 0 ? 6 : day - 1) + (offset * 7);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function updateWeekLabel(mon, sun, lang) {
    const label = weekOffset === 0 
        ? getTranslation(lang, 'schedule.current_week') 
        : `${mon.toLocaleDateString(lang, {day:'numeric', month:'short'})} — ${sun.toLocaleDateString(lang, {day:'numeric', month:'short'})}`;
    document.getElementById('weekLabel').textContent = label;
}

function initControls() {
    document.getElementById('prevWeekBtn').onclick = () => { weekOffset--; loadSchedule(); };
    document.getElementById('nextWeekBtn').onclick = () => { weekOffset++; loadSchedule(); };
}