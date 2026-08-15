// general-todo-tab.js — standalone to-do list (landing tab)

function generalTodoPersist() {
    var board = getGeneralTodoBoard();
    board.lastUpdated = new Date().toISOString();
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
}

function generalTodoGetVisibleTasks(board) {
    return getValues(board?.tasks).filter(function(task) {
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

function generalTodoTaskKeyHandler(event) {
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

function generalTodoSaveTaskText(inputEl) {
    if (!inputEl) return;
    var taskId = inputEl.getAttribute('data-task-id');
    if (!taskId) return;

    var board = getGeneralTodoBoard();
    var task = board.tasks[taskId];
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
    generalTodoPersist();
    // Defer: this runs from the input's blur handler — re-rendering synchronously
    // destroys the input mid-event and can re-fire blur on the detached node
    setTimeout(renderGeneralTodoTab, 0);
}

function generalTodoToggleTask(taskId) {
    var board = getGeneralTodoBoard();
    var task = board.tasks[taskId];
    if (!task || task.deletedAt) return;

    var now = new Date().toISOString();
    task.done = !task.done;
    task.completedAt = task.done ? now : null;
    task.updatedAt = now;
    generalTodoPersist();
    renderGeneralTodoTab();
}

function generalTodoDeleteTask(taskId) {
    var board = getGeneralTodoBoard();
    var task = board.tasks[taskId];
    if (!task || task.deletedAt) return;

    var now = new Date().toISOString();
    task.deletedAt = now;
    task.updatedAt = now;
    generalTodoPersist();
    renderGeneralTodoTab();
}

function generalTodoAddTask() {
    var input = document.getElementById('gtd-new-input');
    if (!input) return;

    var text = input.value.trim();
    if (!text) {
        input.focus();
        return;
    }

    var board = getGeneralTodoBoard();
    var taskId = generateId('gtodo');
    var now = new Date().toISOString();
    board.tasks[taskId] = {
        id: taskId,
        text: text,
        done: false,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        deletedAt: null
    };
    input.value = '';
    generalTodoPersist();
    renderGeneralTodoTab();
    input.focus();
}

function generalTodoHandleAddKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        generalTodoAddTask();
    }
}

function renderGeneralTodoTab() {
    var container = document.getElementById('tab-generaltodo');
    if (!container) return;

    var board = getGeneralTodoBoard();
    var tasks = generalTodoGetVisibleTasks(board);
    var openCount = tasks.filter(function(t) { return !t.done; }).length;
    var doneCount = tasks.filter(function(t) { return t.done; }).length;

    var html = '<div class="gtd-header">'
        + '<div class="gtd-title">'
        + '<h2>To-Do List</h2>'
        + '<p>Your general-purpose checklist. Add anything, check it off when done.</p>'
        + '</div>'
        + '<div class="gtd-meta">'
        + '<span class="gtd-pill">' + openCount + ' open</span>'
        + '<span class="gtd-pill gtd-pill-done">' + doneCount + ' done</span>'
        + '</div>'
        + '</div>';

    html += '<div class="gtd-add-row">';
    html += '<input id="gtd-new-input" class="gtd-add-input" type="text" placeholder="What needs to be done?" onkeydown="generalTodoHandleAddKey(event)">';
    html += '<button class="gtd-add-btn" onclick="generalTodoAddTask()">Add</button>';
    html += '</div>';

    if (tasks.length === 0) {
        html += '<div class="gtd-empty">No tasks yet. Add one above to get started.</div>';
        container.innerHTML = html;  // all user text escaped via escapeHtml()
        return;
    }

    html += '<div class="gtd-list">';
    tasks.forEach(function(task) {
        var safeTaskId = String(task.id || '').replace(/['"\\]/g, '');
        html += '<div class="gtd-task-row' + (task.done ? ' gtd-row-done' : '') + '">';
        html += '<input class="gtd-task-check" type="checkbox" ' + (task.done ? 'checked ' : '') + 'onclick="generalTodoToggleTask(\'' + safeTaskId + '\')">';
        html += '<input class="gtd-task-input' + (task.done ? ' gtd-done' : '') + '" type="text" '
            + 'value="' + escapeHtml(task.text || '') + '" '
            + 'data-original="' + escapeHtml(task.text || '') + '" '
            + 'data-task-id="' + escapeHtml(task.id || '') + '" '
            + 'onkeydown="generalTodoTaskKeyHandler(event)" '
            + 'onblur="generalTodoSaveTaskText(this)">';
        html += '<button class="gtd-task-del" onclick="generalTodoDeleteTask(\'' + safeTaskId + '\')" title="Delete task">&times;</button>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;  // all user text escaped via escapeHtml()

    container.querySelectorAll('.gtd-task-input').forEach(function(input) {
        var stored = input.getAttribute('data-original') || '';
        if (input.value !== stored) input.value = stored;
    });
}
