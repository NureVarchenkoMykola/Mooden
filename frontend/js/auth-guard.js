(function() {
    const ROLES = {
        'student':  { label: 'студента',  path: 'student-dashboard.html' },
        'teacher':  { label: 'викладача', path: 'teacher-dashboard.html' },
        'moderator': { label: 'модератора', path: 'moderator-dashboard.html' }
    };

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');

    const roleMeta = document.querySelector('meta[name="page-role"]');
    const requiredRole = roleMeta ? roleMeta.getAttribute('content') : null;

    const forceRedirect = () => {
        if (!token) {
            renderError("Ви не авторизовані. Повертаємо на сторінку входу...", "../index.html");
            return;
        }

        const userConfig = ROLES[userRole];
        const targetUrl = userConfig ? userConfig.path : '../index.html';
        
        const requiredLabel = ROLES[requiredRole] ? ROLES[requiredRole].label : requiredRole;
        
        let msg = `Ця сторінка лише для <b>${requiredLabel}</b>.`;
        
        if (!userConfig) {
            msg = "Ваша роль не розпізнана системою. Повертаємо на головну...";
            console.warn("Невідома роль користувача в auth-guard:", userRole);
        } else {
            msg += " Повертаємо вас до вашого кабінету...";
        }

        renderError(msg, targetUrl);
    };

    function renderError(msg, url) {
        document.documentElement.innerHTML = `
            <body style="background: #0B1220; color: #EBE5D5; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; margin: 0;">
                <div style="text-align: center; padding: 1rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
                    <p style="margin-bottom: 1.5rem; font-size: 1.2rem; line-height: 1.5;">${msg}</p>
                    <a href="${url}" style="color: #E8A44A; text-decoration: none; font-weight: 600; border: 1px solid #E8A44A; padding: 0.8rem 1.5rem; border-radius: 0.4rem; transition: 0.3s opacity;">
                        Перейти
                    </a>
                </div>
            </body>
        `;
        setTimeout(() => window.location.replace(url), 1500);
    }

    if (!token || (requiredRole && userRole !== requiredRole)) {
        forceRedirect();
    }
})();