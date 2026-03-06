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
    // Redirect to integrated financials view (backwards-compatible alias)
    if (typeof sidebarNavigate === 'function') {
        sidebarNavigate('financials');
    }
}

function closeFinancials() {
    // No-op — modal removed, financials is now an integrated view
    // Kept for backwards compatibility with any stray callers
}

// Calculate real-time financial status with per-month expense tracking
function calculateFinancialStatus() {
    if (!financials || !financials.masterLiquidity) {
        return {
            currentLiquid: 0, oneTimeExpenses: 0, oneTimeIncome: 0,
            availableCash: 0, monthlyDetails: [], totalUnpaidMonthly: 0,
            daysRemaining: 0, projectedBalance: 0, targetCushion: 2285,
            healthStatus: 'unknown', healthColor: 'var(--fg-tertiary)', healthMessage: 'DATA NOT LOADED'
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

    var healthStatus = 'good', healthColor = 'var(--success)', healthMessage = 'ON TRACK';
    if (projectedBalance < 0) { healthStatus = 'critical'; healthColor = 'var(--destructive)'; healthMessage = 'DEFICIT PROJECTED'; }
    else if (projectedBalance < financials.masterLiquidity.targetCushion) { healthStatus = 'warning'; healthColor = 'var(--warning)'; healthMessage = 'BELOW TARGET'; }

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
        dashboard.innerHTML = '<div style="padding: 40px; color: var(--destructive); background: var(--surface-primary); border-radius: 12px; margin: 20px;"><h3>Rendering Error</h3><p style="margin-top: 15px; color: var(--fg-secondary);">' + escapeHtml(error.message) + '</p></div>';
    }
}

function renderMasterCockpit() {
    var status = calculateFinancialStatus();
    var lastUpdated = financials.masterLiquidity.lastUpdated
        ? new Date(financials.masterLiquidity.lastUpdated).toLocaleString()
        : 'Never';

    return '<div class="fin-section fin-master-cockpit" style="background: linear-gradient(135deg, var(--surface-primary) 0%, var(--accent) 100%); border: none;">' +
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
            '<div class="fin-quick-stat"><div class="fin-quick-label">One-Time Bills</div><div class="fin-quick-value" style="color: var(--destructive-light);">-$' + status.oneTimeExpenses.toLocaleString() + '</div></div>' +
            '<div class="fin-quick-stat"><div class="fin-quick-label">Expected Income</div><div class="fin-quick-value" style="color: var(--success-light);">+$' + status.oneTimeIncome.toLocaleString() + '</div></div>' +
            '<div class="fin-quick-stat"><div class="fin-quick-label">After One-Time</div><div class="fin-quick-value" style="color: white;">$' + status.availableCash.toLocaleString() + '</div></div>' +
            '<div class="fin-quick-stat"><div class="fin-quick-label">Unpaid Monthly</div><div class="fin-quick-value" style="color: var(--warning);">-$' + status.totalUnpaidMonthly.toLocaleString() + '</div></div>' +
        '</div>' +
    '</div>';
}

function renderOverviewDashboard() {
    var status = calculateFinancialStatus();
    var lastUpdated = financials.masterLiquidity.lastUpdated
        ? new Date(financials.masterLiquidity.lastUpdated).toLocaleString()
        : 'Never';
    var totalDebt = getValues(financials.creditCards || {}).reduce(function(sum, c) { return sum + (c.balance || 0); }, 0);
    var incompleteActions = getValues(financials.actionItems || {}).filter(function(a) { return !a.completed; }).length;
    var progressPercent = Math.max(0, Math.min(100, (status.projectedBalance / status.targetCushion) * 100));

    // Waterfall bar widths (relative to currentLiquid)
    var maxVal = Math.max(status.currentLiquid, 1);
    var billsPct = Math.min(100, (status.oneTimeExpenses / maxVal) * 100);
    var monthlyPct = Math.min(100, (status.totalUnpaidMonthly / maxVal) * 100);
    var projPct = Math.min(100, Math.max(0, (Math.abs(status.projectedBalance) / maxVal) * 100));

    var html = '<div class="fd-grid">';

    // === Row 1, Col 1: Cash Position ===
    html += '<div class="fd-card">' +
        '<div class="fd-card-title">CASH POSITION</div>' +
        '<div class="fd-card-value">$' + status.currentLiquid.toLocaleString() + '</div>' +
        '<button onclick="updateMasterLiquidity()" class="fd-btn-sm">Update Cash</button>' +
        '<div class="fd-card-sub">Updated: ' + escapeHtml(lastUpdated) + '</div>' +
        '<div style="margin-top:8px;">' +
            '<span class="fd-card-value" style="font-size:1.1em;color:' + status.healthColor + ';">$' + status.projectedBalance.toLocaleString() + '</span>' +
            ' <span class="fd-badge" style="background:' + status.healthColor + ';color:#fff;font-size:0.7em;padding:2px 6px;border-radius:4px;vertical-align:middle;">' + status.healthMessage + '</span>' +
        '</div>' +
    '</div>';

    // === Row 1, Col 2: Runway Donut ===
    html += '<div class="fd-card" style="text-align:center;">' +
        '<div class="fd-card-title">RUNWAY</div>' +
        '<div class="fd-chart-container"><canvas id="runwayDonutChart" width="150" height="150"></canvas></div>' +
        '<div class="fd-card-sub">' + status.daysRemaining + ' days remaining</div>' +
    '</div>';

    // === Row 2: Monthly Burn (full width) ===
    html += '<div class="fd-card fd-grid-full">' +
        '<div class="fd-card-title">MONTHLY BURN</div>' +
        '<div class="fd-chart-container"><canvas id="monthlyBarsChart" style="width:100%;height:120px;"></canvas></div>' +
    '</div>';

    // === Row 2b: Cash Flow (full width) ===
    html += '<div class="fd-card fd-grid-full">' +
        '<div class="fd-card-title">CASH FLOW</div>' +
        '<div class="fd-waterfall-bar"><span class="fd-waterfall-label">Cash</span><span class="fd-waterfall-amount" style="color:var(--success);">$' + status.currentLiquid.toLocaleString() + '</span><div class="fd-waterfall-fill" style="width:100%;background:var(--success);"></div></div>' +
        '<div class="fd-waterfall-bar"><span class="fd-waterfall-label">- Bills</span><span class="fd-waterfall-amount" style="color:var(--destructive);">-$' + status.oneTimeExpenses.toLocaleString() + '</span><div class="fd-waterfall-fill" style="width:' + billsPct + '%;background:var(--destructive);"></div></div>' +
        '<div class="fd-waterfall-bar"><span class="fd-waterfall-label">- Monthly</span><span class="fd-waterfall-amount" style="color:var(--warning);">-$' + status.totalUnpaidMonthly.toLocaleString() + '</span><div class="fd-waterfall-fill" style="width:' + monthlyPct + '%;background:var(--warning);"></div></div>' +
        '<div class="fd-waterfall-bar" style="border-top:1px solid var(--border-default);padding-top:6px;margin-top:4px;"><span class="fd-waterfall-label" style="font-weight:700;">= Projection</span><span class="fd-waterfall-amount" style="color:' + status.healthColor + ';font-weight:700;">$' + status.projectedBalance.toLocaleString() + '</span><div class="fd-waterfall-fill" style="width:' + projPct + '%;background:' + status.healthColor + ';"></div></div>' +
    '</div>';

    // === Row 3: Stats Strip (full width) ===
    html += '<div class="fd-grid-full fd-stats-strip">' +
        '<div class="fd-stat"><div class="fd-stat-label">One-Time Bills</div><div class="fd-stat-value" style="color:var(--destructive);">-$' + status.oneTimeExpenses.toLocaleString() + '</div></div>' +
        '<div class="fd-stat"><div class="fd-stat-label">Expected Income</div><div class="fd-stat-value" style="color:var(--success);">+$' + status.oneTimeIncome.toLocaleString() + '</div></div>' +
        '<div class="fd-stat"><div class="fd-stat-label">Unpaid Monthly</div><div class="fd-stat-value" style="color:var(--warning);">-$' + status.totalUnpaidMonthly.toLocaleString() + '</div></div>' +
        '<div class="fd-stat"><div class="fd-stat-label">Days Left</div><div class="fd-stat-value">' + status.daysRemaining + '</div></div>' +
    '</div>';

    // === Row 4, Col 1: Projection Detail ===
    html += '<div class="fd-card">' +
        '<div class="fd-card-title">PROJECTION DETAIL</div>';

    html += '<div class="fd-projection-row"><span>Current Cash</span><span style="color:var(--success);">$' + status.currentLiquid.toLocaleString() + '</span></div>';

    if (status.oneTimeIncome > 0) {
        html += '<div class="fd-projection-row"><span>+ Expected Income</span><span style="color:var(--success);">+$' + status.oneTimeIncome.toLocaleString() + '</span></div>';
    }
    if (status.oneTimeExpenses > 0) {
        html += '<div class="fd-projection-row"><span>- One-Time Bills</span><span style="color:var(--destructive);">-$' + status.oneTimeExpenses.toLocaleString() + '</span></div>';
    }

    html += '<div class="fd-projection-row" style="border-top:1px solid var(--border-default);padding-top:4px;"><span>= After One-Time</span><span style="font-weight:600;">$' + status.availableCash.toLocaleString() + '</span></div>';

    for (var mi = 0; mi < status.monthlyDetails.length; mi++) {
        var month = status.monthlyDetails[mi];
        html += '<div class="fd-projection-row"><span>- ' + escapeHtml(month.label) + (month.allPaid ? ' (PAID)' : '') + '</span><span style="color:' + (month.allPaid ? 'var(--success)' : 'var(--destructive)') + ';">' + (month.allPaid ? 'PAID' : '-$' + month.unpaidAmount.toLocaleString()) + '</span></div>';
    }

    html += '<div class="fd-projection-row total" style="border-top:2px solid var(--border-default);padding-top:6px;margin-top:4px;font-weight:700;"><span>Projected Balance</span><span style="color:' + status.healthColor + ';">$' + status.projectedBalance.toLocaleString() + '</span></div>';
    html += '<div style="margin-top:6px;"><div style="display:flex;justify-content:space-between;font-size:0.75em;color:var(--fg-secondary);margin-bottom:3px;"><span>Target: $' + status.targetCushion.toLocaleString() + '</span><span style="color:' + status.healthColor + ';font-weight:600;">' + progressPercent.toFixed(0) + '%</span></div>' +
        '<div style="height:6px;background:var(--surface-secondary);border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + progressPercent + '%;background:' + status.healthColor + ';border-radius:3px;transition:width 0.3s;"></div></div></div>';
    html += '</div>';

    // === Row 4, Col 2: Status Summary ===
    html += '<div class="fd-card">' +
        '<div class="fd-card-title">STATUS</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.8em;"><span>Health</span><span style="background:' + status.healthColor + ';color:#fff;padding:2px 8px;border-radius:4px;font-size:0.85em;font-weight:600;">' + status.healthMessage + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.8em;"><span>Incomplete Actions</span><span style="font-weight:600;color:' + (incompleteActions > 0 ? 'var(--warning)' : 'var(--success)') + ';">' + incompleteActions + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.8em;"><span>Credit Card Debt</span><span style="font-weight:600;color:' + (totalDebt > 0 ? 'var(--destructive)' : 'var(--success)') + ';">$' + totalDebt.toLocaleString() + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.8em;"><span>Days Remaining</span><span style="font-weight:600;">' + status.daysRemaining + '</span></div>' +
    '</div>';

    html += '</div>'; // close fd-grid
    return html;
}

function updateMasterLiquidity() {
    var existing = document.getElementById('finInlineEdit');
    if (existing) existing.remove();

    var current = financials.masterLiquidity.currentCash;
    var targetEl = document.querySelector('.fd-grid') || document.getElementById('finPanelOverview');
    if (!targetEl) return;

    var formHtml = '<div id="finInlineEdit" class="fin-inline-edit">' +
        '<h3 style="margin:0 0 15px;color:var(--accent);text-align:center;">Update Cash Balance</h3>' +
        '<div style="display:grid;gap:12px;">' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Actual Cash in Checking ($)</label>' +
        '<input type="number" id="edit_cashAmount" value="' + current + '" step="0.01" inputmode="decimal" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1.5em;text-align:center;font-weight:700;"></div>' +
        '</div>' +
        '<div style="margin:15px 0;padding:12px;background:var(--accent-light);border-radius:8px;font-size:0.9em;color:var(--accent);">Enter your actual bank balance to get accurate projections.</div>' +
        '<div style="display:flex;gap:10px;margin-top:15px;justify-content:flex-end;">' +
        '<button onclick="document.getElementById(\'finInlineEdit\').remove()" style="padding:10px 20px;border:1px solid var(--border-default);border-radius:8px;background:var(--surface-primary);cursor:pointer;font-weight:600;">Cancel</button>' +
        '<button onclick="saveMasterLiquidity()" style="padding:10px 20px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;font-weight:600;">Save</button>' +
        '</div></div>';

    targetEl.insertAdjacentHTML('beforebegin', formHtml);
    var formEl = document.getElementById('finInlineEdit');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(function() {
        var input = document.getElementById('edit_cashAmount');
        if (input) { input.focus(); input.select(); }
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
    renderCurrentFinTab();
    updateFinViewStats();
    var inlineEdit = document.getElementById('finInlineEdit');
    if (inlineEdit) inlineEdit.remove();

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
            '<div style="display: flex; align-items: center; gap: 10px;">' +
                '<h3 style="margin: 0;">One-Time Bills</h3>' +
                '<button onclick="addOneTimeBill()" class="fin-add-btn">+ Add</button>' +
            '</div>' +
            '<div style="text-align: right;">' +
                '<div style="font-size: 0.7em; color: var(--fg-secondary);">Unpaid</div>' +
                '<div style="font-size: 1.05em; font-weight: 700; color: var(--destructive);">-$' + totalUnpaidExpenses.toLocaleString() + '</div>' +
                (totalUnpaidIncome > 0 ? '<div style="font-size: 1em; color: var(--success);">+$' + totalUnpaidIncome.toLocaleString() + '</div>' : '') +
            '</div>' +
        '</div>';

    if (unpaid.length === 0 && paid.length === 0) {
        html += '<p style="text-align: center; padding: 15px; color: var(--success); font-size: 0.9em;">No one-time bills</p>';
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
                    '<div class="cash-amount ' + (bill.type === 'income' ? 'positive' : 'negative') + '" style="font-size: 1em;">' + (bill.type === 'income' ? '+' : '-') + '$' + bill.amount.toLocaleString() + '</div>' +
                    (!bill.paid ? '<button onclick="event.stopPropagation(); editOneTimeBill(\'' + bill.id + '\')" style="background: var(--accent); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75em; margin-top: 4px;">Edit</button>' +
                    '<button onclick="event.stopPropagation(); deleteOneTimeBill(\'' + bill.id + '\')" style="background: var(--destructive); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75em; margin-top: 4px; margin-left: 4px;">x</button>' : '') +
                '</div></div></div></div>';
    }

    html += '</div>';
    return html;
}

function toggleOneTimeBillPaid(billId) {
    var bills = financials.oneTimeBills || {};
    if (!bills[billId]) return;
    bills[billId].paid = !bills[billId].paid;
    saveData(); renderCurrentFinTab(); updateFinViewStats();
    if (bills[billId].paid) showToast('Marked paid: ' + bills[billId].description, 'v');
}

function addOneTimeBill() {
    var existing = document.getElementById('finInlineEdit');
    if (existing) existing.remove();

    var targetEl = document.getElementById('finPanelBills');
    if (!targetEl) return;

    var formHtml = '<div id="finInlineEdit" class="fin-inline-edit">' +
        '<h3 style="margin:0 0 15px;color:var(--accent);">Add One-Time Bill</h3>' +
        '<div style="display:grid;gap:12px;">' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Description</label>' +
        '<input type="text" id="new_otb_desc" placeholder="e.g., New textbook" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Amount ($)</label>' +
        '<input type="number" id="new_otb_amount" value="0" step="0.01" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Type</label>' +
        '<select id="new_otb_type" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;background:var(--canvas-subtle);color:var(--fg-primary);"><option value="expense">Expense</option><option value="income">Income</option></select></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Due Date</label>' +
        '<input type="date" id="new_otb_date" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;background:var(--canvas-subtle);color:var(--fg-primary);"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Notes (optional)</label>' +
        '<input type="text" id="new_otb_notes" placeholder="Any notes..." style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:15px;justify-content:flex-end;">' +
        '<button onclick="document.getElementById(\'finInlineEdit\').remove()" style="padding:10px 20px;border:1px solid var(--border-default);border-radius:8px;background:var(--surface-primary);cursor:pointer;font-weight:600;">Cancel</button>' +
        '<button onclick="saveNewOneTimeBill()" style="padding:10px 20px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;font-weight:600;">Add Bill</button>' +
        '</div></div>';

    targetEl.insertAdjacentHTML('afterbegin', formHtml);
    var formEl = document.getElementById('finInlineEdit');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    financials.oneTimeBills[id] = { id: id, description: desc, amount: amount, type: type, dueDate: dueDate || new Date().toISOString().split('T')[0], paid: false, category: 'other', notes: notes || null };
    saveData(); renderCurrentFinTab(); updateFinViewStats();
    var inlineEdit = document.getElementById('finInlineEdit'); if (inlineEdit) inlineEdit.remove();
    showToast('Added: ' + desc, '+');
}

function editOneTimeBill(billId) {
    var bill = (financials.oneTimeBills || {})[billId];
    if (!bill) return;

    var existing = document.getElementById('finInlineEdit');
    if (existing) existing.remove();

    var targetEl = document.getElementById('finPanelBills');
    if (!targetEl) return;

    var formHtml = '<div id="finInlineEdit" class="fin-inline-edit">' +
        '<h3 style="margin:0 0 15px;color:var(--accent);">Edit Bill</h3>' +
        '<div style="display:grid;gap:12px;">' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Description</label>' +
        '<input type="text" id="edit_otb_desc" value="' + escapeHtml(bill.description) + '" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Amount ($)</label>' +
        '<input type="number" id="edit_otb_amount" value="' + bill.amount + '" step="0.01" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Due Date</label>' +
        '<input type="date" id="edit_otb_date" value="' + (bill.dueDate || '') + '" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;background:var(--canvas-subtle);color:var(--fg-primary);"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Notes</label>' +
        '<textarea id="edit_otb_notes" rows="2" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;">' + escapeHtml(bill.notes || '') + '</textarea></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:15px;justify-content:flex-end;">' +
        '<button onclick="document.getElementById(\'finInlineEdit\').remove()" style="padding:10px 20px;border:1px solid var(--border-default);border-radius:8px;background:var(--surface-primary);cursor:pointer;font-weight:600;">Cancel</button>' +
        '<button onclick="saveOneTimeBillEdit(\'' + billId + '\')" style="padding:10px 20px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;font-weight:600;">Save</button>' +
        '</div></div>';

    targetEl.insertAdjacentHTML('afterbegin', formHtml);
    var formEl = document.getElementById('finInlineEdit');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveOneTimeBillEdit(billId) {
    var bill = (financials.oneTimeBills || {})[billId];
    if (!bill) return;
    bill.description = document.getElementById('edit_otb_desc').value;
    bill.amount = parseFloat(document.getElementById('edit_otb_amount').value) || 0;
    bill.dueDate = document.getElementById('edit_otb_date').value;
    bill.notes = document.getElementById('edit_otb_notes').value || '';
    saveData(); renderCurrentFinTab(); updateFinViewStats();
    var inlineEdit = document.getElementById('finInlineEdit'); if (inlineEdit) inlineEdit.remove();
    showToast('Bill updated', 'v');
}

function deleteOneTimeBill(billId) {
    var bill = (financials.oneTimeBills || {})[billId];
    if (!bill) return;
    showCustomConfirm('Delete "' + bill.description + '"?', function() {
        delete financials.oneTimeBills[billId];
        saveData(); renderCurrentFinTab(); updateFinViewStats();
        showToast('Deleted: ' + bill.description, 'x');
    }, null, 'Delete Bill');
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
            '<div style="display: flex; align-items: center; gap: 10px;"><h3 style="margin: 0;">Monthly Expenses</h3></div>' +
            '<div style="text-align: right;">' +
                '<div style="font-size: 0.7em; color: var(--fg-secondary);">' + totalPaidMonths + '/' + totalMonths + ' months complete</div>' +
                '<div style="font-size: 1.05em; font-weight: 700; color: var(--warning);">-$' + status.totalUnpaidMonthly.toLocaleString() + ' remaining</div>' +
            '</div></div>' +
        '<div style="margin-bottom: 8px; padding: 8px; background: var(--accent-light); border-left: 3px solid var(--accent); border-radius: 4px; font-size: 0.8em; color: var(--accent);">Tap a month to expand. Check expenses or use "Pay All".</div>';

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

        html += '<div style="margin-bottom: 8px; border: 1px solid ' + (allPaid ? 'var(--success)' : 'var(--border-default)') + '; border-radius: 8px; overflow: hidden;' + (allPaid ? ' opacity: 0.8;' : '') + '">' +
            '<div onclick="toggleMonthCollapse(\'' + monthKey + '\')" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: ' + (allPaid ? 'var(--success-light)' : 'var(--canvas-subtle)') + '; cursor: pointer; user-select: none;">' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    '<span id="arrow_' + monthKey + '" style="color: var(--fg-secondary); font-size: 0.8em; font-family: monospace; min-width: 12px; text-align: center;">' + (collapsed ? '>' : 'v') + '</span>' +
                    '<div><div style="font-weight: 700; color: ' + (allPaid ? 'var(--success)' : 'var(--fg-primary)') + '; font-size: 0.9em;">' + escapeHtml(monthData.label) + (monthData.partial ? ' (partial)' : '') + '</div>' +
                    '<div style="font-size: 0.7em; color: var(--fg-tertiary);">' + paidCount + '/' + totalCount + ' paid</div></div></div>' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    '<div style="text-align: right;"><div style="font-size: 0.95em; font-weight: 700; color: ' + (allPaid ? 'var(--success)' : 'var(--destructive)') + ';">' + (allPaid ? 'PAID' : '-$' + unpaidAmount.toLocaleString()) + '</div>' +
                    (!allPaid ? '<div style="font-size: 0.65em; color: var(--fg-tertiary);">of $' + totalAmount.toLocaleString() + '</div>' : '') + '</div>' +
                    (!allPaid ? '<button onclick="event.stopPropagation(); payAllMonth(\'' + monthKey + '\')" style="background: var(--success); color: white; border: none; padding: 5px 10px; border-radius: 4px; font-weight: 600; font-size: 0.75em; cursor: pointer; white-space: nowrap;">Pay All</button>' : '') +
                '</div></div>';

        html += '<div id="monthBody_' + monthKey + '" style="display: ' + (collapsed ? 'none' : 'block') + '; padding: 4px;">';
        for (var ei = 0; ei < expEntries.length; ei++) {
            var expKey = expEntries[ei][0], exp = expEntries[ei][1];
            html += '<div onclick="toggleMonthExpensePaid(\'' + monthKey + '\', \'' + expKey + '\')" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; margin: 2px 0; border-radius: 4px; cursor: pointer; background: ' + (exp.paid ? 'var(--success-light)' : 'transparent') + '; opacity: ' + (exp.paid ? '0.7' : '1') + ';">' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    '<div class="action-checkbox ' + (exp.paid ? 'checked' : '') + '" style="width: 18px; height: 18px; min-width: 18px;" onclick="event.stopPropagation(); toggleMonthExpensePaid(\'' + monthKey + '\', \'' + expKey + '\')"></div>' +
                    '<div><div style="font-weight: 600; color: ' + (exp.paid ? 'var(--success)' : 'var(--fg-primary)') + '; font-size: 0.85em;' + (exp.paid ? ' text-decoration: line-through;' : '') + '">' + escapeHtml(exp.name) + '</div>' +
                    '<div style="font-size: 0.65em; color: var(--fg-tertiary);">' + escapeHtml(exp.category) + (exp.notes ? ' - ' + escapeHtml(exp.notes) : '') + '</div></div></div>' +
                '<div style="display: flex; align-items: center; gap: 6px;">' +
                    '<div style="font-weight: 700; color: ' + (exp.paid ? 'var(--success)' : 'var(--destructive)') + '; font-size: 0.85em;">' + (exp.paid ? 'PAID' : '-$' + exp.amount.toLocaleString()) + '</div>' +
                    (!exp.paid ? '<button onclick="event.stopPropagation(); editMonthExpense(\'' + monthKey + '\', \'' + expKey + '\')" style="background: var(--accent); color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 0.7em;">Edit</button>' : '') +
                '</div></div>';
        }
        html += '<div style="padding: 4px 8px; margin-top: 2px;"><button onclick="addExpenseToMonth(\'' + monthKey + '\')" class="fin-add-btn" style="width: 100%; padding: 6px;">+ Add Expense</button></div>';
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
    saveData(); renderCurrentFinTab(); updateFinViewStats();
    if (month.expenses[expenseKey].paid) showToast('Paid: ' + month.expenses[expenseKey].name, 'v');
}

function payAllMonth(monthKey) {
    var month = (financials.months || {})[monthKey];
    if (!month || !month.expenses) return;
    var allPaid = Object.values(month.expenses).every(function(e) { return e.paid; });
    Object.values(month.expenses).forEach(function(exp) { exp.paid = !allPaid; });
    saveData(); renderCurrentFinTab(); updateFinViewStats();
    showToast(month.label + (allPaid ? ' - all marked unpaid' : ' - all marked paid'), 'v');
}

function editMonthExpense(monthKey, expenseKey) {
    var month = (financials.months || {})[monthKey];
    if (!month || !month.expenses || !month.expenses[expenseKey]) return;
    var exp = month.expenses[expenseKey];

    var existing = document.getElementById('finInlineEdit');
    if (existing) existing.remove();

    var targetEl = document.getElementById('monthBody_' + monthKey) || document.getElementById('finPanelMonthly');
    if (!targetEl) return;

    var formHtml = '<div id="finInlineEdit" class="fin-inline-edit">' +
        '<h3 style="margin:0 0 15px;color:var(--accent);">Edit ' + escapeHtml(exp.name) + ' - ' + escapeHtml(month.label) + '</h3>' +
        '<div style="display:grid;gap:12px;">' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Name</label>' +
        '<input type="text" id="edit_mexp_name" value="' + escapeHtml(exp.name) + '" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Amount ($)</label>' +
        '<input type="number" id="edit_mexp_amount" value="' + exp.amount + '" step="0.01" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Category</label>' +
        '<select id="edit_mexp_category" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;background:var(--canvas-subtle);color:var(--fg-primary);">' +
            '<option value="housing"' + (exp.category === 'housing' ? ' selected' : '') + '>Housing</option>' +
            '<option value="living"' + (exp.category === 'living' ? ' selected' : '') + '>Living</option>' +
            '<option value="wellness"' + (exp.category === 'wellness' ? ' selected' : '') + '>Wellness</option>' +
            '<option value="debt"' + (exp.category === 'debt' ? ' selected' : '') + '>Debt</option>' +
            '<option value="other"' + (exp.category === 'other' ? ' selected' : '') + '>Other</option></select></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Notes (optional)</label>' +
        '<input type="text" id="edit_mexp_notes" value="' + escapeHtml(exp.notes || '') + '" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:15px;justify-content:flex-end;">' +
        '<button onclick="document.getElementById(\'finInlineEdit\').remove()" style="padding:10px 20px;border:1px solid var(--border-default);border-radius:8px;background:var(--surface-primary);cursor:pointer;font-weight:600;">Cancel</button>' +
        '<button onclick="saveMonthExpenseEdit(\'' + monthKey + '\', \'' + expenseKey + '\')" style="padding:10px 20px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;font-weight:600;">Save</button>' +
        '</div>' +
        '<div style="margin-top:15px;text-align:center;"><button onclick="deleteMonthExpense(\'' + monthKey + '\', \'' + expenseKey + '\')" style="background:transparent;color:var(--destructive);border:1px solid var(--destructive);padding:10px 20px;border-radius:6px;cursor:pointer;font-size:0.9em;">Delete from ' + escapeHtml(month.label) + '</button></div></div>';

    targetEl.insertAdjacentHTML('afterbegin', formHtml);
    var formEl = document.getElementById('finInlineEdit');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveMonthExpenseEdit(monthKey, expenseKey) {
    var month = (financials.months || {})[monthKey];
    if (!month || !month.expenses || !month.expenses[expenseKey]) return;
    month.expenses[expenseKey].name = document.getElementById('edit_mexp_name').value.trim() || month.expenses[expenseKey].name;
    month.expenses[expenseKey].amount = parseFloat(document.getElementById('edit_mexp_amount').value) || 0;
    month.expenses[expenseKey].category = document.getElementById('edit_mexp_category').value;
    var notes = document.getElementById('edit_mexp_notes').value.trim();
    if (notes) { month.expenses[expenseKey].notes = notes; } else { delete month.expenses[expenseKey].notes; }
    saveData(); renderCurrentFinTab(); updateFinViewStats();
    var inlineEdit = document.getElementById('finInlineEdit'); if (inlineEdit) inlineEdit.remove();
    showToast('Expense updated', 'v');
}

function deleteMonthExpense(monthKey, expenseKey) {
    var month = (financials.months || {})[monthKey];
    if (!month || !month.expenses || !month.expenses[expenseKey]) return;
    var name = month.expenses[expenseKey].name;
    showCustomConfirm('Delete "' + name + '" from ' + month.label + '?', function() {
        delete month.expenses[expenseKey];
        saveData(); renderCurrentFinTab(); updateFinViewStats();
        var inlineEdit = document.getElementById('finInlineEdit'); if (inlineEdit) inlineEdit.remove();
        showToast('Deleted: ' + name, 'x');
    }, null, 'Delete Expense');
}

function addExpenseToMonth(monthKey) {
    var month = (financials.months || {})[monthKey];
    if (!month) return;

    var existing = document.getElementById('finInlineEdit');
    if (existing) existing.remove();

    var targetEl = document.getElementById('monthBody_' + monthKey) || document.getElementById('finPanelMonthly');
    if (!targetEl) return;

    var formHtml = '<div id="finInlineEdit" class="fin-inline-edit">' +
        '<h3 style="margin:0 0 15px;color:var(--accent);">Add Expense to ' + escapeHtml(month.label) + '</h3>' +
        '<div style="display:grid;gap:12px;">' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Expense Name</label>' +
        '<input type="text" id="new_mexp_name" placeholder="e.g., Insurance" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Amount ($)</label>' +
        '<input type="number" id="new_mexp_amount" value="0" step="0.01" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Category</label>' +
        '<select id="new_mexp_category" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;background:var(--canvas-subtle);color:var(--fg-primary);"><option value="housing">Housing</option><option value="living">Living</option><option value="wellness">Wellness</option><option value="debt">Debt</option><option value="other">Other</option></select></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:15px;justify-content:flex-end;">' +
        '<button onclick="document.getElementById(\'finInlineEdit\').remove()" style="padding:10px 20px;border:1px solid var(--border-default);border-radius:8px;background:var(--surface-primary);cursor:pointer;font-weight:600;">Cancel</button>' +
        '<button onclick="saveNewMonthExpense(\'' + monthKey + '\')" style="padding:10px 20px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;font-weight:600;">Add</button>' +
        '</div></div>';

    targetEl.insertAdjacentHTML('afterbegin', formHtml);
    var formEl = document.getElementById('finInlineEdit');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    saveData(); renderCurrentFinTab(); updateFinViewStats();
    var inlineEdit = document.getElementById('finInlineEdit'); if (inlineEdit) inlineEdit.remove();
    showToast('Added: ' + name + ' to ' + month.label, '+');
}

// ==================== EXPENSE TEMPLATE ====================
function renderExpenseTemplate() {
    var template = financials.expenseTemplate || {};
    var total = Object.values(template).reduce(function(sum, exp) { return sum + (exp.amount || 0); }, 0);

    var html = '<div class="fin-section" style="border-color: var(--info);">' +
        '<div class="fin-section-header" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div style="display: flex; align-items: center; gap: 10px;"><h3 style="margin: 0; color: var(--info);">Expense Template</h3></div>' +
            '<div style="text-align: right;"><div style="font-size: 0.7em; color: var(--fg-secondary);">Template Total</div>' +
            '<div style="font-size: 0.95em; font-weight: 700; color: var(--info);">$' + total.toLocaleString() + '/mo</div></div></div>' +
        '<div style="margin-bottom: 8px; padding: 6px 8px; background: var(--info-light); border-left: 3px solid var(--info); border-radius: 4px; font-size: 0.75em; color: var(--info);">Template sets defaults for new months. Existing months unaffected.</div>' +
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

    var existing = document.getElementById('finInlineEdit');
    if (existing) existing.remove();

    var targetEl = document.getElementById('finPanelTemplate');
    if (!targetEl) return;

    var formHtml = '<div id="finInlineEdit" class="fin-inline-edit">' +
        '<h3 style="margin:0 0 15px;color:var(--accent);">Edit Template: ' + escapeHtml(exp.name || expKey) + '</h3>' +
        '<div style="display:grid;gap:12px;">' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Name</label>' +
        '<input type="text" id="edit_tpl_name" value="' + escapeHtml(exp.name || expKey) + '" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Monthly Amount ($)</label>' +
        '<input type="number" id="edit_tpl_amount" value="' + exp.amount + '" step="0.01" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Category</label>' +
        '<select id="edit_tpl_category" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;background:var(--canvas-subtle);color:var(--fg-primary);">' +
            '<option value="housing"' + (exp.category === 'housing' ? ' selected' : '') + '>Housing</option>' +
            '<option value="living"' + (exp.category === 'living' ? ' selected' : '') + '>Living</option>' +
            '<option value="wellness"' + (exp.category === 'wellness' ? ' selected' : '') + '>Wellness</option>' +
            '<option value="debt"' + (exp.category === 'debt' ? ' selected' : '') + '>Debt</option>' +
            '<option value="other"' + (exp.category === 'other' ? ' selected' : '') + '>Other</option></select></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:15px;justify-content:flex-end;">' +
        '<button onclick="document.getElementById(\'finInlineEdit\').remove()" style="padding:10px 20px;border:1px solid var(--border-default);border-radius:8px;background:var(--surface-primary);cursor:pointer;font-weight:600;">Cancel</button>' +
        '<button onclick="saveTemplateExpenseEdit(\'' + expKey + '\')" style="padding:10px 20px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;font-weight:600;">Save</button>' +
        '</div></div>';

    targetEl.insertAdjacentHTML('afterbegin', formHtml);
    var formEl = document.getElementById('finInlineEdit');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveTemplateExpenseEdit(expKey) {
    var exp = (financials.expenseTemplate || {})[expKey];
    if (!exp) return;
    exp.name = document.getElementById('edit_tpl_name').value.trim() || exp.name;
    exp.amount = parseFloat(document.getElementById('edit_tpl_amount').value) || 0;
    exp.category = document.getElementById('edit_tpl_category').value;
    saveData(); renderCurrentFinTab(); updateFinViewStats();
    var inlineEdit = document.getElementById('finInlineEdit'); if (inlineEdit) inlineEdit.remove();
    showToast('Template updated', 'v');
}

function deleteTemplateExpense(expKey) {
    var exp = (financials.expenseTemplate || {})[expKey];
    if (!exp) return;
    showCustomConfirm('Delete "' + (exp.name || expKey) + '" from template?', function() {
        delete financials.expenseTemplate[expKey];
        saveData(); renderCurrentFinTab(); updateFinViewStats();
        showToast('Removed from template', 'x');
    }, null, 'Delete Template Expense');
}

function addTemplateExpense() {
    var existing = document.getElementById('finInlineEdit');
    if (existing) existing.remove();

    var targetEl = document.getElementById('finPanelTemplate');
    if (!targetEl) return;

    var formHtml = '<div id="finInlineEdit" class="fin-inline-edit">' +
        '<h3 style="margin:0 0 15px;color:var(--accent);">Add to Expense Template</h3>' +
        '<div style="display:grid;gap:12px;">' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Expense Name</label>' +
        '<input type="text" id="new_tpl_name" placeholder="e.g., Insurance" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Monthly Amount ($)</label>' +
        '<input type="number" id="new_tpl_amount" value="0" step="0.01" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Category</label>' +
        '<select id="new_tpl_category" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;background:var(--canvas-subtle);color:var(--fg-primary);"><option value="housing">Housing</option><option value="living">Living</option><option value="wellness">Wellness</option><option value="debt">Debt</option><option value="other">Other</option></select></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:15px;justify-content:flex-end;">' +
        '<button onclick="document.getElementById(\'finInlineEdit\').remove()" style="padding:10px 20px;border:1px solid var(--border-default);border-radius:8px;background:var(--surface-primary);cursor:pointer;font-weight:600;">Cancel</button>' +
        '<button onclick="saveNewTemplateExpense()" style="padding:10px 20px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;font-weight:600;">Add</button>' +
        '</div></div>';

    targetEl.insertAdjacentHTML('afterbegin', formHtml);
    var formEl = document.getElementById('finInlineEdit');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    saveData(); renderCurrentFinTab(); updateFinViewStats();
    var inlineEdit = document.getElementById('finInlineEdit'); if (inlineEdit) inlineEdit.remove();
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
                <h3>Action Checklist</h3>
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
                    deadlineText = 'Completed';
                    deadlineClass = 'ok';
                } else if (daysUntil < 0) {
                    deadlineText = `${Math.abs(daysUntil)} days overdue`;
                    deadlineClass = 'overdue';
                } else if (daysUntil === 0) {
                    deadlineText = 'DUE TODAY';
                    deadlineClass = 'overdue';
                } else if (daysUntil <= 3) {
                    deadlineText = `${daysUntil} days until deadline`;
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
        renderCurrentFinTab();
        updateFinViewStats();

        if (item.completed) {
            showToast(`${item.title}`, 'ok');
        }
    }
}

function renderCreditCards() {
    const sorted = [...getValues(financials.creditCards)].sort((a, b) => a.priority - b.priority);
    const totalBalance = sorted.reduce((sum, card) => sum + card.balance, 0);
    const totalMinimums = sorted.reduce((sum, card) => sum + card.targetMin, 0);

    return `
        <div class="fin-section">
            <div class="fin-section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <h3 style="margin: 0;">Credit Cards</h3>
                    <button class="help-btn" onclick="event.stopPropagation(); showFinancialHelp('negotiation')" style="background: var(--success-light); border-color: var(--success); color: var(--success); font-size: 0.7em; padding: 3px 8px;">
                        Negotiate
                    </button>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.7em; color: var(--fg-secondary);">Total Balance</div>
                    <div style="font-size: 1.1em; font-weight: 700; color: var(--destructive);">$${totalBalance.toLocaleString()}</div>
                    <div style="font-size: 0.7em; color: var(--fg-secondary); margin-top: 2px;">Min: $${totalMinimums}/mo</div>
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
                        <div style="margin-top: 6px; padding: 6px 8px; background: var(--accent-light); border-left: 2px solid var(--accent); border-radius: 3px; font-size: 0.75em; color: var(--fg-secondary);">
                            ${card.negotiationNotes}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function editCreditCard(cardId) {
    var card = getValues(financials.creditCards).find(function(c) { return c.id === cardId; });
    if (!card) return;

    var existing = document.getElementById('finInlineEdit');
    if (existing) existing.remove();

    var targetEl = document.getElementById('finPanelCards');
    if (!targetEl) return;

    var formHtml = '<div id="finInlineEdit" class="fin-inline-edit">' +
        '<h3 style="margin:0 0 15px;color:var(--accent);">Edit ' + escapeHtml(card.name) + '</h3>' +
        '<div style="display:grid;gap:12px;">' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Current Balance ($)</label>' +
        '<input type="number" id="edit_balance" value="' + card.balance + '" step="0.01" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Days Late</label>' +
        '<input type="number" id="edit_daysLate" value="' + card.daysLate + '" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Status</label>' +
        '<input type="text" id="edit_status" value="' + escapeHtml(card.status) + '" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Target Minimum Payment ($)</label>' +
        '<input type="number" id="edit_targetMin" value="' + card.targetMin + '" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;"></div>' +
        '<div><label style="display:block;margin-bottom:4px;font-weight:600;font-size:0.85em;color:var(--fg-secondary);">Notes</label>' +
        '<textarea id="edit_cardNotes" rows="3" style="width:100%;padding:10px;border:1px solid var(--border-default);border-radius:8px;font-size:1em;">' + escapeHtml(card.negotiationNotes || '') + '</textarea></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:15px;justify-content:flex-end;">' +
        '<button onclick="document.getElementById(\'finInlineEdit\').remove()" style="padding:10px 20px;border:1px solid var(--border-default);border-radius:8px;background:var(--surface-primary);cursor:pointer;font-weight:600;">Cancel</button>' +
        '<button onclick="saveCreditCardEdit(\'' + cardId + '\')" style="padding:10px 20px;border:none;border-radius:8px;background:var(--accent);color:white;cursor:pointer;font-weight:600;">Save Changes</button>' +
        '</div></div>';

    targetEl.insertAdjacentHTML('afterbegin', formHtml);
    var formEl = document.getElementById('finInlineEdit');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    renderCurrentFinTab();
    updateFinViewStats();
    var inlineEdit = document.getElementById('finInlineEdit');
    if (inlineEdit) inlineEdit.remove();

    showToast(`Updated ${card.name}`, 'ok');
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
    var modal = document.getElementById('financialHelpModal');
    if (modal) modal.style.display = 'none';
}

function showFinancialHelp(topic) {
    const helpContent = document.getElementById('helpContent');

    const helpTopics = {
        masterLiquidity: `
            <h2>Master Liquidity Control - How To Use</h2>

            <div class="help-tip">
                <strong>TIP:</strong> Update this EVERY time you check your bank account. The more accurate this number, the better your projections!
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
                <p>Projected May 14 balance updates<br>
                Available cash after bills recalculates<br>
                Health status changes (Green/Yellow/Red)<br>
                Progress bar adjusts</p>
            </div>

            <h3>When To Update:</h3>
            <div class="help-tip">
                <strong>Update on these key dates:</strong><br>
                • Jan 10 - When loan hits ($18,447)<br>
                • After EVERY payment you make<br>
                • Weekly check-ins (every Sunday)<br>
                • Before making big decisions
            </div>
        `,

        committedBills: `
            <h2>One-Time Bills &amp; Monthly Expenses</h2>

            <div class="help-tip">
                <strong>KEY CONCEPT:</strong> One-time bills are things you pay ONCE (not monthly). Think of them as special payments that happen on specific dates.
            </div>

            <h3>Types of One-Time Items:</h3>
            <div class="help-section">
                <p><strong>Expenses (Red):</strong> Money going OUT</p>
                <p>Examples: Pay back brother ($200), textbook purchase, etc.</p>
            </div>

            <div class="help-section">
                <p><strong>Income (Green):</strong> Money coming IN</p>
                <p>Examples: Loan disbursement ($18,447), tax refund, etc.</p>
            </div>

            <h3>How To Use:</h3>
            <div class="help-section">
                <p><strong>Check off</strong> items as you pay/receive them</p>
                <p><strong>Edit</strong> to update amounts or dates</p>
                <p><strong>Add</strong> new one-time bills as they come up</p>
                <p><strong>Delete</strong> items that no longer apply</p>
            </div>

            <h3>Impact on Projections:</h3>
            <div class="help-tip">
                Only <strong>UNCHECKED</strong> items affect your May 14 projection.<br>
                As you check items off, your projected balance changes!
            </div>
        `,

        negotiation: `
            <h2>Credit Card Negotiation Guide</h2>

            <div class="help-tip">
                <strong>KEY INSIGHT:</strong> Credit card companies would rather get SOMETHING than send you to collections. You have more leverage than you think!
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
            <h2>Understanding Your Projections</h2>

            <div class="help-tip">
                <strong>KEY CONCEPT:</strong> This shows your projected balance on May 14, 2026 (next loan disbursement) based on actual expenses you still need to pay.
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

            <h3>What The Colors Mean:</h3>
            <div class="help-section">
                <p><strong style="color: var(--success);">GREEN - "ON TRACK":</strong></p>
                <p>You'll have MORE than your $2,285 target cushion. Great shape!</p>
            </div>

            <div class="help-section">
                <p><strong style="color: var(--warning);">YELLOW - "BELOW TARGET":</strong></p>
                <p>You'll have SOME cushion but less than $2,285. Tight but okay.</p>
            </div>

            <div class="help-section">
                <p><strong style="color: var(--destructive);">RED - "DEFICIT PROJECTED":</strong></p>
                <p>You're projected to RUN OUT before May 14. Adjust spending!</p>
            </div>

            <h3>How To Improve Your Projection:</h3>
            <div class="help-tip">
                Check off individual expenses as you pay them<br>
                Use "Pay All" when you've paid an entire month<br>
                Negotiate credit card minimums down (update template + months)<br>
                Delete unnecessary expenses from specific months<br>
                Update actual cash (might be higher than you thought!)
            </div>
        `,

        recurringExpenses: `
            <h2>Per-Month Expenses - How To Use</h2>

            <div class="help-tip">
                <strong>KEY:</strong> Each month has its OWN independent set of expenses. Editing one month does NOT affect any other month!
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
            <h2>Expense Template - How To Use</h2>

            <div class="help-tip">
                <strong>KEY:</strong> The template defines the DEFAULT expenses that each new month starts with. Editing the template does NOT retroactively change existing months.
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
                <strong>NOTE:</strong> If you want to change an expense for a SPECIFIC month (e.g., March only), edit it in the monthly expenses section instead. The template is only for setting defaults.
            </div>
        `
    };

    helpContent.innerHTML = helpTopics[topic] || '<p>Help topic not found.</p>';
    openFinancialHelp();
}

// ============================================
// TAB SYSTEM — Integrated Financial View
// ============================================

function renderFinancialsView() {
    switchFinTab(currentFinTab);
}

function switchFinTab(tabName) {
    currentFinTab = tabName;
    safeLocalStorageSet('dq_finTab', tabName);

    // Remove any open inline edit
    var inlineEdit = document.getElementById('finInlineEdit');
    if (inlineEdit) inlineEdit.remove();

    // Update tab active states
    var tabs = document.querySelectorAll('.fin-tab');
    tabs.forEach(function(t) {
        t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    });

    // Show/hide panels
    var panels = document.querySelectorAll('.fin-tab-panel');
    panels.forEach(function(p) {
        p.classList.toggle('active', p.id === 'finPanel' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    });

    // Render content into the active panel
    var panelId = 'finPanel' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    var panel = document.getElementById(panelId);
    if (panel) {
        renderFinTabContent(tabName, panel);
    }

    // Reinitialize Lucide icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}

function renderFinTabContent(tabName, panel) {
    try {
        switch (tabName) {
            case 'overview':
                panel.innerHTML = renderOverviewDashboard();
                setTimeout(function() { drawRunwayDonut('runwayDonutChart'); drawMonthlyBars('monthlyBarsChart'); }, 50);
                break;
            case 'bills':
                panel.innerHTML = renderOneTimeBills();
                break;
            case 'monthly':
                panel.innerHTML = renderMonthlyExpenses() + renderExpenseTemplate();
                break;
            case 'cards':
                panel.innerHTML = renderCreditCards();
                break;
            case 'actions':
                panel.innerHTML = renderActionItems();
                break;
            default:
                panel.innerHTML = renderOverviewDashboard();
                setTimeout(function() { drawRunwayDonut('runwayDonutChart'); drawMonthlyBars('monthlyBarsChart'); }, 50);
        }
    } catch (error) {
        console.error('Error rendering fin tab:', tabName, error);
        panel.innerHTML = '<div style="padding: 40px; color: var(--destructive); text-align: center;"><h3>Error loading ' + escapeHtml(tabName) + '</h3><p style="margin-top: 10px; color: var(--fg-secondary);">' + escapeHtml(error.message) + '</p></div>';
    }
}

function renderCurrentFinTab() {
    // Only re-render if the financials view is currently active
    var container = document.getElementById('financialsViewContainer');
    if (!container || container.style.display === 'none') return;

    var panelId = 'finPanel' + currentFinTab.charAt(0).toUpperCase() + currentFinTab.slice(1);
    var panel = document.getElementById(panelId);
    if (panel) {
        renderFinTabContent(currentFinTab, panel);
    }

    // Reinitialize Lucide icons
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}

function updateFinViewStats() {
    var debtEl = document.getElementById('finViewDebt');
    var balanceEl = document.getElementById('finViewBalance');
    var actionsEl = document.getElementById('finViewActions');
    var projEl = document.getElementById('finViewProjection');

    if (!debtEl) return; // Not rendered yet

    var status = calculateFinancialStatus();
    var totalDebt = getValues(financials.creditCards || {}).reduce(function(sum, card) { return sum + (card.balance || 0); }, 0);

    debtEl.textContent = '$' + totalDebt.toLocaleString();
    balanceEl.textContent = '$' + status.currentLiquid.toLocaleString();

    // Count unpaid actions
    var unpaidOneTime = getValues(financials.oneTimeBills || {}).filter(function(b) { return !b.paid && b.type === 'expense'; }).length;
    var unpaidMonthlyItems = 0;
    Object.values(financials.months || {}).forEach(function(month) {
        Object.values(month.expenses || {}).forEach(function(exp) { if (!exp.paid) unpaidMonthlyItems++; });
    });
    actionsEl.textContent = unpaidOneTime + unpaidMonthlyItems;

    // Projection
    projEl.textContent = '$' + status.projectedBalance.toLocaleString();
    projEl.className = 'fin-view-stat-value ' + (status.projectedBalance < 0 ? 'debt' : status.projectedBalance < (financials.masterLiquidity?.targetCushion || 0) ? 'warning' : 'positive');
}

// ============================================
// BACKWARDS-COMPATIBLE ALIASES
// ============================================

// renderFinancialCockpit() is called from unknown locations — keep as alias
var _originalRenderFinancialCockpit = typeof renderFinancialCockpit === 'function' ? renderFinancialCockpit : null;
var _originalUpdateCockpitStats = typeof updateCockpitStats === 'function' ? updateCockpitStats : null;

// Note: The original renderFinancialCockpit and updateCockpitStats are still defined above
// for the old modal path. These aliases are for any stray callers.

// ============================================
// CANVAS CHARTS — Overview Dashboard
// ============================================

function drawRunwayDonut(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var status = calculateFinancialStatus();

    var dpr = window.devicePixelRatio || 1;
    var size = 150;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    var cx = size / 2, cy = size / 2;
    var outerR = 60, innerR = 42;
    var percent = status.targetCushion > 0 ? Math.max(0, Math.min(200, (status.projectedBalance / status.targetCushion) * 100)) : 0;
    var angle = (Math.min(percent, 100) / 100) * Math.PI * 2;

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, Math.PI * 2, 0, true);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fill();

    // Progress ring
    var color = percent >= 100 ? '#5E8A5E' : percent >= 50 ? '#C4923A' : '#B85C5C';
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.arc(cx, cy, innerR, -Math.PI / 2 + angle, -Math.PI / 2, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Center text
    ctx.fillStyle = color;
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(percent) + '%', cx, cy - 6);
    ctx.fillStyle = '#8B8178';
    ctx.font = '500 9px system-ui, sans-serif';
    ctx.fillText('OF TARGET', cx, cy + 10);
}

function drawMonthlyBars(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var status = calculateFinancialStatus();
    var months = status.monthlyDetails;
    if (!months || months.length === 0) return;

    var dpr = window.devicePixelRatio || 1;
    var w = canvas.parentElement ? canvas.parentElement.offsetWidth - 24 : 300;
    if (w < 100) w = 300;
    var h = 120;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    var maxTotal = 1;
    for (var mi = 0; mi < months.length; mi++) {
        if (months[mi].monthTotal > maxTotal) maxTotal = months[mi].monthTotal;
    }

    var barWidth = Math.min(40, (w - 20) / months.length - 8);
    var startX = (w - (months.length * (barWidth + 8))) / 2;
    var chartTop = 10, chartBottom = h - 20;
    var chartHeight = chartBottom - chartTop;

    for (var i = 0; i < months.length; i++) {
        var m = months[i];
        var x = startX + i * (barWidth + 8);
        var totalH = (m.monthTotal / maxTotal) * chartHeight;
        var paidAmount = m.monthTotal - m.unpaidAmount;
        var paidH = (paidAmount / maxTotal) * chartHeight;
        var unpaidH = totalH - paidH;

        // Unpaid portion (top, warm red)
        if (unpaidH > 0.5) {
            ctx.fillStyle = '#B85C5C';
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(x, chartBottom - totalH, barWidth, unpaidH, [3, 3, 0, 0]);
                ctx.fill();
            } else {
                ctx.fillRect(x, chartBottom - totalH, barWidth, unpaidH);
            }
        }

        // Paid portion (bottom, warm green)
        if (paidH > 0.5) {
            ctx.fillStyle = '#5E8A5E';
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(x, chartBottom - paidH, barWidth, paidH, unpaidH > 0.5 ? [0, 0, 3, 3] : [3, 3, 3, 3]);
                ctx.fill();
            } else {
                ctx.fillRect(x, chartBottom - paidH, barWidth, paidH);
            }
        }

        // Month label
        var label = m.label.replace(/\s*\d{4}/, '').substring(0, 3);
        ctx.fillStyle = '#8B8178';
        ctx.font = '500 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + barWidth / 2, h - 4);
    }
}
