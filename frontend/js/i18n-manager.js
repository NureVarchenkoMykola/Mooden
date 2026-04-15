function getTranslation(lang, path) {
    const keys = path.split('.');
    let result = translations[lang];
    keys.forEach(key => {
        if (result) result = result[key];
    });
    return result || path;
}

function applyStaticTranslations(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const path = el.getAttribute('data-i18n');
        el.textContent = getTranslation(lang, path);
    });
    document.documentElement.lang = lang;
}

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('mooden-lang') || 'uk';
    
    applyStaticTranslations(savedLang);
    const activeRadio = document.querySelector(`.lang-slider input[value="${savedLang}"]`);
    if (activeRadio) activeRadio.checked = true;

    const langInputs = document.querySelectorAll('.lang-slider input[name="lang"]');
    langInputs.forEach(input => {
        input.addEventListener('change', async (e) => {
            const newLang = e.target.value;
            localStorage.setItem('mooden-lang', newLang);
            applyStaticTranslations(newLang);

            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            if (token && typeof API_BASE_URL !== 'undefined') {
                try {
                    await fetch(`${API_BASE_URL}/student/settings`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ lang: newLang })
                    });
                    setTimeout(() => location.reload(), 200);
                } catch (err) {
                    console.error('[Dev Mode] Error syncing lang:', err);
                }
            }
        });
    });
});