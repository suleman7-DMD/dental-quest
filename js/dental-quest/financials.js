/**
 * financials.js — Financial Cockpit: liquidity, bills, expenses, projections, credit cards
 * Extracted from index.html Phase 3
 *
 * Dependencies: state.js (globals, utilities), firebase-sync.js (saveData)
 *
 * Globals used: financials, collapsedMonths, escapeHtml, ensureModalOnBody,
 *   _modalOpenTime, saveData, showToast, generateId, getValues, getCount, parseLocalDate
 */

// ============================================
// FINANCIAL COCKPIT - MASTER CONTROL SYSTEM
// ============================================

function openFinancials() {
    const modal = document.getElementById('financialModal');
    if (!modal) {
        console.error('Financial modal not found');
        return;
    }
    ensureModalOnBody(modal);
    _modalOpenTime = Date.now();
    modal.classList.add('show');

    try {
        renderFinancialCockpit();
        updateCockpitStats();
    } catch (error) {
        console.error('Error rendering financial cockpit:', error);
        // Show error message in dashboard
        const dashboard = document.getElementById('financialDashboard');
        if (dashboard) {
            dashboard.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #f87171;">
                    <h2>⚠️ Error Loading Financial Dashboard</h2>
                    <p style="margin: 20px 0; color: #b0b8c4;">${error.message}</p>
                    <p style="color: #b0b8c4;">Check the console for details.</p>
                    <button onclick="closeFinancials()" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-top: 20px;">
                        Close
                    </button>
                </div>
            `;
        }
    }
}

function closeFinancials() {
    const modal = document.getElementById('financialModal');
    if (modal) modal.classList.remove('show');
}

// Calculate real-time financial status with per-month expense tracking
function calculateFinancialStatus() {
    if (!financials || !financials.masterLiquidity) {
        return {
            currentLiquid: 0, oneTimeExpenses: 0, oneTimeIncome: 0,
            availableCash: 0, monthlyDetails: [], totalUnpaidMonthly: 0,
            daysRemaining: 0, projectedBalance: 0, targetCushion: 2285,
            healthStatus: 'unknown', healthColor: '#8b949e', healthMessage: 'DATA NOT LOADED'
        };
    }

    var liquid = financials.masterLiquidity.currentCash || 0;

    // One-time bills
    var allOneTime = getValues(financials.oneTimeBills || {});
    var unpaidOneTime = allOneTime.filter(function(b) { return !b.paid; });
    var oneTimeExpenses = unpaidOneTime.filter(function(b) { return b.type === 'expense'; }).reduce(function(sum, b) { return sum + b.amount; }, 0);
    var oneTimeIncome = unpaidOneTime.filter(function(b) { return b.type === 'income'; }).reduce(function(sum, b) { return sum + b.amount; }, 0);

    var availableCash = liquid + oneTimeIncome - oneTimeExpenses;

    // Per-month breakdown
    var months = financials.months || {};
    var monthlyDetails = [];
    var totalUnpaidMonthly = 0;

    Object.entries(months).forEach(function(entry) {
        var monthKey = entry[0], monthData = entry[1];
        var expenses = monthData.expenses || {};
        var monthTotal = 0, monthUnpaid = 0, paidCount = 0, totalCount = 0;

        Object.values(expenses).forEach(function(exp) {
            totalCount++;
            monthTotal += exp.amount || 0;
            if (exp.paid) { paidCount++; } else { monthUnpaid += exp.amount || 0; }
        });

        monthlyDetails.push({
            key: monthKey, label: monthData.label || monthKey,
            partial: monthData.partial || false, fraction: monthData.fraction || 1,
            monthTotal: monthTotal, unpaidAmount: monthUnpaid,
            paidCount: paidCount, totalCount: totalCount,
            allPaid: totalCount > 0 && paidCount === totalCount
        });
        totalUnpaidMonthly += monthUnpaid;
    });

    var today = new Date();
    var semesterEnd = parseLocalDate(financials.masterLiquidity.semesterEndDate);
    var daysRemaining = Math.ceil((semesterEnd - today) / (1000 * 60 * 60 * 24));
    var projectedBalance = availableCash - totalUnpaidMonthly;

    var healthStatus = 'good', healthColor = '#4ade80', healthMessage = 'ON TRACK';
    if (projectedBalance < 0) { healthStatus = 'critical'; healthColor = '#dc2626'; healthMessage = 'DEFICIT PROJECTED'; }
    else if (projectedBalance < financials.masterLiquidity.targetCushion) { healthStatus = 'warning'; healthColor = '#f59e0b'; healthMessage = 'BELOW TARGET'; }

    return {
        currentLiquid: liquid, oneTimeExpenses: oneTimeExpenses, oneTimeIncome: oneTimeIncome,
        availableCash: availableCash, monthlyDetails: monthlyDetails, totalUnpaidMonthly: totalUnpaidMonthly,
        daysRemaining: daysRemaining, projectedBalance: projectedBalance,
        targetCushion: financials.masterLiquidity.targetCushion,
        healthStatus: healthStatus, healthColor: healthColor, healthMessage: healthMessage
    };
}

function updateCockpitStats() {
    var totalDebtEl = document.getElementById('totalDebtStat');
    var currentBalanceEl = document.getElementById('currentBalanceStat');
    var actionsRemainingEl = document.getElementById('actionsRemainingStat');
    if (!totalDebtEl || !currentBalanceEl || !actionsRemainingEl) return;

    var status = calculateFinancialStatus();
    var totalDebt = getValues(financials.creditCards).reduce(function(sum, card) { return sum + card.balance; }, 0);
    totalDebtEl.textContent = '$' + totalDebt.toLocaleString();
    currentBalanceEl.textContent = '$' + status.currentLiquid.toLocaleString();

    var unpaidOneTime = getValues(financials.oneTimeBills || {}).filter(function(b) { return !b.paid && b.type === 'expense'; }).length;
    var unpaidMonthlyItems = 0;
    Object.values(financials.months || {}).forEach(function(month) {
        Object.values(month.expenses || {}).forEach(function(exp) { if (!exp.paid) unpaidMonthlyItems++; });
    });
    actionsRemainingEl.textContent = unpaidOneTime + unpaidMonthlyItems;
}

function renderFinancialCockpit() {
    var dashboard = document.getElementById('financialDashboard');
    if (!dashboard) return;

    try {
        dashboard.innerHTML =
            renderMasterCockpit() +
            renderOneTimeBills() +
            renderMonthlyExpenses() +
            renderExpenseTemplate() +
            renderProjectionPanel() +
            renderActionItems() +
            renderCreditCards();
    } catch (error) {
        console.error('Error in renderFinancialCockpit:', error);
        dashboard.innerHTML = '<div style="padding: 40px; color: #f87171; background: #161b22; border-radius: 12px; margin: 20px;"><h3>Rendering Error</h3><p style="margin-top: 15px; color: #b0b8c4;">' + escapeHtml(error.message) + '</p></div>';
    }
}

function renderMasterCockpit() {
    var status = calculateFinancialStatus();
    var lastUpdated = financials.masterLiquidity.lastUpdated
        ? new Date(financials.masterLiquidity.lastUpdated).toLocaleString()
        : 'Never';

    return '<div class="fin-section fin-master-cockpit" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border: none;">' +
        '<div class="fin-master-header">' +
            '<h3 class="fin-master-title">MASTER LIQUIDITY</h3>' +
            '<button class="help-btn" onclick="event.stopPropagation(); showFinancialHelp(\'masterLiquidity\')" style="border-color: white; color: white;">? Help</button>' +
        '</div>' +
        '<div class="fin-master-grid">' +
            '<div class="fin-master-card">' +
                '<div class="fin-master-label">ACTUAL CASH</div>' +
                '<div class="fin-master-value">$' + status.currentLiquid.toLocaleString() + '</div>' +
                '<button onclick="updateMasterLiquidity()" class="fin-update-btn">Update Cash</button>' +
                '<div class="fin-master-updated">Updated: ' + lastUpdated + '</div>' +
            '</div>' +
            '<div class="fin-master-card">' +
                '<div class="fin-master-label">MAY 14 PROJECTION</div>' +
                '<div class="fin-master-value" style="color: ' + status.healthColor + ';">$' + status.projectedBalance.toLocaleString() + '</div>' +
                '<div class="fin-health-badge" style="background: ' + status.healthColor + ';">' + status.healthMessage + '</div>' +
                '<div class="fin-master-updated">Target: $' + status.targetCushion.toLocaleString() + ' | ' + status.daysRemaining + ' days</div>' +
            '</div>' +
        '</div>' +
        '<div class="fin-quick-stats">' +
            '<div class="fin-quick-stat"><div class="fin-quick-label">One-Time Bills</div><div class="fin-quick-value" style="color: #fca5a5;">-$' + status.oneTimeExpenses.toLocaleString() + '</div></div>' +
            '<div class="fin-quick-stat"><div class="fin-quick-label">Expected Income</div><div class="fin-quick-value" style="color: #86efac;">+$' + status.oneTimeIncome.toLocaleString() + '</div></div>' +
            '<div class="fin-quick-stat"><div class="fin-quick-label">After One-Time</div><div class="fin-quick-value" style="color: white;">$' + status.availableCash.toLocaleString() + '</div></div>' +
            '<div class="fin-quick-stat"><div class="fin-quick-label">Unpaid Monthly</div><div class="fin-quick-value" style="color: #fbbf24;">-$' + status.totalUnpaidMonthly.toLocaleString() + '</div></div>' +
        '</div>' +
    '</div>';
}

function updateMasterLiquidity() {
    const current = financials.masterLiquidity.currentCash;

    const overlay = document.createElement('div');
    overlay.className = 'edit-overlay';
    overlay.id = 'cashEditOverlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    overlay.innerHTML = `
        <div class="edit-panel" onclick="event.stopPropagation()" style="max-width: 400px;">
            <h3 style="text-align: center;">💰 Update Cash Balance</h3>

            <div class="edit-field">
                <label>Actual Cash in Checking ($)</label>
                <input type="number" id="edit_cashAmount" value="${current}" step="0.01"
                       inputmode="decimal" style="font-size: 1.5em; text-align: center; font-weight: 700;">
            </div>

            <div style="margin: 15px 0; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; font-size: 0.9em; color: #93c5fd;">
                💡 Enter your actual bank balance to get accurate projections.
            </div>

            <div class="edit-actions">
                <button class="btn-cancel" onclick="this.closest('.edit-overlay').remove()">Cancel</button>
                <button class="btn-save" onclick="saveMasterLiquidity()">Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Focus the input and select all
    setTimeout(() => {
        const input = document.getElementById('edit_cashAmount');
        if (input) {
            input.focus();
            input.select();
        }
    }, 100);
}

function saveMasterLiquidity() {
    const amount = parseFloat(document.getElementById('edit_cashAmount').value);

    if (isNaN(amount)) {
        showToast('Please enter a valid number', '!');
        return;
    }

    financials.masterLiquidity.currentCash = amount;
    financials.masterLiquidity.lastUpdated = new Date().toISOString();

    saveData();
    renderFinancialCockpit();
    updateCockpitStats();
    var el = document.getElementById('cashEditOverlay');
    if (el) el.remove();

    showToast('Updated: $' + amount.toLocaleString(), '$');
}

// ==================== ONE-TIME BILLS ====================
function renderOneTimeBills() {
    var allBills = getValues(financials.oneTimeBills || {});
    var unpaid = allBills.filter(function(b) { return !b.paid; });
    var paid = allBills.filter(function(b) { return b.paid; });

    var totalUnpaidExpenses = unpaid.filter(function(b) { return b.type === 'expense'; }).reduce(function(sum, b) { return sum + b.amount; }, 0);
    var totalUnpaidIncome = unpaid.filter(function(b) { return b.type === 'income'; }).reduce(function(sum, b) { return sum + b.amount; }, 0);

    var html = '<div class="fin-section">' +
        '<div class="fin-section-header" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div style="display: flex; align-items: center; gap: 15px;">' +
                '<h3 style="margin: 0;">One-Time Bills</h3>' +
                '<button onclick="addOneTimeBill()" class="fin-add-btn">+ Add</button>' +
            '</div>' +
            '<div style="text-align: right;">' +
                '<div style="font-size: 0.85em; color: #b0b8c4;">Unpaid</div>' +
                '<div style="font-size: 1.3em; font-weight: 700; color: #f87171;">-$' + totalUnpaidExpenses.toLocaleString() + '</div>' +
                (totalUnpaidIncome > 0 ? '<div style="font-size: 1em; color: #4ade80;">+$' + totalUnpaidIncome.toLocaleString() + '</div>' : '') +
            '</div>' +
        '</div>';

    if (unpaid.length === 0 && paid.length === 0) {
        html += '<p style="text-align: center; padding: 30px; color: #4ade80; font-size: 1.1em;">No one-time bills</p>';
    }

    var allBillsList = unpaid.concat(paid);
    for (var bi = 0; bi < allBillsList.length; bi++) {
        var bill = allBillsList[bi];
        var dueDate = parseLocalDate(bill.dueDate);
        var today = new Date(); today.setHours(0,0,0,0);
        var daysUntil = Math.ceil((dueDate - today) / (1000*60*60*24));
        var urgencyClass = '', urgencyText = '';
        if (bill.paid) { urgencyClass = 'success'; urgencyText = 'PAID'; }
        else if (daysUntil < 0) { urgencyClass = 'urgent'; urgencyText = Math.abs(daysUntil) + ' days overdue'; }
        else if (daysUntil === 0) { urgencyClass = 'urgent'; urgencyText = 'DUE TODAY'; }
        else if (daysUntil <= 3) { urgencyClass = 'high'; urgencyText = 'Due in ' + daysUntil + ' days'; }
        else { urgencyClass = 'medium'; urgencyText = 'Due ' + dueDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}); }

        html += '<div class="action-item ' + urgencyClass + (bill.paid ? ' completed' : '') + '" onclick="toggleOneTimeBillPaid(\'' + bill.id + '\')" style="cursor: pointer;">' +
            '<div class="action-checkbox ' + (bill.paid ? 'checked' : '') + '" onclick="event.stopPropagation(); toggleOneTimeBillPaid(\'' + bill.id + '\')"></div>' +
            '<div class="action-content" style="flex: 1;"><div style="display: flex; justify-content: space-between; align-items: start;">' +
                '<div><div class="action-title">' + escapeHtml(bill.description) + '</div>' +
                '<div class="action-deadline ' + (urgencyClass === 'urgent' ? 'overdue' : urgencyClass === 'high' ? 'soon' : 'ok') + '">' + urgencyText + '</div>' +
                (bill.notes ? '<div class="action-notes">' + escapeHtml(bill.notes) + '</div>' : '') + '</div>' +
                '<div style="text-align: right;">' +
                    '<div class="cash-amount ' + (bill.type === 'income' ? 'positive' : 'negative') + '" style="font-size: 1.3em;">' + (bill.type === 'income' ? '+' : '-') + '$' + bill.amount.toLocaleString() + '</div>' +
                    (!bill.paid ? '<button onclick="event.stopPropagation(); editOneTimeBill(\'' + bill.id + '\')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em; margin-top: 6px;">Edit</button>' +
                    '<button onclick="event.stopPropagation(); deleteOneTimeBill(\'' + bill.id + '\')" style="background: #dc2626; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em; margin-top: 6px; margin-left: 4px;">x</button>' : '') +
                '</div></div></div></div>';
    }

    html += '</div>';
    return html;
}

function toggleOneTimeBillPaid(billId) {
    var bills = financials.oneTimeBills || {};
    if (!bills[billId]) return;
    bills[billId].paid = !bills[billId].paid;
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    if (bills[billId].paid) showToast('Marked paid: ' + bills[billId].description, 'v');
}

function addOneTimeBill() {
    var overlay = document.createElement('div');
    overlay.className = 'edit-overlay'; overlay.id = 'oneTimeBillOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="edit-panel" onclick="event.stopPropagation()">' +
        '<h3>Add One-Time Bill</h3>' +
        '<div class="edit-field"><label>Description</label><input type="text" id="new_otb_desc" placeholder="e.g., New textbook"></div>' +
        '<div class="edit-field"><label>Amount ($)</label><input type="number" id="new_otb_amount" value="0" step="0.01"></div>' +
        '<div class="edit-field"><label>Type</label><select id="new_otb_type" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: 12px; border-radius: 6px;"><option value="expense">Expense</option><option value="income">Income</option></select></div>' +
        '<div class="edit-field"><label>Due Date</label><input type="date" id="new_otb_date" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: 12px; border-radius: 6px;"></div>' +
        '<div class="edit-field"><label>Notes (optional)</label><input type="text" id="new_otb_notes" placeholder="Any notes..."></div>' +
        '<div class="edit-actions"><button class="btn-cancel" onclick="this.closest(\'.edit-overlay\').remove()">Cancel</button><button class="btn-save" onclick="saveNewOneTimeBill()">Add Bill</button></div></div>';
    document.body.appendChild(overlay);
}

function saveNewOneTimeBill() {
    var desc = document.getElementById('new_otb_desc').value.trim();
    var amount = parseFloat(document.getElementById('new_otb_amount').value) || 0;
    var type = document.getElementById('new_otb_type').value;
    var dueDate = document.getElementById('new_otb_date').value;
    var notes = document.getElementById('new_otb_notes').value.trim();
    if (!desc) { showToast('Please enter a description', '!'); return; }
    if (amount <= 0) { showToast('Please enter a valid amount', '!'); return; }
    var id = generateId('bill');
    if (!financials.oneTimeBills) financials.oneTimeBills = {};
    financials.oneTimeBills[id] = { id: id, description: desc, amount: amount, type: type, dueDate: dueDate || new Date().toISOString().split('T')[0], paid: false, category: 'other', notes: notes || undefined };
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    var el = document.getElementById('oneTimeBillOverlay'); if (el) el.remove();
    showToast('Added: ' + desc, '+');
}

function editOneTimeBill(billId) {
    var bill = (financials.oneTimeBills || {})[billId];
    if (!bill) return;
    var overlay = document.createElement('div');
    overlay.className = 'edit-overlay'; overlay.id = 'editOTBOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="edit-panel" onclick="event.stopPropagation()">' +
        '<h3>Edit Bill</h3>' +
        '<div class="edit-field"><label>Description</label><input type="text" id="edit_otb_desc" value="' + escapeHtml(bill.description) + '"></div>' +
        '<div class="edit-field"><label>Amount ($)</label><input type="number" id="edit_otb_amount" value="' + bill.amount + '" step="0.01"></div>' +
        '<div class="edit-field"><label>Due Date</label><input type="date" id="edit_otb_date" value="' + (bill.dueDate || '') + '" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: 12px; border-radius: 6px;"></div>' +
        '<div class="edit-field"><label>Notes</label><textarea id="edit_otb_notes" rows="2">' + escapeHtml(bill.notes || '') + '</textarea></div>' +
        '<div class="edit-actions"><button class="btn-cancel" onclick="this.closest(\'.edit-overlay\').remove()">Cancel</button><button class="btn-save" onclick="saveOneTimeBillEdit(\'' + billId + '\')">Save</button></div></div>';
    document.body.appendChild(overlay);
}

function saveOneTimeBillEdit(billId) {
    var bill = (financials.oneTimeBills || {})[billId];
    if (!bill) return;
    bill.description = document.getElementById('edit_otb_desc').value;
    bill.amount = parseFloat(document.getElementById('edit_otb_amount').value) || 0;
    bill.dueDate = document.getElementById('edit_otb_date').value;
    bill.notes = document.getElementById('edit_otb_notes').value || '';
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    var el = document.getElementById('editOTBOverlay'); if (el) el.remove();
    showToast('Bill updated', 'v');
}

function deleteOneTimeBill(billId) {
    var bill = (financials.oneTimeBills || {})[billId];
    if (!bill) return;
    if (!confirm('Delete "' + bill.description + '"?')) return;
    delete financials.oneTimeBills[billId];
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    showToast('Deleted: ' + bill.description, 'x');
}

// ==================== MONTHLY EXPENSES (per-month) ====================
function renderMonthlyExpenses() {
    var months = financials.months || {};
    var status = calculateFinancialStatus();
    var totalPaidMonths = 0, totalMonths = Object.keys(months).length;
    Object.values(months).forEach(function(month) {
        var exps = Object.values(month.expenses || {});
        if (exps.length > 0 && exps.every(function(e) { return e.paid; })) totalPaidMonths++;
    });

    var html = '<div class="fin-section">' +
        '<div class="fin-section-header" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div style="display: flex; align-items: center; gap: 15px;"><h3 style="margin: 0;">Monthly Expenses</h3></div>' +
            '<div style="text-align: right;">' +
                '<div style="font-size: 0.85em; color: #b0b8c4;">' + totalPaidMonths + '/' + totalMonths + ' months complete</div>' +
                '<div style="font-size: 1.3em; font-weight: 700; color: #fbbf24;">-$' + status.totalUnpaidMonthly.toLocaleString() + ' remaining</div>' +
            '</div></div>' +
        '<div style="margin-bottom: 15px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; border-radius: 6px; font-size: 0.9em; color: #93c5fd;">Tap a month header to expand/collapse. Check individual expenses or use "Pay All" for the entire month.</div>';

    var now = new Date();
    var currentMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    Object.entries(months).forEach(function(entry) {
        var monthKey = entry[0], monthData = entry[1];
        var expenses = monthData.expenses || {};
        var expEntries = Object.entries(expenses);
        var paidCount = expEntries.filter(function(e) { return e[1].paid; }).length;
        var totalCount = expEntries.length;
        var allPaid = totalCount > 0 && paidCount === totalCount;
        var unpaidAmount = expEntries.filter(function(e) { return !e[1].paid; }).reduce(function(sum, e) { return sum + (e[1].amount || 0); }, 0);
        var totalAmount = expEntries.reduce(function(sum, e) { return sum + (e[1].amount || 0); }, 0);

        var shouldExpand = monthKey === currentMonthKey || collapsedMonths[monthKey] === false;
        var collapsed = !shouldExpand && collapsedMonths[monthKey] !== false;

        html += '<div style="margin-bottom: 12px; border: 1px solid ' + (allPaid ? '#16a34a' : '#30363d') + '; border-radius: 10px; overflow: hidden;' + (allPaid ? ' opacity: 0.8;' : '') + '">' +
            '<div onclick="toggleMonthCollapse(\'' + monthKey + '\')" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: ' + (allPaid ? 'rgba(22, 163, 74, 0.15)' : '#21262d') + '; cursor: pointer; user-select: none;">' +
                '<div style="display: flex; align-items: center; gap: 12px;">' +
                    '<span id="arrow_' + monthKey + '" style="color: #b0b8c4; font-size: 0.9em; font-family: monospace; min-width: 14px; text-align: center;">' + (collapsed ? '>' : 'v') + '</span>' +
                    '<div><div style="font-weight: 700; color: ' + (allPaid ? '#4ade80' : '#e6edf3') + '; font-size: 1.05em;">' + escapeHtml(monthData.label) + (monthData.partial ? ' (partial)' : '') + '</div>' +
                    '<div style="font-size: 0.8em; color: #8b949e;">' + paidCount + '/' + totalCount + ' paid</div></div></div>' +
                '<div style="display: flex; align-items: center; gap: 12px;">' +
                    '<div style="text-align: right;"><div style="font-size: 1.1em; font-weight: 700; color: ' + (allPaid ? '#4ade80' : '#f87171') + ';">' + (allPaid ? 'PAID' : '-$' + unpaidAmount.toLocaleString()) + '</div>' +
                    (!allPaid ? '<div style="font-size: 0.75em; color: #8b949e;">of $' + totalAmount.toLocaleString() + '</div>' : '') + '</div>' +
                    (!allPaid ? '<button onclick="event.stopPropagation(); payAllMonth(\'' + monthKey + '\')" style="background: #16a34a; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 600; font-size: 0.85em; cursor: pointer; white-space: nowrap;">Pay All</button>' : '') +
                '</div></div>';

        html += '<div id="monthBody_' + monthKey + '" style="display: ' + (collapsed ? 'none' : 'block') + '; padding: 8px;">';
        for (var ei = 0; ei < expEntries.length; ei++) {
            var expKey = expEntries[ei][0], exp = expEntries[ei][1];
            html += '<div onclick="toggleMonthExpensePaid(\'' + monthKey + '\', \'' + expKey + '\')" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; margin: 4px 0; border-radius: 6px; cursor: pointer; background: ' + (exp.paid ? 'rgba(22, 163, 74, 0.1)' : 'transparent') + '; opacity: ' + (exp.paid ? '0.7' : '1') + ';">' +
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                    '<div class="action-checkbox ' + (exp.paid ? 'checked' : '') + '" style="width: 22px; height: 22px; min-width: 22px;" onclick="event.stopPropagation(); toggleMonthExpensePaid(\'' + monthKey + '\', \'' + expKey + '\')"></div>' +
                    '<div><div style="font-weight: 600; color: ' + (exp.paid ? '#4ade80' : '#e6edf3') + '; font-size: 0.95em;' + (exp.paid ? ' text-decoration: line-through;' : '') + '">' + escapeHtml(exp.name) + '</div>' +
                    '<div style="font-size: 0.75em; color: #8b949e;">' + escapeHtml(exp.category) + (exp.notes ? ' - ' + escapeHtml(exp.notes) : '') + '</div></div></div>' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    '<div style="font-weight: 700; color: ' + (exp.paid ? '#4ade80' : '#f87171') + '; font-size: 1em;">' + (exp.paid ? 'PAID' : '-$' + exp.amount.toLocaleString()) + '</div>' +
                    (!exp.paid ? '<button onclick="event.stopPropagation(); editMonthExpense(\'' + monthKey + '\', \'' + expKey + '\')" style="background: #3b82f6; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Edit</button>' : '') +
                '</div></div>';
        }
        html += '<div style="padding: 8px 12px; margin-top: 4px;"><button onclick="addExpenseToMonth(\'' + monthKey + '\')" class="fin-add-btn" style="width: 100%; padding: 10px;">+ Add Expense to ' + escapeHtml(monthData.label) + '</button></div>';
        html += '</div></div>';
    });

    html += '</div>';
    return html;
}

function toggleMonthCollapse(monthKey) {
    var now = new Date();
    var currentMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    if (collapsedMonths[monthKey] === undefined) {
        collapsedMonths[monthKey] = (monthKey === currentMonthKey);
    } else {
        collapsedMonths[monthKey] = !collapsedMonths[monthKey];
    }
    var body = document.getElementById('monthBody_' + monthKey);
    var arrow = document.getElementById('arrow_' + monthKey);
    if (body) body.style.display = collapsedMonths[monthKey] ? 'none' : 'block';
    if (arrow) arrow.textContent = collapsedMonths[monthKey] ? '>' : 'v';
}

function toggleMonthExpensePaid(monthKey, expenseKey) {
    var month = (financials.months || {})[monthKey];
    if (!month || !month.expenses || !month.expenses[expenseKey]) return;
    month.expenses[expenseKey].paid = !month.expenses[expenseKey].paid;
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    if (month.expenses[expenseKey].paid) showToast('Paid: ' + month.expenses[expenseKey].name, 'v');
}

function payAllMonth(monthKey) {
    var month = (financials.months || {})[monthKey];
    if (!month || !month.expenses) return;
    var allPaid = Object.values(month.expenses).every(function(e) { return e.paid; });
    Object.values(month.expenses).forEach(function(exp) { exp.paid = !allPaid; });
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    showToast(month.label + (allPaid ? ' - all marked unpaid' : ' - all marked paid'), 'v');
}

function editMonthExpense(monthKey, expenseKey) {
    var month = (financials.months || {})[monthKey];
    if (!month || !month.expenses || !month.expenses[expenseKey]) return;
    var exp = month.expenses[expenseKey];
    var overlay = document.createElement('div');
    overlay.className = 'edit-overlay'; overlay.id = 'editMonthExpOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="edit-panel" onclick="event.stopPropagation()">' +
        '<h3>Edit ' + escapeHtml(exp.name) + ' - ' + escapeHtml(month.label) + '</h3>' +
        '<div class="edit-field"><label>Name</label><input type="text" id="edit_mexp_name" value="' + escapeHtml(exp.name) + '"></div>' +
        '<div class="edit-field"><label>Amount ($)</label><input type="number" id="edit_mexp_amount" value="' + exp.amount + '" step="0.01"></div>' +
        '<div class="edit-field"><label>Category</label><select id="edit_mexp_category" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: 12px; border-radius: 6px;">' +
            '<option value="housing"' + (exp.category === 'housing' ? ' selected' : '') + '>Housing</option>' +
            '<option value="living"' + (exp.category === 'living' ? ' selected' : '') + '>Living</option>' +
            '<option value="wellness"' + (exp.category === 'wellness' ? ' selected' : '') + '>Wellness</option>' +
            '<option value="debt"' + (exp.category === 'debt' ? ' selected' : '') + '>Debt</option>' +
            '<option value="other"' + (exp.category === 'other' ? ' selected' : '') + '>Other</option></select></div>' +
        '<div class="edit-field"><label>Notes (optional)</label><input type="text" id="edit_mexp_notes" value="' + escapeHtml(exp.notes || '') + '"></div>' +
        '<div class="edit-actions"><button class="btn-cancel" onclick="this.closest(\'.edit-overlay\').remove()">Cancel</button><button class="btn-save" onclick="saveMonthExpenseEdit(\'' + monthKey + '\', \'' + expenseKey + '\')">Save</button></div>' +
        '<div style="margin-top: 15px; text-align: center;"><button onclick="deleteMonthExpense(\'' + monthKey + '\', \'' + expenseKey + '\')" style="background: transparent; color: #f87171; border: 1px solid #f87171; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9em;">Delete from ' + escapeHtml(month.label) + '</button></div></div>';
    document.body.appendChild(overlay);
}

function saveMonthExpenseEdit(monthKey, expenseKey) {
    var month = (financials.months || {})[monthKey];
    if (!month || !month.expenses || !month.expenses[expenseKey]) return;
    month.expenses[expenseKey].name = document.getElementById('edit_mexp_name').value.trim() || month.expenses[expenseKey].name;
    month.expenses[expenseKey].amount = parseFloat(document.getElementById('edit_mexp_amount').value) || 0;
    month.expenses[expenseKey].category = document.getElementById('edit_mexp_category').value;
    var notes = document.getElementById('edit_mexp_notes').value.trim();
    if (notes) { month.expenses[expenseKey].notes = notes; } else { delete month.expenses[expenseKey].notes; }
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    var el = document.getElementById('editMonthExpOverlay'); if (el) el.remove();
    showToast('Expense updated', 'v');
}

function deleteMonthExpense(monthKey, expenseKey) {
    var month = (financials.months || {})[monthKey];
    if (!month || !month.expenses || !month.expenses[expenseKey]) return;
    var name = month.expenses[expenseKey].name;
    if (!confirm('Delete "' + name + '" from ' + month.label + '?')) return;
    delete month.expenses[expenseKey];
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    var el = document.getElementById('editMonthExpOverlay'); if (el) el.remove();
    showToast('Deleted: ' + name, 'x');
}

function addExpenseToMonth(monthKey) {
    var month = (financials.months || {})[monthKey];
    if (!month) return;
    var overlay = document.createElement('div');
    overlay.className = 'edit-overlay'; overlay.id = 'addMonthExpOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="edit-panel" onclick="event.stopPropagation()">' +
        '<h3>Add Expense to ' + escapeHtml(month.label) + '</h3>' +
        '<div class="edit-field"><label>Expense Name</label><input type="text" id="new_mexp_name" placeholder="e.g., Insurance"></div>' +
        '<div class="edit-field"><label>Amount ($)</label><input type="number" id="new_mexp_amount" value="0" step="0.01"></div>' +
        '<div class="edit-field"><label>Category</label><select id="new_mexp_category" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: 12px; border-radius: 6px;"><option value="housing">Housing</option><option value="living">Living</option><option value="wellness">Wellness</option><option value="debt">Debt</option><option value="other">Other</option></select></div>' +
        '<div class="edit-actions"><button class="btn-cancel" onclick="this.closest(\'.edit-overlay\').remove()">Cancel</button><button class="btn-save" onclick="saveNewMonthExpense(\'' + monthKey + '\')">Add</button></div></div>';
    document.body.appendChild(overlay);
}

function saveNewMonthExpense(monthKey) {
    var month = (financials.months || {})[monthKey];
    if (!month) return;
    var name = document.getElementById('new_mexp_name').value.trim();
    var amount = parseFloat(document.getElementById('new_mexp_amount').value) || 0;
    var category = document.getElementById('new_mexp_category').value;
    if (!name) { showToast('Please enter a name', '!'); return; }
    var key = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString(36);
    if (!month.expenses) month.expenses = {};
    month.expenses[key] = { name: name, amount: amount, category: category, paid: false };
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    var el = document.getElementById('addMonthExpOverlay'); if (el) el.remove();
    showToast('Added: ' + name + ' to ' + month.label, '+');
}

// ==================== EXPENSE TEMPLATE ====================
function renderExpenseTemplate() {
    var template = financials.expenseTemplate || {};
    var total = Object.values(template).reduce(function(sum, exp) { return sum + (exp.amount || 0); }, 0);

    var html = '<div class="fin-section" style="border-color: #6366f1;">' +
        '<div class="fin-section-header" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div style="display: flex; align-items: center; gap: 15px;"><h3 style="margin: 0; color: #a78bfa;">Expense Template</h3></div>' +
            '<div style="text-align: right;"><div style="font-size: 0.85em; color: #b0b8c4;">Template Total</div>' +
            '<div style="font-size: 1.2em; font-weight: 700; color: #a78bfa;">$' + total.toLocaleString() + '/mo</div></div></div>' +
        '<div style="margin-bottom: 12px; padding: 10px; background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; border-radius: 6px; font-size: 0.85em; color: #a5b4fc;">Edit this template to change what gets created for future months. Existing months are NOT affected.</div>' +
        '<div class="fin-expense-list">';

    Object.entries(template).forEach(function(entry) {
        var key = entry[0], exp = entry[1];
        html += '<div class="fin-expense-item">' +
            '<div class="fin-expense-info"><div class="fin-expense-name">' + escapeHtml(exp.name || key) + '</div>' +
            '<div class="fin-expense-category">' + escapeHtml(exp.category || 'other') + (exp.notes ? ' - ' + escapeHtml(exp.notes) : '') + '</div></div>' +
            '<div class="fin-expense-actions"><div class="fin-expense-amount">$' + (exp.amount || 0).toLocaleString() + '</div>' +
            '<button onclick="editTemplateExpense(\'' + key + '\')" class="fin-edit-btn">Edit</button>' +
            '<button onclick="deleteTemplateExpense(\'' + key + '\')" class="fin-delete-btn">x</button></div></div>';
    });

    html += '</div><div style="margin-top: 12px;"><button onclick="addTemplateExpense()" class="fin-add-btn" style="width: 100%; padding: 10px;">+ Add to Template</button></div></div>';
    return html;
}

function editTemplateExpense(expKey) {
    var exp = (financials.expenseTemplate || {})[expKey];
    if (!exp) return;
    var overlay = document.createElement('div');
    overlay.className = 'edit-overlay'; overlay.id = 'editTemplateOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="edit-panel" onclick="event.stopPropagation()">' +
        '<h3>Edit Template: ' + escapeHtml(exp.name || expKey) + '</h3>' +
        '<div class="edit-field"><label>Name</label><input type="text" id="edit_tpl_name" value="' + escapeHtml(exp.name || expKey) + '"></div>' +
        '<div class="edit-field"><label>Monthly Amount ($)</label><input type="number" id="edit_tpl_amount" value="' + exp.amount + '" step="0.01"></div>' +
        '<div class="edit-field"><label>Category</label><select id="edit_tpl_category" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: 12px; border-radius: 6px;">' +
            '<option value="housing"' + (exp.category === 'housing' ? ' selected' : '') + '>Housing</option>' +
            '<option value="living"' + (exp.category === 'living' ? ' selected' : '') + '>Living</option>' +
            '<option value="wellness"' + (exp.category === 'wellness' ? ' selected' : '') + '>Wellness</option>' +
            '<option value="debt"' + (exp.category === 'debt' ? ' selected' : '') + '>Debt</option>' +
            '<option value="other"' + (exp.category === 'other' ? ' selected' : '') + '>Other</option></select></div>' +
        '<div class="edit-actions"><button class="btn-cancel" onclick="this.closest(\'.edit-overlay\').remove()">Cancel</button><button class="btn-save" onclick="saveTemplateExpenseEdit(\'' + expKey + '\')">Save</button></div></div>';
    document.body.appendChild(overlay);
}

function saveTemplateExpenseEdit(expKey) {
    var exp = (financials.expenseTemplate || {})[expKey];
    if (!exp) return;
    exp.name = document.getElementById('edit_tpl_name').value.trim() || exp.name;
    exp.amount = parseFloat(document.getElementById('edit_tpl_amount').value) || 0;
    exp.category = document.getElementById('edit_tpl_category').value;
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    var el = document.getElementById('editTemplateOverlay'); if (el) el.remove();
    showToast('Template updated', 'v');
}

function deleteTemplateExpense(expKey) {
    var exp = (financials.expenseTemplate || {})[expKey];
    if (!exp) return;
    if (!confirm('Delete "' + (exp.name || expKey) + '" from template?')) return;
    delete financials.expenseTemplate[expKey];
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    showToast('Removed from template', 'x');
}

function addTemplateExpense() {
    var overlay = document.createElement('div');
    overlay.className = 'edit-overlay'; overlay.id = 'addTemplateOverlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="edit-panel" onclick="event.stopPropagation()">' +
        '<h3>Add to Expense Template</h3>' +
        '<div class="edit-field"><label>Expense Name</label><input type="text" id="new_tpl_name" placeholder="e.g., Insurance"></div>' +
        '<div class="edit-field"><label>Monthly Amount ($)</label><input type="number" id="new_tpl_amount" value="0" step="0.01"></div>' +
        '<div class="edit-field"><label>Category</label><select id="new_tpl_category" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: 12px; border-radius: 6px;"><option value="housing">Housing</option><option value="living">Living</option><option value="wellness">Wellness</option><option value="debt">Debt</option><option value="other">Other</option></select></div>' +
        '<div class="edit-actions"><button class="btn-cancel" onclick="this.closest(\'.edit-overlay\').remove()">Cancel</button><button class="btn-save" onclick="saveNewTemplateExpense()">Add</button></div></div>';
    document.body.appendChild(overlay);
}

function saveNewTemplateExpense() {
    var name = document.getElementById('new_tpl_name').value.trim();
    var amount = parseFloat(document.getElementById('new_tpl_amount').value) || 0;
    var category = document.getElementById('new_tpl_category').value;
    if (!name) { showToast('Please enter a name', '!'); return; }
    var key = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    if (!financials.expenseTemplate) financials.expenseTemplate = {};
    if (financials.expenseTemplate[key]) { showToast('Already exists in template', '!'); return; }
    financials.expenseTemplate[key] = { name: name, amount: amount, category: category };
    saveData(); renderFinancialCockpit(); updateCockpitStats();
    var el = document.getElementById('addTemplateOverlay'); if (el) el.remove();
    showToast('Added to template: ' + name, '+');
}

function renderProjectionPanel() {
    var status = calculateFinancialStatus();
    var progressPercent = Math.max(0, Math.min(100, (status.projectedBalance / status.targetCushion) * 100));

    var html = '<div class="fin-section fin-projection-section">' +
        '<div class="fin-projection-header"><h3 class="fin-projection-title">Projection</h3>' +
        '<button class="help-btn" onclick="event.stopPropagation(); showFinancialHelp(\'projections\')">?</button></div>' +
        '<div class="fin-calc-breakdown"><div class="fin-calc-title">Calculation Breakdown</div>' +
        '<div class="fin-calc-row"><span>Current Cash</span><span class="fin-calc-value positive">$' + status.currentLiquid.toLocaleString() + '</span></div>';

    if (status.oneTimeIncome > 0) {
        html += '<div class="fin-calc-row"><span>+ Expected Income</span><span class="fin-calc-value positive">+$' + status.oneTimeIncome.toLocaleString() + '</span></div>';
    }
    if (status.oneTimeExpenses > 0) {
        html += '<div class="fin-calc-row"><span>- One-Time Bills</span><span class="fin-calc-value negative">-$' + status.oneTimeExpenses.toLocaleString() + '</span></div>';
    }

    html += '<div class="fin-calc-row subtotal"><span>= After One-Time</span><span class="fin-calc-value highlight">$' + status.availableCash.toLocaleString() + '</span></div>';

    for (var mi = 0; mi < status.monthlyDetails.length; mi++) {
        var month = status.monthlyDetails[mi];
        html += '<div class="fin-calc-row sub"><span>- ' + escapeHtml(month.label) + (month.allPaid ? ' (PAID)' : '') + ' (' + month.paidCount + '/' + month.totalCount + ' items)</span>' +
            '<span class="fin-calc-value ' + (month.allPaid ? 'positive' : 'negative') + '">' + (month.allPaid ? 'PAID' : '-$' + month.unpaidAmount.toLocaleString()) + '</span></div>';
    }

    if (status.monthlyDetails.every(function(m) { return m.allPaid; })) {
        html += '<div class="fin-calc-all-paid">All months paid!</div>';
    }

    html += '<div class="fin-calc-row total"><span>- Unpaid Monthly Total</span><span class="fin-calc-value negative">-$' + status.totalUnpaidMonthly.toLocaleString() + '</span></div></div>';

    html += '<div class="fin-projection-result" style="border-color: ' + status.healthColor + ';">' +
        '<div class="fin-projection-label">MAY 14 BALANCE</div>' +
        '<div class="fin-projection-amount" style="color: ' + status.healthColor + ';">$' + status.projectedBalance.toLocaleString() + '</div>' +
        '<div class="fin-projection-status" style="background: ' + status.healthColor + ';">' + status.healthMessage + '</div>' +
        '<div class="fin-projection-days">' + status.daysRemaining + ' days left</div></div>';

    html += '<div class="fin-progress-section"><div class="fin-progress-header"><span>Target: $' + status.targetCushion.toLocaleString() + '</span>' +
        '<span style="color: ' + status.healthColor + '; font-weight: 700;">' + progressPercent.toFixed(0) + '%</span></div>' +
        '<div class="progress-container"><div class="progress-bar-fill" style="width: ' + progressPercent + '%;">' +
        (progressPercent > 15 ? '$' + status.projectedBalance.toLocaleString() : '') + '</div></div></div></div>';

    return html;
}

function renderActionItems() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...getValues(financials.actionItems)].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const priorityOrder = { urgent: 0, high: 1, medium: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return parseLocalDate(a.deadline) - parseLocalDate(b.deadline);
    });

    const incomplete = sorted.filter(item => !item.completed);

    return `
        <div class="fin-section">
            <div class="fin-section-header">
                <h3>✅ Action Checklist</h3>
                <span class="fin-badge ${incomplete.length > 5 ? 'urgent' : incomplete.length > 0 ? 'high' : 'success'}">
                    ${incomplete.length} remaining
                </span>
            </div>

            ${sorted.map(item => {
                const deadline = parseLocalDate(item.deadline);
                const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

                let deadlineClass = 'ok';
                let deadlineText = '';
                if (item.completed) {
                    deadlineText = '✓ Completed';
                    deadlineClass = 'ok';
                } else if (daysUntil < 0) {
                    deadlineText = `⚠️ ${Math.abs(daysUntil)} days overdue`;
                    deadlineClass = 'overdue';
                } else if (daysUntil === 0) {
                    deadlineText = '🔥 DUE TODAY';
                    deadlineClass = 'overdue';
                } else if (daysUntil <= 3) {
                    deadlineText = `⏰ ${daysUntil} days until deadline`;
                    deadlineClass = 'soon';
                } else {
                    deadlineText = `Due ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                }

                return `
                    <div class="action-item ${item.priority} ${item.completed ? 'completed' : ''}"
                         onclick="toggleActionItem('${item.id}')">
                        <div class="action-checkbox ${item.completed ? 'checked' : ''}"
                             onclick="event.stopPropagation(); toggleActionItem('${item.id}')">
                        </div>
                        <div class="action-content">
                            <div class="action-title">${escapeHtml(item.title)}</div>
                            <div class="action-deadline ${deadlineClass}">${deadlineText}</div>
                            <div class="action-notes">${escapeHtml(item.notes)}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function toggleActionItem(itemId) {
    const item = getValues(financials.actionItems).find(i => i.id === itemId);
    if (item) {
        item.completed = !item.completed;
        saveData();
        renderFinancialCockpit();
        updateCockpitStats();

        if (item.completed) {
            showToast(`✅ ${item.title}`, '✓');
        }
    }
}

function renderCreditCards() {
    const sorted = [...getValues(financials.creditCards)].sort((a, b) => a.priority - b.priority);
    const totalBalance = sorted.reduce((sum, card) => sum + card.balance, 0);
    const totalMinimums = sorted.reduce((sum, card) => sum + card.targetMin, 0);

    return `
        <div class="fin-section">
            <div class="fin-section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <h3 style="margin: 0;">💳 Credit Cards (7 Cards)</h3>
                    <button class="help-btn" onclick="event.stopPropagation(); showFinancialHelp('negotiation')" style="background: rgba(34, 197, 94, 0.2); border-color: #22c55e; color: #4ade80;">
                        📞 How To Negotiate
                    </button>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9em; color: #b0b8c4;">Total Balance</div>
                    <div style="font-size: 1.4em; font-weight: 700; color: #f87171;">$${totalBalance.toLocaleString()}</div>
                    <div style="font-size: 0.85em; color: #b0b8c4; margin-top: 4px;">Target minimums: $${totalMinimums}/mo</div>
                </div>
            </div>

            ${sorted.map(card => `
                <div class="credit-card-item" onclick="editCreditCard('${card.id}')">
                    <div class="card-header">
                        <div class="card-name">
                            <span class="status-dot ${card.dotColor}"></span>
                            <strong>${card.name}</strong>
                        </div>
                        <span class="fin-badge ${card.statusColor}">${card.status}</span>
                    </div>

                    <div class="card-stats">
                        <div class="card-stat">
                            <div class="card-stat-label">Balance</div>
                            <div class="card-stat-value negative">$${card.balance.toLocaleString()}</div>
                        </div>
                        <div class="card-stat">
                            <div class="card-stat-label">Limit</div>
                            <div class="card-stat-value">$${card.limit.toLocaleString()}</div>
                        </div>
                        <div class="card-stat">
                            <div class="card-stat-label">Days Late</div>
                            <div class="card-stat-value ${card.daysLate > 0 ? 'negative' : 'positive'}">${card.daysLate || 0}</div>
                        </div>
                        <div class="card-stat">
                            <div class="card-stat-label">Target Min</div>
                            <div class="card-stat-value positive">$${card.targetMin}</div>
                        </div>
                    </div>

                    ${card.negotiationNotes ? `
                        <div style="margin-top: 12px; padding: 10px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 0.9em; color: #b0b8c4;">
                            📝 ${card.negotiationNotes}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function editCreditCard(cardId) {
    const card = getValues(financials.creditCards).find(c => c.id === cardId);
    if (!card) return;

    const overlay = document.createElement('div');
    overlay.className = 'edit-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    overlay.innerHTML = `
        <div class="edit-panel" onclick="event.stopPropagation()">
            <h3>Edit ${card.name}</h3>

            <div class="edit-field">
                <label>Current Balance ($)</label>
                <input type="number" id="edit_balance" value="${card.balance}" step="0.01">
            </div>

            <div class="edit-field">
                <label>Days Late</label>
                <input type="number" id="edit_daysLate" value="${card.daysLate}">
            </div>

            <div class="edit-field">
                <label>Status</label>
                <input type="text" id="edit_status" value="${card.status}">
            </div>

            <div class="edit-field">
                <label>Target Minimum Payment ($)</label>
                <input type="number" id="edit_targetMin" value="${card.targetMin}">
            </div>

            <div class="edit-field">
                <label>Notes</label>
                <textarea id="edit_cardNotes" rows="3">${card.negotiationNotes || ''}</textarea>
            </div>

            <div class="edit-actions">
                <button class="btn-cancel" onclick="this.closest('.edit-overlay').remove()">Cancel</button>
                <button class="btn-save" onclick="saveCreditCardEdit('${cardId}')">Save Changes</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function saveCreditCardEdit(cardId) {
    const card = getValues(financials.creditCards).find(c => c.id === cardId);
    if (!card) return;

    card.balance = parseFloat(document.getElementById('edit_balance').value) || 0;
    card.daysLate = parseInt(document.getElementById('edit_daysLate').value) || 0;
    card.status = document.getElementById('edit_status').value || card.status;
    card.targetMin = parseFloat(document.getElementById('edit_targetMin').value) || 0;
    card.negotiationNotes = document.getElementById('edit_cardNotes').value || '';

    // Update template credit card amount when minimums change
    const totalMinimums = getValues(financials.creditCards).reduce((sum, c) => sum + c.targetMin, 0);
    if (financials.expenseTemplate && financials.expenseTemplate.creditCards) {
        financials.expenseTemplate.creditCards.amount = totalMinimums;
    }

    saveData();
    renderFinancialCockpit();
    updateCockpitStats();
    document.querySelector('.edit-overlay').remove();

    showToast(`Updated ${card.name}`, '✓');
}

// ============================================
// HELP SYSTEM - COMPREHENSIVE GUIDES
// ============================================

function openFinancialHelp() {
    const modal = document.getElementById('financialHelpModal');
    if (!modal) return;
    ensureModalOnBody(modal);
    modal.style.display = 'flex';
}

function closeFinancialHelp() {
    document.getElementById('financialHelpModal').style.display = 'none';
}

function showFinancialHelp(topic) {
    const helpContent = document.getElementById('helpContent');

    const helpTopics = {
        masterLiquidity: `
            <h2>💰 Master Liquidity Control - How To Use</h2>

            <div class="help-tip">
                <strong>💡 TIP:</strong> Update this EVERY time you check your bank account. The more accurate this number, the better your projections!
            </div>

            <h3>Step-by-Step Instructions:</h3>
            <div class="help-section">
                <p><strong>1. Open your Chase checking account</strong></p>
                <p>Log into your bank and check your ACTUAL available balance right now.</p>
            </div>

            <div class="help-section">
                <p><strong>2. Click "Update Cash Amount" button</strong></p>
                <p>This opens a prompt where you can enter the exact dollar amount.</p>
            </div>

            <div class="help-section">
                <p><strong>3. Enter your actual cash amount</strong></p>
                <p>Type the number WITHOUT the dollar sign. For example: 18447</p>
            </div>

            <div class="help-section">
                <p><strong>4. Watch everything recalculate!</strong></p>
                <p>✅ Projected May 14 balance updates<br>
                ✅ Available cash after bills recalculates<br>
                ✅ Health status changes (Green/Yellow/Red)<br>
                ✅ Progress bar adjusts</p>
            </div>

            <h3>When To Update:</h3>
            <div class="help-tip">
                📅 <strong>Update on these key dates:</strong><br>
                • Jan 10 - When loan hits ($18,447)<br>
                • After EVERY payment you make<br>
                • Weekly check-ins (every Sunday)<br>
                • Before making big decisions
            </div>
        `,

        committedBills: `
            <h2>📋 One-Time Bills & Monthly Expenses</h2>

            <div class="help-tip">
                <strong>💡 KEY CONCEPT:</strong> One-time bills are things you pay ONCE (not monthly). Think of them as special payments that happen on specific dates.
            </div>

            <h3>Types of One-Time Items:</h3>
            <div class="help-section">
                <p><strong>💸 Expenses (Red):</strong> Money going OUT</p>
                <p>Examples: Pay back brother ($200), textbook purchase, etc.</p>
            </div>

            <div class="help-section">
                <p><strong>💚 Income (Green):</strong> Money coming IN</p>
                <p>Examples: Loan disbursement ($18,447), tax refund, etc.</p>
            </div>

            <h3>How To Use:</h3>
            <div class="help-section">
                <p>✅ <strong>Check off</strong> items as you pay/receive them</p>
                <p>📝 <strong>Edit</strong> to update amounts or dates</p>
                <p>➕ <strong>Add</strong> new one-time bills as they come up</p>
                <p>🗑️ <strong>Delete</strong> items that no longer apply</p>
            </div>

            <h3>Impact on Projections:</h3>
            <div class="help-tip">
                Only <strong>UNCHECKED</strong> items affect your May 14 projection.<br>
                As you check items off, your projected balance changes!
            </div>
        `,

        negotiation: `
            <h2>📞 Credit Card Negotiation Guide</h2>

            <div class="help-tip">
                <strong>💡 KEY INSIGHT:</strong> Credit card companies would rather get SOMETHING than send you to collections. You have more leverage than you think!
            </div>

            <h3>The Script:</h3>
            <div class="help-section">
                <p><strong>Step 1:</strong> Call the number on the back of your card</p>
                <p><strong>Step 2:</strong> Say: "I'm a dental student with limited income. I want to pay but I need help with my minimum payment."</p>
                <p><strong>Step 3:</strong> Ask for their "hardship" or "financial difficulty" department</p>
                <p><strong>Step 4:</strong> Request a reduced minimum payment ($25-35/month)</p>
                <p><strong>Step 5:</strong> Ask about 0% interest programs or payment plans</p>
            </div>

            <h3>Pro Tips:</h3>
            <div class="help-section">
                <p>• Call early in the morning (shorter hold times)</p>
                <p>• Be calm, polite, but firm</p>
                <p>• If first rep says no, hang up and call again</p>
                <p>• Always get a confirmation number</p>
                <p>• Document everything in the card's notes field</p>
            </div>

            <h3>Card-Specific Tips:</h3>
            <div class="help-section">
                <p><strong>Chase:</strong></p>
                <p>• Best customer service, most flexible</p>
                <p>• Ask for "Payment Protection" program</p>
                <p>• Mention your student status</p>
            </div>

            <div class="help-section">
                <p><strong>Credit One (Subprime):</strong></p>
                <p>• Reps can be rude - don't take it personally<br>
                • Ask for hardship department if first rep is unhelpful<br>
                • Be persistent but polite<br>
                • Get confirmation number BEFORE hanging up</p>
            </div>

            <div class="help-section">
                <p><strong>Milestone & Indigo:</strong></p>
                <p>• Smaller banks, more flexible<br>
                • Emphasize you're preventing charge-off<br>
                • They want SOMETHING rather than nothing</p>
            </div>
        `,

        projections: `
            <h2>📊 Understanding Your Projections</h2>

            <div class="help-tip">
                <strong>💡 KEY CONCEPT:</strong> This shows your projected balance on May 14, 2026 (next loan disbursement) based on actual expenses you still need to pay.
            </div>

            <h3>How The Math Works:</h3>
            <div class="help-section">
                <p><strong>Step 1: Current Cash in Checking</strong></p>
                <p>Your actual balance from "Master Liquidity Control"</p>
            </div>

            <div class="help-section">
                <p><strong>Step 2: + Unpaid One-Time Income</strong></p>
                <p>Income items in One-Time Bills you haven't checked off yet (e.g., loan disbursement)</p>
            </div>

            <div class="help-section">
                <p><strong>Step 3: − Unpaid One-Time Expenses</strong></p>
                <p>One-time bills you haven't checked off yet (e.g., paying back brother)</p>
            </div>

            <div class="help-section">
                <p><strong>Step 4: − Unpaid Monthly Expenses</strong></p>
                <p>Only the INDIVIDUAL unchecked expenses across all months:</p>
                <p>• Each month shows its own paid/unpaid count</p>
                <p>• Only unchecked items in each month are subtracted</p>
                <p>• May 1-14 amounts are pre-scaled to 45% already</p>
            </div>

            <div class="help-section">
                <p><strong>Step 5: = May 14 Projected Balance</strong></p>
                <p>This is what you'll have when the next disbursement arrives!</p>
            </div>

            <h3>🚦 What The Colors Mean:</h3>
            <div class="help-section">
                <p><strong style="color: #4ade80;">🟢 GREEN - "ON TRACK":</strong></p>
                <p>You'll have MORE than your $2,285 target cushion. Great shape!</p>
            </div>

            <div class="help-section">
                <p><strong style="color: #fbbf24;">🟡 YELLOW - "BELOW TARGET":</strong></p>
                <p>You'll have SOME cushion but less than $2,285. Tight but okay.</p>
            </div>

            <div class="help-section">
                <p><strong style="color: #f87171;">🔴 RED - "DEFICIT PROJECTED":</strong></p>
                <p>You're projected to RUN OUT before May 14. Adjust spending!</p>
            </div>

            <h3>How To Improve Your Projection:</h3>
            <div class="help-tip">
                ✅ Check off individual expenses as you pay them<br>
                ✅ Use "Pay All" when you've paid an entire month<br>
                ✅ Negotiate credit card minimums down (update template + months)<br>
                ✅ Delete unnecessary expenses from specific months<br>
                ✅ Update actual cash (might be higher than you thought!)
            </div>
        `,

        recurringExpenses: `
            <h2>🔄 Per-Month Expenses - How To Use</h2>

            <div class="help-tip">
                <strong>💡 KEY:</strong> Each month has its OWN independent set of expenses. Editing one month does NOT affect any other month!
            </div>

            <h3>How It Works:</h3>
            <div class="help-section">
                <p>Each month (Feb, Mar, Apr, May 1-14) shows a collapsible card with all its expenses. Click the header to expand/collapse.</p>
            </div>

            <h3>Checking Off Expenses:</h3>
            <div class="help-section">
                <p><strong>Individual:</strong> Click the checkbox next to each expense as you pay it.</p>
                <p><strong>Pay All:</strong> Use the "Pay All" button to mark every expense in a month as paid at once.</p>
                <p><strong>Undo:</strong> Click "Uncheck All" (appears when all are paid) to reset a month.</p>
            </div>

            <h3>Customizing Per Month:</h3>
            <div class="help-section">
                <p><strong>Edit:</strong> Change an expense's name, amount, or category for that specific month.</p>
                <p><strong>Delete:</strong> Remove an expense from a specific month (doesn't affect other months).</p>
                <p><strong>Add:</strong> Use "+ Add" to add a custom expense to a specific month.</p>
            </div>

            <h3>Expense Template:</h3>
            <div class="help-section">
                <p>The template defines your DEFAULT monthly expenses. It's used to initialize new months.</p>
                <p><strong>Editing the template does NOT change existing months</strong> — only future months you create.</p>
            </div>

            <h3>Projection Impact:</h3>
            <div class="help-section">
                <p>Only <strong>unchecked</strong> expenses are subtracted from your projection. As you check off items, your May 14 projected balance goes UP.</p>
            </div>
        `,

        expenseTemplate: `
            <h2>📝 Expense Template - How To Use</h2>

            <div class="help-tip">
                <strong>💡 KEY:</strong> The template defines the DEFAULT expenses that each new month starts with. Editing the template does NOT retroactively change existing months.
            </div>

            <h3>What's In The Template:</h3>
            <div class="help-section">
                <p>Your standard monthly expenses: rent, parking, gym, food, credit card minimums, etc.</p>
            </div>

            <h3>When To Edit The Template:</h3>
            <div class="help-section">
                <p>• After negotiating a lower credit card minimum</p>
                <p>• When a recurring cost changes (e.g., rent increase)</p>
                <p>• To add a new monthly expense category</p>
            </div>

            <div class="help-warning">
                <strong>⚠️ NOTE:</strong> If you want to change an expense for a SPECIFIC month (e.g., March only), edit it in the monthly expenses section instead. The template is only for setting defaults.
            </div>
        `
    };

    helpContent.innerHTML = helpTopics[topic] || '<p>Help topic not found.</p>';
    openFinancialHelp();
}
