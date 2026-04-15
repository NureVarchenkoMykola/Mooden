const API_BASE_URL = 'http://localhost:5000';

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/stats`);
        const data = await response.json();

        document.getElementById('count-students').textContent = data.students;
        document.getElementById('count-hours').textContent = data.hours;
        document.getElementById('count-tasks').textContent = data.tasks;
    } catch (error) {
        console.log('Помилка статистики, використовуються стандартні значення'); // сделать лог
    }
}

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const rememberMe = document.getElementById('remember').checked;

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
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
                showToast(data.message || 'Помилка входу');
            }
        } catch (error) {
            console.error('Серверна помилка:', error);
            showToast('Не вдалося з’єднатися з сервером');
        }
    });
}

window.addEventListener('DOMContentLoaded', loadStats);