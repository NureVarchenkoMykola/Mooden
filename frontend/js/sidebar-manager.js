document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const currentLang = document.documentElement.lang || 'uk';

    if (!token) return;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '../index.html';
    });

    const userCard = document.querySelector('.user-card');
    if (userCard) {
        userCard.style.cursor = 'pointer';
        userCard.addEventListener('click', () => {
            const role = localStorage.getItem('userRole');
            window.location.href = `${role}-profile.html`;
        });
    }

    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-active');
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            sidebar.classList.contains('mobile-active') && 
            !sidebar.contains(e.target)) {
            sidebar.classList.remove('mobile-active');
        }
    });
    
    try {
        const res = await fetch(`${API_BASE_URL}/user/sidebar`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const errorData = await res.json();
            showToast(getTranslation(currentLang, `errors.${errorData.message}`), 'error');
            console.error(`[Dev Mode] Sidebar API error. Status: ${res.status}, Code: ${errorData.message}`);
            return;
        }

        const data = await res.json();

        const dbLang = data.lang; 
        const localLang = localStorage.getItem('mooden-lang');

        if (dbLang) {
            localStorage.setItem('mooden-lang', dbLang);
            
            if (dbLang !== localLang) {
                applyStaticTranslations(dbLang);
                const activeRadio = document.querySelector(`.lang-slider input[value="${dbLang}"]`);
                if (activeRadio) activeRadio.checked = true;
            }
        }

        renderSidebar(data);
    } catch (err) {
        showToast(getTranslation(currentLang, 'errors.UNKNOWN_ERROR'), 'error');
        console.error('[Dev Mode] Critical failure during sidebar initialization:', err);
    }
});

function renderSidebar(data) {
    if (document.getElementById('profileName')) document.getElementById('profileName').textContent = data.full_name;
    
    const subElem = document.getElementById('profileGroup') || document.getElementById('profileRole');
    if (subElem) subElem.textContent = data.sub_info;

    const avatar = document.getElementById('avatarInitial');
    if (avatar) avatar.textContent = data.full_name[0].toUpperCase();

    const tasksBadge = document.getElementById('tasksBadge') || document.getElementById('gradingBadge');
    if (tasksBadge) {
        tasksBadge.textContent = data.badges.tasks;
        tasksBadge.style.display = data.badges.tasks > 0 ? 'block' : 'none';
    }

    const notifBadge = document.getElementById('notifBadge');
    if (notifBadge) {
        notifBadge.textContent = data.badges.notifications;
        notifBadge.style.display = data.badges.notifications > 0 ? 'block' : 'none';
    }
}

/**
 * Формує "красивий" ідентифікатор користувача
 * @param {Object} user - об'єкт користувача з полями id, role, regYear
 * @returns {string} - відформатований ID (напр. STU-2026-01)
 */
function formatUserId(user) {
    if (!user || !user.id) return 'N/A';

    const rolePrefixes = {
        'student': 'STU',
        'teacher': 'TEA',
        'moderator': 'MOD'
    };

    const prefix = rolePrefixes[user.role] || 'USR';
    const year = user.regYear || new Date().getFullYear();
    const sequence = String(user.id).padStart(2, '0');

    return `${prefix}-${year}-${sequence}`;
}