document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    
    const statusElem = document.getElementById('userStatus');
    if (statusElem) statusElem.textContent = role;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '../index.html';
        });
    }
});