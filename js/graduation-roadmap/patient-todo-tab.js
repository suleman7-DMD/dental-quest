// patient-todo-tab.js — per-patient checklist tab

let patientTodoShowHidden = false;

function patientTodoCleanText(text) {
    return String(text || '')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function patientTodoFirstSnippet(text, maxLen) {
    var cleaned = patientTodoCleanText(text);
    if (!cleaned) return '';
    var firstLine = cleaned.split('\n')[0].trim() || cleaned;
    var pipeIdx = firstLine.indexOf('|');
    if (pipeIdx !== -1) firstLine = firstLine.substring(0, pipeIdx).trim();
    var dashIdx = firstLine.indexOf(' — ');
    if (dashIdx !== -1) firstLine = firstLine.substring(0, dashIdx).trim();
    if (!maxLen || firstLine.length <= maxLen) return firstLine;
    return firstLine.slice(0, maxLen - 1).trim().replace(/[,:;.\-]+$/, '') + '...';
}

function patientTodoDomId(patientId) {
    return String(patientId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getPatientTodoEntry(patientId, createIfMissing) {
    var board = getPatientTodoBoard();
    if (!board.patients[patientId] && createIfMissing) {
        board.patients[patientId] = normalizePatientTodoEntry();
    }
    return board.patients[patientId] || null;
}

function patientTodoPersist() {
    var board = getPatientTodoBoard();
    board.lastUpdated = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
}

function patientTodoGetVisibleTasks(entry) {
    return getValues(entry?.tasks).filter(function(task) {
        return task && !task.deletedAt;
    }).sort(function(a, b) {
        var aDone = a.done ? 1 : 0;
        var bDone = b.done ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        var aStamp = a.createdAt || a.updatedAt || '';
        var bStamp = b.createdAt || b.updatedAt || '';
        if (aStamp !== bStamp) return aStamp < bStamp ? -1 : 1;
        return (a.id || '').localeCompare(b.id || '');
    });
}

function patientTodoGetSummary(patient) {
    var candidates = [
        patient?.txPlan,
        patient?.clinicalBrief?.snapshot,
        patient?.txCompletedByMe,
        patient?.txSummaryBU
    ];
    for (var i = 0; i < candidates.length; i++) {
        var cleaned = patientTodoCleanText(candidates[i]);
        if (cleaned) return cleaned;
    }
    return '';
}

function patientTodoGetLastVisit(patient, patientId) {
    var lastCompleted = (typeof getLastCompletedVisit === 'function') ? getLastCompletedVisit(patient, patientId) : null;
    if (lastCompleted) {
        return {
            date: lastCompleted.date || '',
            detail: [lastCompleted.procedures, lastCompleted.provider].filter(Boolean).join(' | ')
        };
    }

    var raw = patientTodoCleanText(patient?.lastVisit || '');
    if (!raw) return { date: '', detail: '' };
    var parts = raw.split('|').map(function(part) { return part.trim(); }).filter(Boolean);
    return {
        date: parts[0] || '',
        detail: parts.slice(1).join(' | ')
    };
}

function patientTodoGetNextVisit(patient, patientId) {
    var autoNext = (typeof getNextScheduledVisit === 'function') ? getNextScheduledVisit(patient, patientId) : '';
    var effectiveNext = patient?.nextVisitManual ? (patient?.nextVisit || '') : (autoNext || patient?.nextVisit || '');
    var raw = patientTodoCleanText(effectiveNext);
    if (!raw) {
        return { date: 'No apt scheduled', detail: '' };
    }

    var separator = raw.indexOf(' — ') !== -1 ? ' — ' : (raw.indexOf('|') !== -1 ? '|' : '');
    if (!separator) {
        return { date: patientTodoFirstSnippet(raw, 80), detail: '' };
    }

    var parts = raw.split(separator).map(function(part) { return part.trim(); }).filter(Boolean);
    return {
        date: parts[0] || '',
        detail: patientTodoFirstSnippet(parts.slice(1).join(' | '), 150)
    };
}

function patientTodoTaskKeyHandler(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.blur();
        return;
    }
    if (event.key === 'Escape') {
        event.preventDefault();
        event.currentTarget.value = event.currentTarget.dataset.original || '';
        event.currentTarget.blur();
    }
}

function patientTodoSaveTaskText(inputEl) {
    if (!inputEl) return;
    var patientId = inputEl.getAttribute('data-patient-id');
    var taskId = inputEl.getAttribute('data-task-id');
    if (!patientId || !taskId) return;

    var entry = getPatientTodoEntry(patientId, false);
    var task = entry?.tasks?.[taskId];
    if (!task || task.deletedAt) return;

    var original = inputEl.dataset.original || '';
    var nextText = inputEl.value.trim();
    if (!nextText) {
        inputEl.value = original;
        showToast('Task text cannot be blank', 'warning');
        return;
    }
    if (nextText === original) return;

    var now = new Date().toISOString();
    task.text = nextText;
    task.updatedAt = now;
    entry.lastUpdated = now;
    patientTodoPersist();
    // Defer: this runs from the input's blur handler — re-rendering synchronously
    // destroys the input mid-event and can re-fire blur on the detached node
    setTimeout(renderPatientTodoTab, 0);
}

function patientTodoToggleTask(patientId, taskId) {
    var entry = getPatientTodoEntry(patientId, false);
    var task = entry?.tasks?.[taskId];
    if (!task || task.deletedAt) return;

    var now = new Date().toISOString();
    task.done = !task.done;
    task.completedAt = task.done ? now : null;
    task.updatedAt = now;
    entry.lastUpdated = now;
    patientTodoPersist();
    renderPatientTodoTab();
}

function patientTodoDeleteTask(patientId, taskId) {
    var entry = getPatientTodoEntry(patientId, false);
    var task = entry?.tasks?.[taskId];
    if (!task || task.deletedAt) return;

    var now = new Date().toISOString();
    task.deletedAt = now;
    task.updatedAt = now;
    entry.lastUpdated = now;
    patientTodoPersist();
    renderPatientTodoTab();
}

function patientTodoAddTask(patientId) {
    var input = document.getElementById('pttd-new-' + patientTodoDomId(patientId));
    if (!input) return;

    var text = input.value.trim();
    if (!text) {
        input.focus();
        return;
    }

    var entry = getPatientTodoEntry(patientId, true);
    var taskId = generateId('pttodo');
    var now = new Date().toISOString();
    entry.hidden = false;
    entry.hiddenAt = null;
    entry.visibilityUpdatedAt = now;
    entry.lastUpdated = now;
    entry.tasks[taskId] = {
        id: taskId,
        text: text,
        done: false,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        deletedAt: null
    };
    input.value = '';
    patientTodoPersist();
    renderPatientTodoTab();
}

function patientTodoHandleAddKey(event, patientId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        patientTodoAddTask(patientId);
    }
}

function patientTodoHidePatient(patientId) {
    var entry = getPatientTodoEntry(patientId, true);
    var now = new Date().toISOString();
    entry.hidden = true;
    entry.hiddenAt = now;
    entry.visibilityUpdatedAt = now;
    entry.lastUpdated = now;
    patientTodoPersist();
    renderPatientTodoTab();
}

function patientTodoRestorePatient(patientId) {
    var entry = getPatientTodoEntry(patientId, true);
    var now = new Date().toISOString();
    entry.hidden = false;
    entry.hiddenAt = null;
    entry.visibilityUpdatedAt = now;
    entry.lastUpdated = now;
    patientTodoPersist();
    renderPatientTodoTab();
}

function patientTodoToggleHiddenPanel() {
    patientTodoShowHidden = !patientTodoShowHidden;
    renderPatientTodoTab();
}

function renderPatientTodoTab() {
    var container = document.getElementById('tab-patienttodos');
    if (!container) return;

    var patients = (typeof getAllPatientRecords === 'function')
        ? getAllPatientRecords()
        : (roadmapData.clinicalData?.patientRecords || {});
    var board = getPatientTodoBoard();
    var patientIds = Object.keys(patients).sort(function(a, b) {
        return (patients[a]?.name || '').localeCompare(patients[b]?.name || '');
    });
    var visibleIds = [];
    var hiddenIds = [];
    var openTaskCount = 0;

    patientIds.forEach(function(patientId) {
        if (patients[patientId]?.archived) return; // Archived patients excluded from to-do board
        var entry = board.patients[patientId];
        if (entry?.hidden) hiddenIds.push(patientId);
        else {
            visibleIds.push(patientId);
        }

        if (!entry?.hidden && entry?.tasks) {
            getValues(entry.tasks).forEach(function(task) {
                if (task && !task.deletedAt && !task.done) openTaskCount++;
            });
        }
    });

    var html = '<div class="pttd-header">'
        + '<div class="pttd-title">'
        + '<h2>Patient To-Do</h2>'
        + '<p>Every patient from your roster, with a persistent checklist under each chart.</p>'
        + '</div>'
        + '<div class="pttd-meta">'
        + '<span class="pttd-pill">' + visibleIds.length + ' shown</span>'
        + '<span class="pttd-pill">' + openTaskCount + ' open task' + (openTaskCount === 1 ? '' : 's') + '</span>'
        + (hiddenIds.length > 0
            ? '<button class="pttd-toggle-hidden" onclick="patientTodoToggleHiddenPanel()">' + (patientTodoShowHidden ? 'Hide' : 'Show') + ' Hidden (' + hiddenIds.length + ')</button>'
            : '')
        + '</div>'
        + '</div>';

    if (hiddenIds.length > 0 && patientTodoShowHidden) {
        html += '<div class="pttd-hidden-panel">';
        html += '<div class="pttd-hidden-title">Hidden Patients</div>';
        html += '<div class="pttd-hidden-list">';
        hiddenIds.forEach(function(patientId) {
            var patient = patients[patientId];
            if (!patient) return;
            var safePatientId = String(patientId).replace(/['"\\]/g, '');
            html += '<div class="pttd-hidden-row">';
            html += '<div><span class="pttd-hidden-name">' + escapeHtml(patient.name || 'Unnamed') + '</span>';
            html += '<span class="pttd-hidden-chart">#' + escapeHtml(patient.chartNumber || '') + '</span></div>';
            html += '<button class="pttd-action-btn" onclick="patientTodoRestorePatient(\'' + safePatientId + '\')">Restore</button>';
            html += '</div>';
        });
        html += '</div></div>';
    }

    if (visibleIds.length === 0) {
        html += '<div class="pttd-empty">No visible patients on this tab. Restore a hidden patient to bring them back.</div>';
        container.innerHTML = html;
        return;
    }

    html += '<div class="pttd-list">';
    visibleIds.forEach(function(patientId) {
        var patient = patients[patientId];
        if (!patient) return;
        var safePatientId = String(patientId).replace(/['"\\]/g, '');
        var domId = patientTodoDomId(patientId);
        var entry = getPatientTodoEntry(patientId, false) || normalizePatientTodoEntry();
        var tasks = patientTodoGetVisibleTasks(entry);
        var reliability = patient.reliability || 'yellow';
        var lastVisit = patientTodoGetLastVisit(patient, patientId);
        var nextVisit = patientTodoGetNextVisit(patient, patientId);
        var summary = patientTodoGetSummary(patient);
        var phoneDisplay = '';

        if (patient.phone) {
            var phoneParts = String(patient.phone).split('|').map(function(part) { return part.trim(); }).filter(Boolean);
            if (phoneParts.length > 0) {
                phoneDisplay = phoneParts[0] + (phoneParts.length > 1 ? ' +' + (phoneParts.length - 1) + ' more' : '');
            }
        }

        html += '<div class="pttd-card">';
        html += '<div class="pttd-card-header">';
        html += '<div class="pttd-identity">';
        html += '<span class="pttd-rel-dot pttd-rel-' + escapeHtml(reliability) + '"></span>';
        html += '<span class="pttd-name">' + escapeHtml(patient.name || 'Unnamed') + '</span>';
        if (patient.chartNumber) {
            html += '<span class="pttd-badge pttd-chart">#' + escapeHtml(patient.chartNumber) + '</span>';
        }
        if (phoneDisplay) {
            html += '<span class="pttd-badge pttd-phone">' + escapeHtml(phoneDisplay) + '</span>';
        }
        html += '</div>';
        html += '<button class="pttd-hide-btn" onclick="patientTodoHidePatient(\'' + safePatientId + '\')" title="Remove from this tab">×</button>';
        html += '</div>';

        var ctxRows = [];
        var lastCombined = [lastVisit.date, lastVisit.detail].filter(Boolean).join(' · ');
        if (lastCombined) {
            ctxRows.push('<div class="pttd-ctx-row"><span class="pttd-ctx-label">Last</span><span class="pttd-ctx-value">' + escapeHtml(lastCombined) + '</span></div>');
        }
        var noApt = nextVisit.date === 'No apt scheduled' && !nextVisit.detail;
        var nextCombined = noApt ? 'No apt scheduled' : [nextVisit.date, nextVisit.detail].filter(Boolean).join(' · ');
        if (nextCombined) {
            ctxRows.push('<div class="pttd-ctx-row"><span class="pttd-ctx-label">Next</span><span class="pttd-ctx-value' + (noApt ? ' pttd-none' : '') + '">' + escapeHtml(nextCombined) + '</span></div>');
        }
        if (summary) {
            ctxRows.push('<div class="pttd-ctx-row pttd-ctx-plan"><span class="pttd-ctx-label">Tx</span><span class="pttd-ctx-value pttd-ctx-multiline">' + escapeHtml(summary) + '</span></div>');
        }
        if (ctxRows.length > 0) {
            html += '<div class="pttd-context">' + ctxRows.join('') + '</div>';
        }

        html += '<div class="pttd-tasks">';
        if (tasks.length === 0) {
            html += '<div class="pttd-task-empty">No tasks yet</div>';
        }

        tasks.forEach(function(task) {
            var safeTaskId = String(task.id || '').replace(/['"\\]/g, '');
            html += '<div class="pttd-task-row' + (task.done ? ' pttd-row-done' : '') + '">';
            html += '<input class="pttd-task-check" type="checkbox" ' + (task.done ? 'checked ' : '') + 'onclick="patientTodoToggleTask(\'' + safePatientId + '\', \'' + safeTaskId + '\')">';
            html += '<input class="pttd-task-input' + (task.done ? ' pttd-done' : '') + '" type="text" '
                + 'value="' + escapeHtml(task.text || '') + '" '
                + 'data-original="' + escapeHtml(task.text || '') + '" '
                + 'data-patient-id="' + escapeHtml(patientId) + '" '
                + 'data-task-id="' + escapeHtml(task.id || '') + '" '
                + 'onkeydown="patientTodoTaskKeyHandler(event)" '
                + 'onblur="patientTodoSaveTaskText(this)">';
            html += '<button class="pttd-task-del" onclick="patientTodoDeleteTask(\'' + safePatientId + '\', \'' + safeTaskId + '\')" title="Delete task">×</button>';
            html += '</div>';
        });

        html += '<div class="pttd-add-row">';
        html += '<input id="pttd-new-' + domId + '" class="pttd-add-input" type="text" placeholder="Add task..." onkeydown="patientTodoHandleAddKey(event, \'' + safePatientId + '\')">';
        html += '<button class="pttd-add-btn" onclick="patientTodoAddTask(\'' + safePatientId + '\')">Add</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.pttd-task-input').forEach(function(input) {
        var stored = input.getAttribute('data-original') || '';
        if (input.value !== stored) input.value = stored;
    });
}
