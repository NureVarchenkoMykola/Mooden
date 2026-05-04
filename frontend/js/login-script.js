async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        const data = await response.json();

        document.getElementById('count-students').textContent = data.students;
        document.getElementById('count-hours').textContent = data.hours;
        document.getElementById('count-tasks').textContent = data.tasks;
    } catch (error) {
    console.warn('[Dev Mode] Login statistics failed to load. Using placeholders.');    }
}

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentLang = document.documentElement.lang || 'uk';

        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const rememberMe = document.getElementById('remember').checked;

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, rememberMe })
            });

            const data = await response.json();

            if (response.ok) {
                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem('token', data.token);
                storage.setItem('userRole', data.role);

                const DASHBOARD_MAP = {
                    'student': 'pages/student-dashboard.html',
                    'teacher': 'pages/teacher-dashboard.html',
                    'moderator': 'pages/moderator-dashboard.html'
                };

                window.location.href = DASHBOARD_MAP[data.role] || 'index.html';
            } else {
                const errorCode = data.message || 'UNKNOWN_ERROR';
                showToast(getTranslation(currentLang, `errors.${errorCode}`), 'error');
                console.error(`[Dev Mode] Login failed. Server code: ${errorCode}`);
            }
        } catch (error) {
            showToast(getTranslation(currentLang, 'errors.NETWORK_ERROR'), 'error');
            console.error('[Dev Mode] Connection failed:', error);
        }
    });
}

window.addEventListener('DOMContentLoaded', loadStats);