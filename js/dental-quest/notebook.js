// ============================================
// NOTEBOOK MODULE
// Extracted from index.html Phase 4
// Depends on: state.js (globals, notebook, getValues, getCount, generateId, escapeHtml)
// Depends on: firebase-sync.js (saveData)
// ============================================

let notebookSaveTimeout = null;

function openNotebook() {
    const modal = document.getElementById('notebookModal');
    if (!modal) {
        console.error('Notebook modal not found');
        return;
    }
    ensureModalOnBody(modal);

    try {
        // Ensure notebook is properly initialized
        if (!notebook) {
            notebook = { pages: {}, currentPageId: null };
        }
        if (!notebook.pages) {
            notebook.pages = {};
        }

        // Initialize with first page if none exist
        if (getCount(notebook.pages) === 0) {
            createNewPage();
        }

        renderNotebookTabs();
        renderNotebookContent();
        _modalOpenTime = Date.now();
        modal.classList.add('show');
    } catch (error) {
        console.error('Error opening notebook:', error);
    }
}

function closeNotebook() {
    const modal = document.getElementById('notebookModal');
    if (modal) modal.classList.remove('show');
    saveNotebook();
}

function createNewPage() {
    const pageCount = getCount(notebook.pages);
    const pageNumber = pageCount + 1;
    const id = generateId('page');
    const newPage = {
        id: id,
        title: `Page ${pageNumber}`,
        content: '',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        charCount: 0
    };

    notebook.pages[id] = newPage;
    notebook.currentPageId = id;

    if (getCount(notebook.pages) === 20) {
        showToast('Maximum 20 pages reached', '\u2139\uFE0F');
    }

    renderNotebookTabs();
    renderNotebookContent();
    saveNotebook();
}

function deletePage(pageId) {
    if (getCount(notebook.pages) === 1) {
        showToast('Cannot delete the last page', '\u26A0\uFE0F');
        return;
    }

    if (!confirm('Delete this page? This cannot be undone.')) {
        return;
    }

    delete notebook.pages[pageId];

    // Switch to first page if we deleted current page
    if (notebook.currentPageId === pageId) {
        const pageIds = Object.keys(notebook.pages);
        notebook.currentPageId = pageIds.length > 0 ? pageIds[0] : null;
    }

    renderNotebookTabs();
    renderNotebookContent();
    saveNotebook();
    showToast('Page deleted', '\u{1F5D1}\uFE0F');
}

function switchPage(pageId) {
    // Save current page first
    saveCurrentPageContent();

    notebook.currentPageId = pageId;
    renderNotebookTabs();
    renderNotebookContent();
}

function renderNotebookTabs() {
    const tabsContainer = document.getElementById('notebookTabs');
    const pages = getValues(notebook.pages);

    if (pages.length === 0) {
        tabsContainer.innerHTML = '<div class="notebook-empty"><h3>No pages yet</h3><p>Click "+ New Page" to start</p></div>';
        return;
    }

    tabsContainer.innerHTML = pages.map(page => `
        <button class="notebook-tab ${page.id === notebook.currentPageId ? 'active' : ''}"
                onclick="switchPage('${page.id}')"
                ondblclick="renamePage('${page.id}')">
            ${escapeHtml(page.title)}
            ${pages.length > 1 ? `<span class="notebook-tab-delete" onclick="event.stopPropagation(); deletePage('${page.id}')">\u00D7</span>` : ''}
        </button>
    `).join('');
}

function renderNotebookContent() {
    const contentContainer = document.getElementById('notebookContent');
    const currentPage = notebook.pages[notebook.currentPageId];

    if (!currentPage) {
        contentContainer.innerHTML = '<div class="notebook-empty"><h3>No page selected</h3></div>';
        return;
    }

    contentContainer.innerHTML = `
        <div contenteditable="true"
             class="notebook-editor"
             id="notebookEditor"
             oninput="handleEditorInput()"
             onpaste="handlePaste(event)">${currentPage.content}</div>
    `;

    updateCharCount();

    // Add keyboard shortcuts
    const editor = document.getElementById('notebookEditor');
    if (editor) {
        editor.addEventListener('keydown', handleKeyboardShortcuts);
    }
}

function handleEditorInput() {
    updateCharCount();
    scheduleNotebookSave();
}

function handlePaste(event) {
    // Paste as plain text to avoid style issues
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
}

function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') {
            e.preventDefault();
            formatText('bold');
        } else if (e.key === 'i') {
            e.preventDefault();
            formatText('italic');
        } else if (e.key === 'u') {
            e.preventDefault();
            formatText('underline');
        }
    }
}

function formatText(command, value = null) {
    const editor = document.getElementById('notebookEditor');
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
    scheduleNotebookSave();
}

function updateCharCount() {
    const editor = document.getElementById('notebookEditor');
    const charCountDisplay = document.getElementById('charCount');

    if (!editor || !charCountDisplay) return;

    const text = editor.innerText || '';
    const count = text.length;

    charCountDisplay.textContent = `${count} / 10,000 characters`;
    charCountDisplay.style.color = count > 10000 ? '#ff4757' : '#999';

    // Prevent typing if over limit
    if (count > 10000) {
        editor.addEventListener('keydown', function(e) {
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
            }
        }, { once: true });
    }
}

function scheduleNotebookSave() {
    const indicator = document.getElementById('saveIndicator');
    if (indicator) {
        indicator.textContent = 'Saving...';
        indicator.classList.add('saving');
    }

    clearTimeout(notebookSaveTimeout);
    notebookSaveTimeout = setTimeout(() => {
        saveCurrentPageContent();
        saveNotebook();
        indicator.textContent = 'Saved \u2713';
        indicator.classList.remove('saving');

        setTimeout(() => {
            indicator.textContent = '';
        }, 2000);
    }, 2000); // Auto-save after 2 seconds of no typing
}

function saveCurrentPageContent() {
    const editor = document.getElementById('notebookEditor');
    const currentPage = notebook.pages[notebook.currentPageId];

    if (editor && currentPage) {
        currentPage.content = editor.innerHTML;
        currentPage.modified = new Date().toISOString();
        currentPage.charCount = (editor.innerText || '').length;
    }
}

function renamePage(pageId) {
    const page = notebook.pages[pageId];
    if (!page) return;

    const newTitle = prompt('Enter new page name:', page.title);
    if (newTitle && newTitle.trim()) {
        page.title = newTitle.trim();
        renderNotebookTabs();
        saveNotebook();
    }
}

function saveNotebook() {
    saveData(); // Notebook is included in main saveData
}
