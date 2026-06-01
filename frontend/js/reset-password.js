const resetPasswordForm = document.getElementById('resetPasswordForm');

function getResetToken() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
}

function disableResetForm() {
    if (!resetPasswordForm) return;

    resetPasswordForm.querySelectorAll('input, button').forEach(element => {
        element.disabled = true;
    });
}

function redirectToLogin(delay = 1800) {
    setTimeout(() => {
        window.location.href = '../index.html';
    }, delay);
}

async function verifyResetToken() {
    const currentLang = document.documentElement.lang || 'uk';
    const token = getResetToken();

    if (!token) {
        showToast(getTranslation(currentLang, 'errors.RESET_TOKEN_REQUIRED'), 'error');
        disableResetForm();
        redirectToLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reset-password/verify?token=${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'RESET_TOKEN_VERIFY_ERROR');
        }
    } catch (error) {
        showToast(getTranslation(currentLang, `errors.${error.message}`), 'error');
        disableResetForm();
        redirectToLogin();
    }
}

if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const currentLang = document.documentElement.lang || 'uk';
        const token = getResetToken();

        const password = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        if (!token) {
            showToast(getTranslation(currentLang, 'errors.RESET_TOKEN_REQUIRED'), 'error');
            return;
        }

        if (!password || !confirmPassword) {
            showToast(getTranslation(currentLang, 'errors.PASSWORD_FIELDS_REQUIRED'), 'error');
            return;
        }

        if (password.length < 6) {
            showToast(getTranslation(currentLang, 'errors.PASSWORD_TOO_SHORT'), 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast(getTranslation(currentLang, 'errors.PASSWORDS_DO_NOT_MATCH'), 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    password,
                    confirmPassword
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || 'PASSWORD_RESET_ERROR');
            }

            showToast(getTranslation(currentLang, 'password_reset.password_updated'), 'success');
            resetPasswordForm.reset();

            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1200);
        } catch (error) {
            showToast(getTranslation(currentLang, `errors.${error.message}`), 'error');

            if (
                error.message === 'RESET_TOKEN_EXPIRED' ||
                error.message === 'RESET_TOKEN_REQUIRED'
            ) {
                disableResetForm();
                redirectToLogin();
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', verifyResetToken);