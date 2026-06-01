const forgotPasswordForm = document.getElementById('forgotPasswordForm');

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const currentLang = document.documentElement.lang || 'uk';
        const email = document.getElementById('emailInput').value.trim();

        if (!email) {
            showToast(getTranslation(currentLang, 'errors.EMAIL_REQUIRED'), 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || 'PASSWORD_RESET_REQUEST_ERROR');
            }

            showToast(getTranslation(currentLang, 'password_reset.link_sent'), 'success');
            forgotPasswordForm.reset();
        } catch (error) {
            showToast(getTranslation(currentLang, `errors.${error.message}`), 'error');
        }
    });
}