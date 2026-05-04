(function() {
    const DASHBOARD_MAP = {
        'student':  'pages/student-dashboard.html',
        'teacher':  'pages/teacher-dashboard.html',
        'moderator': 'pages/moderator-dashboard.html'
    };

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');

    if (token && role) {
        const targetPage = DASHBOARD_MAP[role];

        if (targetPage) {
            window.location.href = targetPage;
        } else {
            localStorage.clear();
            sessionStorage.clear();
            console.error('[Dev Mode] Redirect failed. Role found in storage but missing in DASHBOARD_MAP:', role);
        }
    }
})();