const savedTheme = localStorage.getItem('mooden-theme') || 'dark';

if (savedTheme === 'light') {
    document.documentElement.classList.add('light-theme');
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    
    updateToggleUI(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isLight = document.documentElement.classList.toggle('light-theme');
            
            const newTheme = isLight ? 'light' : 'dark';
            
            localStorage.setItem('mooden-theme', newTheme);
            updateToggleUI(newTheme);
        });
    }
});

function updateToggleUI(theme) {
    const icon = document.querySelector('.theme-icon');
    const text = document.querySelector('.theme-text');
    
    if (!icon || !text) return;

    const lang = document.documentElement.lang || 'uk';

    if (theme === 'light') {
        icon.textContent = '☀️';
        text.textContent = getTranslation(lang, 'common.theme_light');
    } else {
        icon.textContent = '🌙';
        text.textContent = getTranslation(lang, 'common.theme_dark');
    }
}