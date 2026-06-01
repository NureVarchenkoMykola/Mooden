(function() {
    const DASHBOARD_MAP = {
        student: 'student-dashboard.html',
        teacher: 'teacher-dashboard.html',
        moderator: 'moderator-dashboard.html'
    };

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');

    if (!token || !role) {
        return;
    }

    const targetPage = DASHBOARD_MAP[role];

    if (!targetPage) {
        localStorage.clear();
        sessionStorage.clear();
        console.error('[Dev Mode] Redirect failed. Role found in storage but missing in DASHBOARD_MAP:', role);
        return;
    }

    const isInsidePagesFolder = window.location.pathname.includes('/pages/');

    window.location.href = isInsidePagesFolder
        ? `./${targetPage}`
        : `pages/${targetPage}`;
})();