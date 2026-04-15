/**
 * @param {string} message - Текст повідомлення
 * @param {string} type - error або success
 */
function showToast(message, type = 'error') {
    let toast = document.getElementById('main-toast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'main-toast';
        toast.className = 'toast-container';
        document.body.appendChild(toast);
    }

    const icon = type === 'success' ? '✅' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    toast.classList.remove('error', 'success', 'show');
    toast.classList.add(type);
    
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}