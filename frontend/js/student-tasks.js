let allTasks = [];

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) return;

    await loadTasks();
    setupFilters();
});

async function loadTasks() {
    const container = document.getElementById("tasksList");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const currentLang = document.documentElement.lang || "uk";

    try {
        const response = await fetch(`${API_BASE_URL}/student/tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            showToast(getTranslation(currentLang, `errors.${errorData.message}`), 'error');
            console.error(`[Dev Mode] Tasks load failed. Status: ${response.status}, Code: ${errorData.message}`);

            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../index.html';
            }
            container.innerHTML = `<p class="empty-msg">${getTranslation(currentLang, 'errors.SERVER_ERROR_TASKS')}</p>`;
            return;
        }

        const data = await response.json();
        allTasks = data.tasks;
        const filterSelect = document.getElementById("taskFilter");

        if (filterSelect) {
            filterSelect.value = "pending";
        }

        const initialFiltered = allTasks.filter(t => t.status === 'pending');

        document.getElementById('totalTasks').textContent = data.stats.total;
        document.getElementById('pendingTasks').textContent = data.stats.pending;
        document.getElementById('overdueTasks').textContent = data.stats.overdue;
        document.getElementById('avgGrade').textContent = data.stats.avgGrade;

        renderTasks(initialFiltered, data.user.lang);

    } catch (error) {
        showToast(getTranslation(currentLang, 'errors.UNKNOWN_ERROR'), 'error');
        console.error('[Dev Mode] Critical failure during tasks initialization:', error);
        container.innerHTML = `<p class="empty-msg">${getTranslation(currentLang, 'errors.SERVER_ERROR_TASKS')}</p>`;
    }
}

function renderTasks(tasksToRender, lang) {
    const container = document.getElementById("tasksList");
    container.innerHTML = "";

    if (allTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-tasks">
                <h3>${getTranslation(lang, 'tasks.empty_title')}</h3>
                <p>${getTranslation(lang, 'tasks.page_desc')}</p>
            </div>`;
        return;
    }

    if (tasksToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-tasks">
                <h3>${getTranslation(lang, 'tasks.empty_title')}</h3>
                <p>${getTranslation(lang, 'tasks.empty_text')}</p>
            </div>`;
        return;
    }

    container.innerHTML = tasksToRender.map(task => {
        const date = new Date(task.deadline).toLocaleDateString(lang === 'en' ? 'en-US' : 'uk-UA', {
            day: 'numeric', month: 'short'
        });
        const statusText = getTranslation(lang, `tasks.status_${task.status}`);

        return `
            <article class="task-card" style="--task-accent: ${task.color_accent || 'var(--accent-gold)'}">
                <div class="task-main">
                    <div class="task-header">
                        <span class="task-course-tag">${task.course_name}</span>
                        <span class="task-status-badge ${task.status}">${statusText}</span>
                    </div>
                    <h2 class="task-title">${task.title}</h2>
                    <p class="task-desc">${task.description || ''}</p>
                    <div class="task-footer">
                        <span>📅 ${date}</span>
                        <span>⭐ ${task.grade_value || getTranslation(lang, 'tasks.no_grade')}</span>
                    </div>
                </div>
                <button class="open-task-btn" onclick="location.href='student-task-detail.html?id=${task.id}'">
                    ${getTranslation(lang, 'tasks.open_btn')}
                </button>
            </article>
        `;
    }).join('');
}

function setupFilters() {
    const searchInput = document.getElementById("taskSearch");
    const filterSelect = document.getElementById("taskFilter");

    const applyFilters = () => {
        const query = searchInput?.value.toLowerCase() || "";
        const status = filterSelect?.value || "pending";
        const lang = document.documentElement.lang || 'uk';

        const filtered = allTasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(query) || t.course_name.toLowerCase().includes(query);
            const matchesStatus = (status === 'all') || (t.status === status);
            return matchesSearch && matchesStatus;
        });

        renderTasks(filtered, lang);
    };

    searchInput?.addEventListener("input", applyFilters);
    filterSelect?.addEventListener("change", applyFilters);
}