async function initGlobalPasswordChange(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const oldPassword = form.querySelector('[data-type="old-password"]').value;
        const newPassword = form.querySelector('[data-type="new-password"]').value;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const currentLang = document.documentElement.lang || 'uk';

        try {
            const res = await fetch(`${API_BASE_URL}/user/change-password`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const result = await res.json();

            if (res.ok) {
                showToast(getTranslation(currentLang, 'profile.password_updated_success'), 'success');
                form.reset();
            } else {
                showToast(getTranslation(currentLang, `errors.${result.message}`), 'error');
            }
        } catch (err) {
            showToast(getTranslation(currentLang, 'errors.NETWORK_ERROR'), 'error');
        }
    };
}