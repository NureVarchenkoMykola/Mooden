document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    initTabs();

    try {
        const response = await fetch(`${API_BASE_URL}/student/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            const currentLang = document.documentElement.lang || 'uk';
            showToast(getTranslation(currentLang, `errors.${errorData.message}`), 'error');
            console.error(`[Dev Mode] Profile load failed. Status: ${response.status}, Code: ${errorData.message}`);

            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../index.html';
            }
            return;
        }

        const data = await response.json();
        renderProfile(data);

    } catch (error) {
        const currentLang = document.documentElement.lang || 'uk';
        showToast(getTranslation(currentLang, 'errors.UNKNOWN_ERROR'), 'error');
        console.error('[Dev Mode] Critical failure during profile initialization:', error);
    }
});

function renderProfile(data) {
    if (!data) return;
    const lang = data.user.lang || 'uk';

    document.getElementById('userName').textContent = data.user.full_name;
    document.getElementById('userEmail').textContent = data.user.email;
    document.getElementById('avatarBig').textContent = data.user.full_name[0].toUpperCase();

    const formattedId = formatUserId(data.user);
    document.getElementById('userIdDisplay').textContent = formattedId;

    const tagsContainer = document.getElementById('heroTags');
    const tags = [
        { text: data.user.department, class: '' },
        { text: data.user.group, class: '' },
        { text: `${data.user.course_year} ${getTranslation(lang, 'profile.course_suffix')}`, class: '' },
        { text: data.user.degree, class: '' },
        { text: data.user.study_form, class: 'accent' }
    ];
    tagsContainer.innerHTML = tags.filter(t => t.text).map(t => `<span class="tag ${t.class}">${t.text}</span>`).join('');

    document.getElementById('statAvg').textContent = Number(data.stats.avgGrade).toFixed(1);
    document.getElementById('statCourses').textContent = data.stats.activeCourses;
    document.getElementById('statTasks').textContent = data.stats.completedTasks;
    document.getElementById('statAttendance').textContent = `${data.stats.attendance}%`;
    document.getElementById('statCoins').textContent = data.user.coins;
    document.getElementById('statAchievements').textContent = data.stats.achievementsCount;

    const coursesCont = document.getElementById('profileCourses');
    if (data.courses && data.courses.length > 0) {
        coursesCont.innerHTML = data.courses.map(course => {
            const courseColor = course.color_accent || 'var(--text-gold)';
            
            return `
            <a href="course.html?id=${course.id}" class="p-course-item" style="--accent-color: ${courseColor}">
                <div class="p-course-info">
                    <p class="p-course-title"><strong>${course.title}</strong></p>
                    <div class="p-progress-wrapper">
                        <div class="p-progress-bar">
                            <div class="p-progress-fill" style="--progress-width: ${course.progress_percent}%"></div>
                        </div>
                        <span class="p-progress-val">${course.progress_percent}%</span>
                    </div>
                </div>
                <span class="p-btn-enter">➔</span>
            </a>`;
        }).join('');
    } else {
        coursesCont.innerHTML = `<p class="p-empty-msg">${getTranslation(lang, 'dashboard.empty_courses_student')}</p>`;
    }

    const deadlinesCont = document.getElementById('profileDeadlines');
    if (data.deadlines && data.deadlines.length > 0) {
        deadlinesCont.innerHTML = data.deadlines.map(d => {
            const deadColor = d.color_accent || 'var(--text-gold)';

            return `
                <div class="p-deadline-card" style="--dot-color: ${deadColor}">
                    <div class="p-deadline-dot"></div>
                    <div class="p-deadline-info">
                        <p class="p-deadline-task">${d.title}</p>
                        <p class="p-deadline-course">${d.course_name}</p>
                        <p class="p-deadline-time">
                            ${new Date(d.deadline).toLocaleDateString(lang === 'en' ? 'en-US' : 'uk-UA', { day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                </div>`;
        }).join('');
    } else {
        deadlinesCont.innerHTML = `<p class="p-empty-msg">${getTranslation(lang, 'dashboard.empty_deadlines')}</p>`;
    }

    const achCont = document.getElementById('profileAchievements');

    if (data.achievements && data.achievements.length > 0) {
        achCont.innerHTML = data.achievements.map(ach => `
            <div class="ach-item">
                <span class="ach-icon">${ach.icon || '🏆'}</span>
                <div class="ach-text">
                    <p class="ach-name">${ach.title}</p>
                    <p class="ach-desc">${ach.description}</p>
                </div>
                <span class="ach-reward">+${ach.reward} 💸</span>
            </div>
        `).join('');
    } else {
        achCont.innerHTML = `<p class="p-empty-msg">${getTranslation(lang, 'profile.empty_achievements')}</p>`;
    }

    const skillsGrid = document.getElementById('skillsGrid');
    if (data.skills && data.skills.length > 0) {
        skillsGrid.innerHTML = data.skills.map(skill => `
            <div class="skill-badge">
                <span class="skill-check">✓</span> ${skill}
            </div>
        `).join('');
    } else {
        skillsGrid.innerHTML = `<p class="empty-msg">${getTranslation(lang, 'profile.empty_skills')}</p>`;
    }

    const activityCont = document.querySelector('.activity-stub');
    const counts = data.weeklyActivity.map(a => parseInt(a.count));
    const maxVal = Math.max(...counts, 1); 

    activityCont.innerHTML = `
        <div class="activity-chart">
            ${data.weeklyActivity.map(a => {
                const currentCount = parseInt(a.count);
                
                const formattedDate = new Date(a.day_raw).toLocaleDateString(lang === 'en' ? 'en-US' : 'uk-UA', { 
                    day: '2-digit', 
                    month: '2-digit' 
                });
                const height = currentCount > 0 ? (currentCount / maxVal) * 100 : 0;
                
                return `
                    <div class="activity-col">
                        <div class="bar-wrapper">
                            <div class="activity-bar" style="height: ${height}%" title="Оцінок: ${currentCount}"></div>
                        </div>
                        <span class="activity-date">${formattedDate}</span>
                    </div>`;
            }).join('')}
        </div>`;

    const fullGradesTable = document.getElementById('fullGradesTable');
    if (data.fullGrades && data.fullGrades.length > 0) {
        fullGradesTable.innerHTML = data.fullGrades.map(g => `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="background:${g.color_accent}; width:8px; height:8px; border-radius:50%"></span>
                        ${g.course_title}
                    </div>
                </td>
                <td>${g.task_title}</td>
                <td>${new Date(g.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'uk-UA')}</td>
                <td class="grade-val-cell"><strong>${g.grade_value}</strong></td>
            </tr>
        `).join('');
    }

    const fullAchGrid = document.getElementById('fullAchievementsGrid');
    if (data.allAchievements && data.allAchievements.length > 0) {
        fullAchGrid.innerHTML = data.allAchievements.map(ach => `
            <div class="ach-card-full">
                <div style="font-size: 2.5rem; margin-bottom: 1rem;">${ach.icon || '🏆'}</div>
                <h4 style="margin-bottom: 8px;">${ach.title}</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">${ach.description}</p>
                <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-gold);">
                    +${ach.reward} 💸 • ${new Date(ach.earned_at).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    }

    const timeline = document.getElementById('activityTimeline');
    if (data.history && data.history.length > 0) {
        timeline.innerHTML = data.history.map(item => {
            const date = new Date(item.date).toLocaleString(lang === 'en' ? 'en-US' : 'uk-UA', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            });

            let text = '';
            if (item.type === 'grade') {
                text = `<span class="t-type">${getTranslation(lang, 'profile.event_grade')}:</span> ${item.title} — <strong>${item.value}</strong>`;
            } else {
                text = `<span class="t-type">${getTranslation(lang, 'profile.event_achievement')}:</span> ${item.title}`;
            }

            return `
                <div class="timeline-item">
                    <span class="t-date">${date}</span>
                    <p class="t-content">${text}</p>
                </div>
            `;
        }).join('');
    } else {
        timeline.innerHTML = `<p class="p-empty-msg">${getTranslation(lang, 'profile.empty_history')}</p>`;
    }

    const shareBtn = document.getElementById('shareProfileBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const formattedId = formatUserId(data.user);
            const profileUrl = `${window.location.origin}/public/profile/${formattedId}`;
            
            navigator.clipboard.writeText(profileUrl).then(() => {
                const currentLang = document.documentElement.lang || 'uk';
                showToast(getTranslation(currentLang, 'profile.link_copied'), 'success');
            }).catch(err => {
                showToast(getTranslation(currentLang, 'errors.COPY_ERROR'), 'error');
            });
        });
    }

    initGlobalPasswordChange('changePasswordForm');
}

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${targetTab}`) {
                    content.classList.add('active');
                }
            });
        });
    });
}