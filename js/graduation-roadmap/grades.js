// grades.js — courseStructures, grade calculator, grade-deadline sync

// ==================== GRADE CALCULATOR ====================
const courseStructures = {
    oralmed: {
        name: 'Oral Medicine',
        passing: 60,
        components: [
            { id: 'participation', name: 'Participation', weight: 12.5, editable: true },
            { id: 'quiz1', name: 'Quiz 1', weight: 2.5, editable: true },
            { id: 'quiz2', name: 'Quiz 2', weight: 2.5, editable: true },
            { id: 'quiz3', name: 'Quiz 3', weight: 2.5, editable: true },
            { id: 'quiz4', name: 'Quiz 4', weight: 2.5, editable: true },
            { id: 'quiz5', name: 'Quiz 5', weight: 2.5, editable: true },
            { id: 'quiz6', name: 'Quiz 6', weight: 2.5, editable: true },
            { id: 'quiz7', name: 'Quiz 7', weight: 2.5, editable: true },
            { id: 'quiz8', name: 'Quiz 8', weight: 2.5, editable: true },
            { id: 'quiz9', name: 'Quiz 9', weight: 2.5, editable: true },
            { id: 'quiz10', name: 'Quiz 10', weight: 2.5, editable: true },
            { id: 'midterm', name: 'Midterm', weight: 25, editable: true },
            { id: 'final', name: 'Final', weight: 25, editable: true },
            { id: 'passionProject', name: 'Passion Project', weight: 12.5, editable: true }
        ]
    },
    paincontrol: {
        name: 'Pain Control 2',
        passing: 60,
        components: [
            { id: 'rx1', name: 'Rx #1', weight: 2, editable: true },
            { id: 'takehome1', name: 'Take Home Exam 1', weight: 12, editable: true },
            { id: 'midterm', name: 'Midterm', weight: 30, editable: true },
            { id: 'medConsult', name: 'Medical Consultation', weight: 2, editable: true },
            { id: 'rx2', name: 'Rx #2', weight: 2, editable: true },
            { id: 'takehome2', name: 'Take Home Exam 2', weight: 12, editable: true },
            { id: 'final', name: 'Final', weight: 40, editable: true }
        ]
    },
    critthink: {
        name: 'Critical Thinking',
        passing: 60,
        components: [
            { id: 'quiz1', name: 'Quiz 1', weight: 20, editable: true },
            { id: 'quiz2', name: 'Quiz 2', weight: 20, editable: true },
            { id: 'pico', name: 'PICO', weight: 3, editable: true },
            { id: 'individualArticle', name: 'Individual Article', weight: 12, editable: true },
            { id: 'groupArticles', name: 'Group Articles', weight: 6, editable: true },
            { id: 'groupPpt', name: 'Group PowerPoint', weight: 12, editable: true },
            { id: 'groupVideo', name: 'Group Video', weight: 9, editable: true },
            { id: 'systematicReview', name: 'Systematic Review', weight: 12, editable: true },
            { id: 'peerReview', name: 'Peer Review', weight: 6, editable: true }
        ]
    },
    peds: {
        name: 'Pediatric Dentistry',
        passing: 60,
        components: [
            { id: 'exam1', name: 'Exam 1 (Midterm)', weight: 40, editable: true, defaultGrade: 77 },
            { id: 'exam2', name: 'Exam 2 (Cumulative)', weight: 45, editable: true },
            { id: 'exam3', name: 'Exam 3 + Attendance', weight: 7.5, editable: true },
            { id: 'headstart', name: 'Headstart Rotation', weight: 2.5, editable: true, defaultGrade: 100 },
            { id: 'orthoModule', name: 'Orthodontic Module', weight: 5, editable: true }
        ]
    },
    perio: {
        name: 'Periodontology 2',
        passing: 65,
        components: [
            { id: 'midterm', name: 'Midterm', weight: 40, editable: true },
            { id: 'writtenAssignment', name: 'Written Assignment', weight: 10, editable: true, defaultGrade: 100 },
            { id: 'discussion', name: 'In-Person Discussion', weight: 5, editable: true },
            { id: 'final', name: 'Final', weight: 45, editable: true }
        ]
    },
    ortho: {
        name: 'Orthodontics',
        passing: 60,
        components: [
            { id: 'midterm', name: 'Midterm', weight: 50, editable: true },
            { id: 'final', name: 'Final', weight: 50, editable: true }
        ]
    }
};

function loadCourseGrades() {
    const courseId = document.getElementById('gradeCoursePicker').value;
    const course = courseStructures[courseId];
    const savedGrades = roadmapData.grades[courseId] || {};

    // Calculate running totals first
    let earnedPoints = 0;
    let completedWeight = 0;
    let totalComponents = course.components.length;
    let completedComponents = 0;

    course.components.forEach(comp => {
        const savedGrade = savedGrades[comp.id];
        const defaultGrade = comp.defaultGrade;
        const grade = savedGrade !== undefined && savedGrade !== null ? savedGrade : defaultGrade;
        if (grade !== undefined && grade !== null && grade !== '') {
            earnedPoints += (parseFloat(grade) / 100) * comp.weight;
            completedWeight += comp.weight;
            completedComponents++;
        }
    });

    const remainingWeight = 100 - completedWeight;
    const currentGrade = completedWeight > 0 ? (earnedPoints / completedWeight * 100) : 0;

    // Running total header
    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 20px; padding: 15px; background: rgba(5, 150, 105, 0.1); border-radius: 8px; border: 1px solid #059669;">
            <div style="text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #10b981;">${earnedPoints.toFixed(1)}</div>
                <div style="font-size: 0.8em; color: #b0bcc8;">Points Earned</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #60a5fa;">${completedWeight.toFixed(1)}%</div>
                <div style="font-size: 0.8em; color: #b0bcc8;">Completed</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #d97706;">${remainingWeight.toFixed(1)}%</div>
                <div style="font-size: 0.8em; color: #b0bcc8;">Remaining</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: ${currentGrade >= course.passing ? '#10b981' : '#f87171'};">${currentGrade.toFixed(1)}%</div>
                <div style="font-size: 0.8em; color: #b0bcc8;">Current Avg</div>
            </div>
        </div>
    `;

    html += '<div class="table-container"><table><thead><tr><th>Component</th><th>Weight</th><th>Your Grade (%)</th><th>Points Earned</th></tr></thead><tbody>';

    // For Oral Med, group quizzes together visually
    let inQuizSection = false;

    course.components.forEach((comp, idx) => {
        const savedGrade = savedGrades[comp.id];
        const defaultGrade = comp.defaultGrade || '';
        const grade = savedGrade !== undefined && savedGrade !== null ? savedGrade : defaultGrade;
        const hasGrade = grade !== '' && grade !== null && grade !== undefined;
        const pointsEarned = hasGrade ? (parseFloat(grade) / 100 * comp.weight).toFixed(2) : '—';

        // Check if this is a quiz (for Oral Med grouping)
        const isQuiz = comp.id.startsWith('quiz') && courseId === 'oralmed';

        // Add quiz section header
        if (isQuiz && !inQuizSection) {
            html += `<tr style="background: rgba(96, 165, 250, 0.1);"><td colspan="4" style="font-weight: 600; color: #60a5fa; padding: 10px;">📝 Weekly Quizzes (10 × 2.5% = 25% total)</td></tr>`;
            inQuizSection = true;
        }
        if (!isQuiz && inQuizSection) {
            inQuizSection = false;
        }

        const rowStyle = hasGrade ? 'background: rgba(5, 150, 105, 0.05);' : '';
        const statusIcon = hasGrade ? '<span style="color: #10b981; margin-left: 5px;">✓</span>' : '';

        html += `
            <tr style="${rowStyle}">
                <td>${comp.name}${statusIcon}</td>
                <td>${comp.weight}%</td>
                <td>
                    <input type="number" min="0" max="100" value="${grade}"
                        onchange="updateGrade('${courseId}', '${comp.id}', this.value)"
                        style="width: 80px; padding: 8px; background: ${hasGrade ? 'rgba(5, 150, 105, 0.2)' : '#1e293b'}; border: 1px solid ${hasGrade ? '#059669' : '#374151'}; border-radius: 4px; color: #e2e8f0;">
                </td>
                <td style="color: ${hasGrade ? '#10b981' : '#94a3b8'};">${pointsEarned !== '—' ? pointsEarned + ' pts' : '—'}</td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    html += `<p style="margin-top: 15px; color: #b0bcc8;">Minimum to pass: <strong style="color: ${course.passing > 60 ? '#f87171' : '#e2e8f0'};">${course.passing}%</strong>${course.passing > 60 ? ' ⚠️ Higher than standard!' : ''}</p>`;

    document.getElementById('gradeEntrySection').innerHTML = html;

    calculateNeeded();
}

function updateGrade(courseId, componentId, value) {
    if (!roadmapData.grades[courseId]) {
        roadmapData.grades[courseId] = {};
    }
    const grade = value === '' ? null : parseFloat(value);
    roadmapData.grades[courseId][componentId] = grade;

    // Sync back to deadlines - find matching deadline and update
    syncGradeToDeadline(courseId, componentId, grade);

    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
    }
    loadCourseGrades(); // Refresh the display with new running totals
}

// Sync grade changes from Grades tab back to Deadlines tab
function syncGradeToDeadline(courseId, componentId, grade) {
    // Map course IDs to deadline course names
    const courseMap = {
        'oralmed': 'Oral Med',
        'paincontrol': 'Pain Control 2',
        'critthink': 'Critical Thinking',
        'peds': 'Peds',
        'perio': 'Perio 2',
        'ortho': 'Orthodontics'
    };

    const courseName = courseMap[courseId];
    if (!courseName) return;

    // Find matching deadline
    deadlines.forEach((d, idx) => {
        const what = d.what.toLowerCase();
        const course = d.course.toLowerCase();

        if (!course.includes(courseName.toLowerCase().split(' ')[0])) return;

        let isMatch = false;

        // Quiz matching (use regex to avoid false positives: quiz1 matching quiz10)
        const quizMatch = componentId.match(/quiz(\d+)/);
        if (quizMatch) {
            const quizNum = quizMatch[1];
            const quizRegex = new RegExp('quiz\\s*' + quizNum + '(?!\\d)', 'i');
            if (quizRegex.test(d.what)) {
                isMatch = true;
            }
        }

        // Exam/Midterm/Final matching
        if (componentId === 'midterm' && what.includes('midterm')) isMatch = true;
        if (componentId === 'final' && what.includes('final') && !what.includes('passion')) isMatch = true;
        if (componentId === 'exam1' && what.includes('exam 1')) isMatch = true;
        if (componentId === 'exam2' && what.includes('exam 2')) isMatch = true;
        if (componentId === 'exam3' && what.includes('exam 3')) isMatch = true;

        // Assignment matching
        if (componentId === 'rx1' && (what.includes('rx #1') || what.includes('rx#1'))) isMatch = true;
        if (componentId === 'rx2' && (what.includes('rx #2') || what.includes('rx#2'))) isMatch = true;
        if (componentId === 'takehome1' && what.includes('take home') && what.includes('1')) isMatch = true;
        if (componentId === 'takehome2' && what.includes('take home') && what.includes('2')) isMatch = true;
        if (componentId === 'medConsult' && what.includes('medical consultation')) isMatch = true;
        if (componentId === 'passionProject' && what.includes('passion project')) isMatch = true;

        // Critical Thinking project matching
        if (componentId === 'groupPpt' && what.includes('group powerpoint')) isMatch = true;
        if (componentId === 'groupVideo' && what.includes('group video')) isMatch = true;
        if (componentId === 'systematicReview' && what.includes('systematic review')) isMatch = true;

        if (isMatch) {
            if (grade !== null) {
                d.done = true;
                d.grade = grade;

                // CRITICAL FIX: Persist completion to roadmapData for save
                // Use stable deadline ID instead of array index (indices shift when custom deadlines added)
                if (!roadmapData.completedDeadlines) roadmapData.completedDeadlines = {};
                const stableId = getDeadlineId(d);
                roadmapData.completedDeadlines[stableId] = {
                    date: d.date,
                    what: d.what,
                    course: d.course,
                    weight: d.weight,
                    grade: grade,
                    completedAt: new Date().toISOString(),
                    syncedFromGrades: true
                };
            } else {
                d.done = false;
                d.grade = null;

                // Remove from completedDeadlines if unmarking (using stable ID)
                const stableId = getDeadlineId(d);
                if (roadmapData.completedDeadlines && roadmapData.completedDeadlines[stableId]) {
                    delete roadmapData.completedDeadlines[stableId];
                }
            }
        }
    });

    // CRITICAL FIX: Save the updated completion status
    const saved = saveData();
    if (!saved) {
        showToast('Save blocked — try refreshing', 'error');
    }

    // Re-render deadlines to show updated status
    renderDeadlines();
    renderDashboard();
}

function calculateNeeded() {
    const courseId = document.getElementById('gradeCoursePicker').value;
    const course = courseStructures[courseId];
    const savedGrades = roadmapData.grades[courseId] || {};
    const targetGrade = parseFloat(document.getElementById('targetGrade').value);

    let earnedPoints = 0;
    let completedWeight = 0;
    let remainingWeight = 0;
    const remainingComponents = [];

    course.components.forEach(comp => {
        const grade = savedGrades[comp.id];
        if (grade !== null && grade !== undefined && grade !== '') {
            earnedPoints += (parseFloat(grade) / 100) * comp.weight;
            completedWeight += comp.weight;
        } else {
            remainingWeight += comp.weight;
            remainingComponents.push(comp);
        }
    });

    const pointsNeeded = targetGrade - earnedPoints;
    const avgNeeded = remainingWeight > 0 ? (pointsNeeded / remainingWeight) * 100 : 0;

    let resultHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="stat-box">
                <div class="number" style="color: #10b981;">${earnedPoints.toFixed(1)}</div>
                <div class="label">Points Earned</div>
            </div>
            <div class="stat-box">
                <div class="number">${completedWeight}%</div>
                <div class="label">Completed</div>
            </div>
            <div class="stat-box">
                <div class="number">${remainingWeight}%</div>
                <div class="label">Remaining</div>
            </div>
        </div>
    `;

    if (remainingWeight === 0) {
        const finalGrade = earnedPoints;
        const passed = finalGrade >= course.passing;
        resultHtml += `
            <div class="grade-result ${passed ? 'passing' : 'failing'}">
                <strong>Final Grade: ${finalGrade.toFixed(1)}%</strong><br>
                ${passed ? '✅ Passed!' : '❌ Below passing threshold'}
            </div>
        `;
    } else if (avgNeeded > 100) {
        resultHtml += `
            <div class="grade-result failing">
                <strong>❌ Target of ${targetGrade}% is NOT achievable</strong><br>
                You would need ${avgNeeded.toFixed(1)}% average on remaining work, which exceeds 100%.
                <br><br>
                <strong>Maximum possible grade:</strong> ${(earnedPoints + remainingWeight).toFixed(1)}%
            </div>
        `;
    } else if (avgNeeded <= 0) {
        resultHtml += `
            <div class="grade-result passing">
                <strong>✅ You've already secured ${targetGrade}%!</strong><br>
                You have ${earnedPoints.toFixed(1)} points. Even with 0% on remaining work, you'll pass this threshold.
            </div>
        `;
    } else {
        const isAchievable = avgNeeded <= 100;
        const difficulty = avgNeeded <= 60 ? 'Very achievable' : avgNeeded <= 75 ? 'Achievable with effort' : avgNeeded <= 85 ? 'Challenging but possible' : 'Very difficult';

        resultHtml += `
            <div class="grade-result ${isAchievable ? 'passing' : 'failing'}">
                <strong>To achieve ${targetGrade}% (${getGradeLetter(targetGrade)}):</strong><br><br>
                You need an average of <strong style="font-size: 1.3em; color: ${avgNeeded <= 70 ? '#10b981' : avgNeeded <= 85 ? '#d97706' : '#dc2626'};">${avgNeeded.toFixed(1)}%</strong> on remaining assignments.<br>
                <span style="color: #b0bcc8;">${difficulty}</span>
            </div>
        `;

        if (remainingComponents.length > 0) {
            resultHtml += `
                <div style="margin-top: 15px;">
                    <strong>Remaining Components:</strong>
                    <ul style="margin-top: 10px; margin-left: 20px; color: #b0bcc8;">
                        ${remainingComponents.map(c => `<li>${c.name} (${c.weight}%)</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }

    document.getElementById('gradeResults').innerHTML = resultHtml;
}

function getGradeLetter(percent) {
    if (percent >= 93) return 'A';
    if (percent >= 90) return 'A-';
    if (percent >= 87) return 'B+';
    if (percent >= 83) return 'B';
    if (percent >= 80) return 'B-';
    if (percent >= 77) return 'C+';
    if (percent >= 73) return 'C';
    if (percent >= 70) return 'C-';
    if (percent >= 60) return 'D';
    return 'F';
}
