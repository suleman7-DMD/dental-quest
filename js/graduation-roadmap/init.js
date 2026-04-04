// ==================== D3 ROADMAP: INIT ====================
// Dashboard rendering, UI initialization, and app bootstrap.
// Loaded LAST — all other modules available at parse time.
// Only this file may auto-execute initialization code.

// ==================== RENDER FUNCTIONS ====================
function dashboardCleanText(text) {
    return String(text || '')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function dashboardTrimText(text, maxLen) {
    var cleaned = dashboardCleanText(text);
    if (!cleaned) return '';
    if (!maxLen || cleaned.length <= maxLen) return cleaned;
    return cleaned.slice(0, maxLen - 1).trim().replace(/[,:;.\-]+$/, '') + '...';
}

function dashboardFirstSnippet(text, maxLen) {
    var cleaned = dashboardCleanText(text);
    if (!cleaned) return '';
    var firstLine = cleaned.split('\n')[0].trim();
    if (!firstLine) firstLine = cleaned;
    var pipeIdx = firstLine.indexOf('|');
    if (pipeIdx !== -1) firstLine = firstLine.substring(0, pipeIdx).trim();
    var match = firstLine.match(/^[^.!?]+[.!?]?/);
    return dashboardTrimText(match ? match[0].trim() : firstLine, maxLen || 160);
}

function dashboardNormalizeText(text) {
    return dashboardCleanText(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dashboardEnsurePeriod(text) {
    var cleaned = dashboardCleanText(text);
    if (!cleaned) return '';
    return /[.!?]$/.test(cleaned) ? cleaned : cleaned + '.';
}

function dashboardUnique(items) {
    var seen = {};
    var result = [];
    (items || []).forEach(function(item) {
        if (!item) return;
        var key = String(item).trim();
        if (!key || seen[key]) return;
        seen[key] = true;
        result.push(key);
    });
    return result;
}

function dashboardFormatShortDate(dateStr) {
    var date = parseLocalDate(dateStr);
    if (!date) return dateStr || 'Date TBD';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dashboardFormatShortDateTime(dateStr, timeStr) {
    var label = dashboardFormatShortDate(dateStr);
    if (!timeStr) return label;
    if (typeof formatAptTime === 'function') {
        return label + ' ' + formatAptTime(timeStr);
    }
    return label + ' ' + timeStr;
}

function dashboardFormatTimeRange(startTime, endTime) {
    if (!startTime) return 'Time TBD';
    var startLabel = typeof formatAptTime === 'function' ? formatAptTime(startTime) : startTime;
    if (!endTime) return startLabel;
    var endLabel = typeof formatAptTime === 'function' ? formatAptTime(endTime) : endTime;
    return startLabel + ' - ' + endLabel;
}

function dashboardFormatStatus(status) {
    var raw = dashboardCleanText(status || 'scheduled').replace(/_/g, ' ');
    if (!raw) return 'Scheduled';
    return raw.replace(/\b\w/g, function(ch) { return ch.toUpperCase(); });
}

function dashboardExtractChair(details) {
    var explicit = dashboardCleanText(details && details.chair);
    if (explicit) return explicit;
    var notes = dashboardCleanText(details && details.notes);
    if (!notes) return '';
    var match = notes.match(/chair:\s*([^\n]+)/i);
    return match ? dashboardTrimText(match[1], 40) : '';
}

function dashboardGetPatientNameVariants(patient) {
    var raw = dashboardCleanText(patient && patient.name);
    var variants = [];
    if (!raw) return variants;
    variants.push(raw);
    variants.push(raw.replace(',', ' '));
    if (raw.indexOf(',') !== -1) {
        var parts = raw.split(',');
        var last = dashboardCleanText(parts[0]);
        var first = dashboardCleanText(parts.slice(1).join(' '));
        if (first && last) variants.push(first + ' ' + last);
    }
    return dashboardUnique(variants);
}

function dashboardFindPatientByChart(chartNumber, patients) {
    if (!chartNumber || typeof normalizeChartNumber !== 'function') return null;
    var normalized = normalizeChartNumber(chartNumber);
    var ids = Object.keys(patients || {});
    for (var i = 0; i < ids.length; i++) {
        var patientId = ids[i];
        var patient = patients[patientId];
        if (!patient || !patient.chartNumber) continue;
        if (normalizeChartNumber(patient.chartNumber) === normalized) {
            return { patientId: patientId, patient: patient };
        }
    }
    return null;
}

function dashboardResolvePatientFromText(text, patients) {
    var combined = dashboardCleanText(text);
    if (!combined) return null;

    var chartMatches = combined.match(/\b0*\d{5,}\b/g) || [];
    for (var i = 0; i < chartMatches.length; i++) {
        var chartMatch = dashboardFindPatientByChart(chartMatches[i], patients);
        if (chartMatch) return chartMatch;
    }

    var normalizedCombined = dashboardNormalizeText(combined);
    var best = null;
    Object.keys(patients || {}).forEach(function(patientId) {
        var patient = patients[patientId];
        dashboardGetPatientNameVariants(patient).forEach(function(variant) {
            var normalizedVariant = dashboardNormalizeText(variant);
            if (!normalizedVariant || normalizedVariant.length < 6) return;
            if (normalizedCombined.indexOf(normalizedVariant) === -1) return;
            if (!best || normalizedVariant.length > best.matchLength) {
                best = { patientId: patientId, patient: patient, matchLength: normalizedVariant.length };
            }
        });
    });

    return best ? { patientId: best.patientId, patient: best.patient } : null;
}

function dashboardGuessPlannerTitle(item) {
    var cleaned = dashboardCleanText(item);
    if (!cleaned) return 'Schedule-only clinic task';
    var separators = [' — ', ' - '];
    for (var i = 0; i < separators.length; i++) {
        var idx = cleaned.indexOf(separators[i]);
        if (idx > 0) return cleaned.substring(0, idx).trim();
    }
    return dashboardTrimText(cleaned, 90);
}

function dashboardGetCompletedTaskMap() {
    var map = {};
    getValues(roadmapData.monthlyPlanner?.completedTasks).forEach(function(entry) {
        var value = entry && entry.value ? entry.value : entry;
        if (value != null) map[String(value)] = true;
    });
    return map;
}

function dashboardGetFuturePlannerTasks(todayStr) {
    var tasks = [];
    var completed = dashboardGetCompletedTaskMap();
    var convertedStaticIds = {};

    getValues(roadmapData.monthlyPlanner?.overriddenStatic).forEach(function(entry) {
        var value = entry && entry.value ? entry.value : entry;
        if (value) convertedStaticIds[value] = true;
    });

    var customTasks = getValues(roadmapData.monthlyPlanner?.customTasks);
    customTasks.forEach(function(task) {
        if (task && task.convertedFrom) convertedStaticIds[task.convertedFrom] = true;
    });

    if (typeof MP_STATIC_TASKS !== 'undefined' && Array.isArray(MP_STATIC_TASKS)) {
        MP_STATIC_TASKS.forEach(function(task) {
            if (!task || !task.date || task.date < todayStr) return;
            var staticId = 'static-' + task.date + '-' + (task.item || '').substring(0, 15).replace(/[^a-zA-Z0-9]/g, '');
            if (convertedStaticIds[staticId] || completed[staticId]) return;
            tasks.push({ ...task, id: staticId, isStatic: true });
        });
    }

    customTasks.forEach(function(task) {
        if (!task || !task.date || task.date < todayStr) return;
        if (completed[String(task.id)]) return;
        tasks.push({ ...task, isStatic: false });
    });

    tasks.sort(function(a, b) {
        if ((a.date || '') !== (b.date || '')) return (a.date || '').localeCompare(b.date || '');
        var timeA = a.time || '23:59';
        var timeB = b.time || '23:59';
        return timeA.localeCompare(timeB);
    });

    return tasks;
}

function dashboardIsAppointmentLikeTask(task) {
    if (!task || !task.date) return false;
    var combined = dashboardNormalizeText([(task.item || ''), (task.notes || '')].join(' '));
    if (!combined) return false;

    var isClinicType = (task.type || '').toLowerCase() === 'clinic';
    var appointmentLike = /(tx plan|treatment plan|written analysis| wa\b|loe\b|recall|prophy|crown|composite|consult|reeval|re eval|srp|denture|rpd|implant|extraction|try in|insertion|adjustment|records|impression|limited oral eval|periodic oral exam|delivery|follow up|followup|restorative)/.test(combined);
    var prepOnly = /(pull up|review chart|progress notes|pre meeting|prep only|study block|call patient|confirm chart)/.test(combined);
    var clearlyNonClinical = /(lecture|quiz|exam|assignment|module|rotation|rounds)/.test(combined);

    if (isClinicType) {
        if (!task.time && prepOnly && !appointmentLike) return false;
        return true;
    }

    return appointmentLike && !clearlyNonClinical;
}

function dashboardCreateClinicalEvent(apt, patients) {
    var patient = patients[apt.patientId] || null;
    var patientId = patient ? (patient.id || apt.patientId || null) : (apt.patientId || null);
    var description = dashboardTrimText(apt.procedures || 'Appointment', 150);
    var endTime = '';
    if (apt.time && apt.duration && typeof calculateEndTime === 'function') {
        endTime = calculateEndTime(apt.time, apt.duration);
    }

    return {
        id: 'clinical|' + String(apt.id || ''),
        dedupKey: [apt.date || '', apt.time || '', patientId || '', dashboardNormalizeText(description)].join('|'),
        source: 'clinical',
        date: apt.date || '',
        time: apt.time || '',
        endTime: endTime,
        patientId: patientId,
        patient: patient,
        title: patient && patient.name ? patient.name : 'Unknown Patient',
        chartNumber: patient && patient.chartNumber ? patient.chartNumber : '',
        phone: patient && patient.phone ? patient.phone : '',
        description: description,
        notes: apt.notes || '',
        chair: dashboardExtractChair(apt),
        status: apt.status || 'scheduled',
        scheduleOnly: false
    };
}

function dashboardCreatePlannerEvent(task, patients) {
    var resolved = null;
    if (task.patientId && patients[task.patientId]) {
        resolved = { patientId: task.patientId, patient: patients[task.patientId] };
    }
    if (!resolved) {
        resolved = dashboardResolvePatientFromText([(task.item || ''), (task.notes || '')].join('\n'), patients);
    }

    var patient = resolved ? resolved.patient : null;
    var patientId = resolved ? resolved.patientId : null;
    var displayTitle = patient && patient.name ? patient.name : dashboardGuessPlannerTitle(task.item);
    var description = dashboardCleanText(task.item || task.notes || 'Clinic task');
    if (displayTitle && description.indexOf(displayTitle) === 0) {
        description = description.substring(displayTitle.length).replace(/^[\s—-]+/, '').trim() || description;
    }

    return {
        id: 'planner|' + String(task.id || ''),
        dedupKey: [task.date || '', task.time || '', patientId || dashboardNormalizeText(displayTitle), dashboardNormalizeText(description || displayTitle)].join('|'),
        source: 'planner',
        date: task.date || '',
        time: task.time || '',
        endTime: task.endTime || '',
        patientId: patientId,
        patient: patient,
        title: displayTitle,
        chartNumber: patient && patient.chartNumber ? patient.chartNumber : '',
        phone: patient && patient.phone ? patient.phone : '',
        description: dashboardTrimText(description || displayTitle, 170),
        notes: task.notes || '',
        chair: dashboardExtractChair(task),
        status: 'scheduled',
        scheduleOnly: true
    };
}

function dashboardGetUpcomingAppointmentFeed(todayStr, maxDaysAhead) {
    var patients = (typeof getAllPatientRecords === 'function')
        ? getAllPatientRecords()
        : (roadmapData.clinicalData?.patientRecords || {});
    var feed = [];
    var seen = {};
    var limitDays = maxDaysAhead ?? 30;
    var cutoffDate = parseLocalDate(todayStr);
    if (cutoffDate) cutoffDate.setDate(cutoffDate.getDate() + limitDays);
    var cutoffStr = cutoffDate ? getLocalDateString(cutoffDate) : todayStr;

    getValues(roadmapData.clinicalData?.appointments).forEach(function(apt) {
        if (!apt || !apt.date || apt.date < todayStr || apt.date > cutoffStr) return;
        if (apt.status === 'cancelled' || apt.status === 'completed') return;
        var event = dashboardCreateClinicalEvent(apt, patients);
        if (seen[event.dedupKey]) return;
        seen[event.dedupKey] = true;
        feed.push(event);
    });

    dashboardGetFuturePlannerTasks(todayStr).forEach(function(task) {
        if (!task || task.syncedFromClinical || task.clinicalAppointmentId) return;
        if (task.date > cutoffStr) return;
        if (!dashboardIsAppointmentLikeTask(task)) return;
        var event = dashboardCreatePlannerEvent(task, patients);
        if (!event || !event.date) return;
        if (seen[event.dedupKey]) return;
        seen[event.dedupKey] = true;
        feed.push(event);
    });

    feed.sort(function(a, b) {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        var timeA = a.time || '23:59';
        var timeB = b.time || '23:59';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        if (a.source !== b.source) return a.source === 'clinical' ? -1 : 1;
        return (a.title || '').localeCompare(b.title || '');
    });

    return feed;
}

function dashboardGetWeekBounds(dateStr) {
    var date = parseLocalDate(dateStr);
    if (!date) return null;
    var start = new Date(date);
    var day = start.getDay();
    var diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMonday);
    var end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
        startStr: getLocalDateString(start),
        endStr: getLocalDateString(end)
    };
}

function dashboardGetWorkloadItems(todayStr) {
    var items = [];
    var hiddenClinic = roadmapData.monthlyPlanner?.hiddenClinicTasks || {};
    var customTasks = roadmapData.monthlyPlanner?.customTasks || {};

    dashboardGetFuturePlannerTasks(todayStr).forEach(function(task) {
        items.push({
            id: 'planner|' + String(task.id || ''),
            date: task.date,
            time: task.time || '',
            isClinic: (task.type || '').toLowerCase() === 'clinic' || dashboardIsAppointmentLikeTask(task)
        });
    });

    getValues(roadmapData.clinicalData?.appointments).forEach(function(apt) {
        if (!apt || !apt.id || !apt.date || apt.date < todayStr) return;
        if (apt.status === 'cancelled' || apt.status === 'completed') return;
        if (hiddenClinic[apt.id] || customTasks['clinic_' + apt.id]) return;
        items.push({
            id: 'clinical|' + String(apt.id),
            date: apt.date,
            time: apt.time || '',
            isClinic: true
        });
    });

    return items;
}

function dashboardGetScheduleLoad(dateStr, workloadItems) {
    var bounds = dashboardGetWeekBounds(dateStr);
    if (!bounds) return null;

    var target = parseLocalDate(dateStr);
    var windowStart = new Date(target);
    var windowEnd = new Date(target);
    windowStart.setDate(windowStart.getDate() - 1);
    windowEnd.setDate(windowEnd.getDate() + 1);
    var windowStartStr = getLocalDateString(windowStart);
    var windowEndStr = getLocalDateString(windowEnd);

    var sameDayItems = 0;
    var sameDayClinic = 0;
    var windowItems = 0;
    var weekItems = 0;
    var weekClinic = 0;

    (workloadItems || []).forEach(function(item) {
        if (!item || !item.date) return;
        if (item.date === dateStr) {
            sameDayItems++;
            if (item.isClinic) sameDayClinic++;
        }
        if (item.date >= windowStartStr && item.date <= windowEndStr) windowItems++;
        if (item.date >= bounds.startStr && item.date <= bounds.endStr) {
            weekItems++;
            if (item.isClinic) weekClinic++;
        }
    });

    sameDayItems = Math.max(1, sameDayItems);
    windowItems = Math.max(sameDayItems, windowItems);
    weekItems = Math.max(sameDayItems, weekItems);

    var weekDeadlines = deadlines.filter(function(deadline) {
        if (!deadline || deadline.done || !deadline.date || deadline.tbd) return false;
        return deadline.date >= bounds.startStr && deadline.date <= bounds.endStr;
    }).length;

    var label = 'light';
    if (sameDayItems >= 5 || weekItems >= 14 || weekDeadlines >= 4) label = 'packed';
    else if (sameDayItems >= 3 || weekItems >= 9 || weekDeadlines >= 2) label = 'busy';
    else if (sameDayItems >= 2 || weekItems >= 6) label = 'moderate';

    return {
        sameDayItems: sameDayItems,
        sameDayClinic: sameDayClinic,
        windowItems: windowItems,
        weekItems: weekItems,
        weekClinic: weekClinic,
        weekDeadlines: weekDeadlines,
        label: label
    };
}

function dashboardBuildLoadSentence(load) {
    if (!load) return '';
    var sentence = 'Schedule load is ' + load.label + ': '
        + load.sameDayItems + ' item' + (load.sameDayItems === 1 ? '' : 's') + ' that day, '
        + load.windowItems + ' in the 3-day window, and '
        + load.weekItems + ' this week';
    if (load.weekClinic > 0) {
        sentence += ' (' + load.weekClinic + ' clinic-related)';
    }
    if (load.weekDeadlines > 0) {
        sentence += ', with ' + load.weekDeadlines + ' deadline' + (load.weekDeadlines === 1 ? '' : 's') + ' due';
    }
    return dashboardEnsurePeriod(sentence);
}

function dashboardFindNextPatientEvent(currentEvent, feed) {
    if (!currentEvent || !currentEvent.patientId) return null;
    for (var i = 0; i < (feed || []).length; i++) {
        var event = feed[i];
        if (!event || event.id === currentEvent.id) continue;
        if (event.patientId !== currentEvent.patientId) continue;
        if (event.date < currentEvent.date) continue;
        if (event.date === currentEvent.date && (event.time || '') <= (currentEvent.time || '')) continue;
        return event;
    }
    return null;
}

function dashboardSnippetsOverlap(a, b) {
    var first = dashboardNormalizeText(a);
    var second = dashboardNormalizeText(b);
    if (!first || !second) return false;
    return first.indexOf(second) !== -1 || second.indexOf(first) !== -1;
}

function dashboardGetCurrentPlanSnippet(event) {
    if (!event || !event.patient) return '';
    var patient = event.patient;
    var brief = patient.clinicalBrief || {};
    var candidates = [
        brief.txStatus,
        brief.txSequencing,
        brief.snapshot,
        patient.txPlan,
        patient.txSummaryBU
    ];

    for (var i = 0; i < candidates.length; i++) {
        var snippet = dashboardFirstSnippet(candidates[i], 160);
        if (!snippet) continue;
        if (!dashboardSnippetsOverlap(snippet, event.description)) return snippet;
    }

    return '';
}

function dashboardGetPreviousStepSnippet(event) {
    if (!event || !event.patient) return '';
    var patient = event.patient;
    if (typeof getLastCompletedVisit === 'function') {
        var lastCompleted = getLastCompletedVisit(patient, event.patientId);
        if (lastCompleted && (lastCompleted.date || lastCompleted.procedures)) {
            var label = '';
            if (lastCompleted.date) label += lastCompleted.date;
            if (lastCompleted.procedures) {
                label += (label ? ': ' : '') + dashboardTrimText(lastCompleted.procedures, 110);
            }
            if (label) return label;
        }
    }

    var txDone = dashboardFirstSnippet(patient.txCompletedByMe, 120);
    if (txDone) return txDone;
    return dashboardFirstSnippet(patient.lastVisit, 120);
}

function dashboardGetNextStepSnippet(event, feed) {
    if (!event || !event.patient) return '';
    var nextEvent = dashboardFindNextPatientEvent(event, feed);
    if (nextEvent) {
        return dashboardFormatShortDateTime(nextEvent.date, nextEvent.time) + ' — ' + dashboardTrimText(nextEvent.description || nextEvent.title, 110);
    }

    var patient = event.patient;
    var brief = patient.clinicalBrief || {};
    var candidate = dashboardFirstSnippet(brief.nextVisitPlan || patient.nextVisit, 130);
    if (candidate && !dashboardSnippetsOverlap(candidate, event.description)) return candidate;

    return '';
}

function dashboardGetConcernSnippet(event) {
    if (!event || !event.patient) return '';
    var patient = event.patient;
    var brief = patient.clinicalBrief || {};

    var directFlag = dashboardFirstSnippet(brief.flaggedConcerns || patient.priorityNotes, 145);
    if (directFlag) return directFlag;

    var medical = dashboardCleanText(patient.medicalHx);
    var precautionMatch = medical.match(/precautions?:\s*([^.!?]+)/i);
    if (precautionMatch && precautionMatch[1]) {
        return dashboardTrimText(precautionMatch[1], 145);
    }

    return dashboardFirstSnippet(patient.notes, 145);
}

function dashboardGetReliabilityNote(patient) {
    if (!patient) return '';
    if (patient.reliability === 'red') return 'Reliability is red, so confirm aggressively and lock the next step before the patient leaves';
    if (patient.reliability === 'yellow') return 'Reliability is yellow, so keep confirmation and next-step closure tight';
    return '';
}

function dashboardBuildAppointmentBriefing(event, feed, workloadItems) {
    var loadSentence = dashboardBuildLoadSentence(dashboardGetScheduleLoad(event.date, workloadItems));

    if (!event.patient) {
        var scheduleOnlyIntro = 'This is a schedule-only clinic block for ' + (event.description || event.title || 'the booked item');
        var scheduleOnlyNote = dashboardFirstSnippet(event.notes, 120);
        if (scheduleOnlyNote && !dashboardSnippetsOverlap(scheduleOnlyNote, scheduleOnlyIntro)) {
            scheduleOnlyIntro += '. Notes: ' + scheduleOnlyNote;
        }
        return dashboardTrimText(
            dashboardEnsurePeriod(scheduleOnlyIntro) + (loadSentence ? ' ' + loadSentence : ''),
            520
        );
    }

    var sentences = [];
    var intro = 'Booked for ' + (event.description || 'the scheduled visit');
    var currentPlan = dashboardGetCurrentPlanSnippet(event);
    if (currentPlan) intro += '. Current plan: ' + currentPlan;
    sentences.push(dashboardEnsurePeriod(intro));

    var sequenceBits = [];
    var previous = dashboardGetPreviousStepSnippet(event);
    var next = dashboardGetNextStepSnippet(event, feed);
    if (previous) sequenceBits.push('Before this: ' + previous);
    if (next) sequenceBits.push('After this: ' + next);
    if (sequenceBits.length > 0) {
        sentences.push(dashboardEnsurePeriod(sequenceBits.join('. ')));
    }

    var cautionBits = [];
    var concern = dashboardGetConcernSnippet(event);
    if (concern) cautionBits.push(concern);
    var reliability = dashboardGetReliabilityNote(event.patient);
    if (reliability) cautionBits.push(reliability);

    if (cautionBits.length > 0) {
        var cautionSentence = dashboardEnsurePeriod('Keep in mind: ' + cautionBits.join('. '));
        if (loadSentence) cautionSentence += ' ' + loadSentence;
        sentences.push(cautionSentence);
    } else if (loadSentence) {
        sentences.push(loadSentence);
    }

    return dashboardTrimText(sentences.slice(0, 3).join(' '), 700);
}

function dashboardRenderPhoneChips(phoneRaw) {
    var phones = dashboardUnique(String(phoneRaw || '').split('|').map(function(part) {
        return dashboardCleanText(part);
    }));
    return phones.map(function(phone) {
        return '<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); color:#c7d2fe; border-radius:999px; padding:3px 8px; font-size:0.78em;">☎ ' + escapeHtml(phone) + '</span>';
    }).join('');
}

function dashboardUseSplitTopRail() {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1180;
}

function dashboardTopRailMaxHeight() {
    return dashboardUseSplitTopRail() ? '72vh' : '';
}

function renderUpcomingAppointmentsSection(today, options) {
    options = options || {};
    var todayStr = getLocalDateString(today);
    var daysAhead = options.daysAhead ?? 30;
    var feed = dashboardGetUpcomingAppointmentFeed(todayStr, daysAhead);
    var workloadItems = dashboardGetWorkloadItems(todayStr);
    var useScrollPane = !!options.useScrollPane;
    var maxHeight = options.maxHeight || '72vh';
    var html = '';

    html += '<div class="mission-card" style="background:linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.92)); border:1px solid rgba(59,130,246,0.28); border-radius:16px; padding:18px; margin-bottom:' + (useScrollPane ? '0' : '16px') + ';' + (useScrollPane ? ' display:flex; flex-direction:column; min-height:420px; max-height:' + maxHeight + ';' : '') + '">';
    html += '<div style="display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:10px; margin-bottom:8px;">';
    html += '<div>';
    html += '<h2 style="color:#bfdbfe; margin:0; font-size:1.35em;">📅 Upcoming Appointments</h2>';
    html += '<div style="color:#94a3b8; font-size:0.88em; margin-top:4px;">Everything booked in the next ' + daysAhead + ' days, plus planner-only tx plan / written analysis clinic blocks.</div>';
    html += '</div>';
    html += '<div style="display:flex; gap:8px; flex-wrap:wrap;">';
    html += '<span style="background:rgba(59,130,246,0.14); border:1px solid rgba(59,130,246,0.3); color:#93c5fd; border-radius:999px; padding:6px 10px; font-size:0.8em; font-weight:700;">' + feed.length + ' upcoming</span>';
    html += '<span style="background:rgba(14,165,233,0.12); border:1px solid rgba(14,165,233,0.22); color:#bae6fd; border-radius:999px; padding:6px 10px; font-size:0.8em;">' + daysAhead + '-day window</span>';
    html += '<span style="background:rgba(148,163,184,0.12); border:1px solid rgba(148,163,184,0.2); color:#cbd5e1; border-radius:999px; padding:6px 10px; font-size:0.8em;">Grouped by day</span>';
    html += '</div>';
    html += '</div>';

    if (feed.length === 0) {
        html += '<div style="background:rgba(15,23,42,0.55); border:1px dashed rgba(148,163,184,0.25); border-radius:12px; padding:18px; color:#94a3b8; text-align:center;' + (useScrollPane ? ' flex:1; display:flex; align-items:center; justify-content:center;' : '') + '">No upcoming appointments or schedule-only clinic blocks found in the next ' + daysAhead + ' days.</div>';
        html += '</div>';
        return html;
    }

    if (useScrollPane) {
        html += '<div style="flex:1; min-height:0; overflow-y:auto; padding-right:4px;">';
    }

    var currentDate = '';
    feed.forEach(function(event, index) {
        if (event.date !== currentDate) {
            currentDate = event.date;
            var dayCount = feed.filter(function(item) { return item.date === currentDate; }).length;
            html += '<div style="' + (index > 0 ? 'border-top:1px solid rgba(148,163,184,0.14); padding-top:14px; margin-top:14px;' : '') + '">';
            html += '<div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; margin-bottom:10px;">';
            html += '<div style="font-size:1.02em; font-weight:700; color:#e2e8f0;">' + escapeHtml(dashboardFormatShortDate(event.date)) + ' · ' + escapeHtml(parseLocalDate(event.date).toLocaleDateString('en-US', { weekday: 'long' })) + '</div>';
            html += '<div style="color:#94a3b8; font-size:0.82em;">' + dayCount + ' appointment' + (dayCount === 1 ? '' : 's') + '</div>';
            html += '</div>';
        }

        var countdown = getCountdown(event.date);
        var statusChip = event.scheduleOnly
            ? '<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(139,92,246,0.14); border:1px solid rgba(139,92,246,0.28); color:#c4b5fd; border-radius:999px; padding:4px 8px; font-size:0.76em; font-weight:600;">Schedule-only clinic task</span>'
            : '<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(59,130,246,0.14); border:1px solid rgba(59,130,246,0.28); color:#93c5fd; border-radius:999px; padding:4px 8px; font-size:0.76em; font-weight:600;">' + escapeHtml(dashboardFormatStatus(event.status)) + '</span>';
        var chartChip = event.chartNumber
            ? '<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(148,163,184,0.12); border:1px solid rgba(148,163,184,0.2); color:#e2e8f0; border-radius:999px; padding:3px 8px; font-size:0.78em;">#' + escapeHtml(event.chartNumber) + '</span>'
            : '<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(71,85,105,0.2); border:1px solid rgba(100,116,139,0.24); color:#94a3b8; border-radius:999px; padding:3px 8px; font-size:0.78em;">No chart linked</span>';
        var chairChip = event.chair
            ? '<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.24); color:#fde68a; border-radius:999px; padding:3px 8px; font-size:0.78em;">Chair ' + escapeHtml(event.chair) + '</span>'
            : '';
        var reliabilityChip = event.patient
            ? '<span style="display:inline-flex; align-items:center; gap:4px; background:' + (event.patient.reliability === 'red' ? 'rgba(239,68,68,0.12)' : event.patient.reliability === 'yellow' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)') + '; border:1px solid ' + (event.patient.reliability === 'red' ? 'rgba(239,68,68,0.24)' : event.patient.reliability === 'yellow' ? 'rgba(245,158,11,0.24)' : 'rgba(16,185,129,0.24)') + '; color:' + (event.patient.reliability === 'red' ? '#fca5a5' : event.patient.reliability === 'yellow' ? '#fcd34d' : '#86efac') + '; border-radius:999px; padding:3px 8px; font-size:0.78em;">' + escapeHtml((event.patient.reliability || 'yellow').toUpperCase()) + ' reliability</span>'
            : '';
        var phoneChips = dashboardRenderPhoneChips(event.phone);
        var briefing = dashboardBuildAppointmentBriefing(event, feed, workloadItems);
        var safePatientId = (event.patientId || '').replace(/['"\\]/g, '');

        html += '<div style="background:rgba(15,23,42,0.62); border:1px solid rgba(100,116,139,0.22); border-left:4px solid ' + (event.scheduleOnly ? '#8b5cf6' : countdown <= 7 ? '#f59e0b' : '#3b82f6') + '; border-radius:12px; padding:14px; margin-bottom:10px;">';
        html += '<div style="display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:12px;">';
        html += '<div style="flex:1; min-width:260px;">';
        html += '<div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:8px;">';
        html += getCountdownBadge(countdown);
        html += '<span style="color:#e2e8f0; font-weight:600; font-size:0.88em;">' + escapeHtml(dashboardFormatTimeRange(event.time, event.endTime)) + '</span>';
        html += statusChip;
        html += '</div>';
        html += '<div style="font-size:1.02em; font-weight:700; color:#f8fafc;">' + escapeHtml(event.title || 'Upcoming appointment') + '</div>';
        html += '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; margin-bottom:10px;">';
        html += chartChip + chairChip + reliabilityChip + phoneChips;
        html += '</div>';
        html += '<div style="color:#fbbf24; font-size:0.92em; font-weight:600; margin-bottom:8px;">' + escapeHtml(event.description || 'Appointment') + '</div>';
        html += '<div style="color:#cbd5e1; font-size:0.9em; line-height:1.55;">' + escapeHtml(briefing) + '</div>';
        html += '</div>';

        html += '<div style="display:flex; flex-direction:column; gap:8px; min-width:130px; align-items:stretch;">';
        if (event.patientId) {
            html += '<button onclick="navigateToEntity(\'patient\', \'' + safePatientId + '\')" style="background:rgba(59,130,246,0.14); border:1px solid rgba(59,130,246,0.32); color:#bfdbfe; border-radius:8px; padding:8px 10px; font-size:0.82em; cursor:pointer; font-weight:600;">Open Patient</button>';
        }
        html += '<button onclick="navigateToEntity(\'appointment\')" style="background:rgba(148,163,184,0.12); border:1px solid rgba(148,163,184,0.22); color:#cbd5e1; border-radius:8px; padding:8px 10px; font-size:0.82em; cursor:pointer; font-weight:600;">Appointments Tab</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        var nextItem = feed[index + 1];
        if (!nextItem || nextItem.date !== currentDate) {
            html += '</div>';
        }
    });

    if (useScrollPane) {
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function renderDashboard() {
    const container = document.getElementById('tab-missioncontrol');
    if (!container) return;

    // Get current date for all calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // === Row 1: Clinic Requirements Card ===
    // SMART COUNTING: Aggregate from ALL data sources (appointments, planner, patients, competencies)
    // NOTE: No state mutation in render — use local variables only. roadmapData.clinicHeadlines
    // is read for persisted targets but never written to from this function.
    var headlines = roadmapData.clinicHeadlines || {};
    var smartApts = getSmartAppointmentCount();
    var smartProcs = getSmartProcedureCount();
    const clinicHeadlines = {
        appointments: {
            completed: smartApts.total,
            target: headlines.appointments?.target ?? 90
        },
        procedures: {
            completed: smartProcs.total,
            target: headlines.procedures?.target ?? 116
        }
    };

    const aptPct = clinicHeadlines.appointments.target > 0
        ? Math.min(100, Math.round((clinicHeadlines.appointments.completed / clinicHeadlines.appointments.target) * 100))
        : 0;
    const procPct = clinicHeadlines.procedures.target > 0
        ? Math.min(100, Math.round((clinicHeadlines.procedures.completed / clinicHeadlines.procedures.target) * 100))
        : 0;

    // Graduation readiness
    var readiness = calculateGraduationReadiness();
    var gaps = getCompetencyGaps();

    // Pace projections
    var aptPace = calculatePaceProjection(smartApts.total, clinicHeadlines.appointments.target);
    var procPace = calculatePaceProjection(smartProcs.total, clinicHeadlines.procedures.target);

    // Build competency category progress grid
    const competencies = getCompetenciesData();
    const overallStats = calculateOverallStats(competencies);
    let categoryProgressHTML = '';
    Object.entries(competencies).forEach(function(entry) {
        const key = entry[0];
        const cat = entry[1];
        const stats = calculateCategoryStats(cat);
        const pct = stats.totalUnits > 0 ? Math.round((stats.completedUnits / stats.totalUnits) * 100) : 0;
        categoryProgressHTML += '<div class="comp-mini-card" onclick="switchTab(\'competencies\')" style="cursor:pointer; background:rgba(30,41,59,0.6); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:4px;">'
            + '<div style="display:flex; align-items:center; gap:6px; justify-content:space-between;">'
            + '<span style="font-size:1.1em;">' + (cat.icon ?? '📌') + '</span>'
            + '<span style="flex:1; font-size:0.8em; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(cat.name) + '</span>'
            + '<span style="font-size:0.75em; color:#94a3b8; white-space:nowrap;">' + stats.completedUnits + '/' + stats.totalUnits + '</span>'
            + '</div>'
            + '<div style="background:rgba(100,116,139,0.3); border-radius:4px; height:5px; overflow:hidden;">'
            + '<div style="background:' + (cat.color ?? '#3b82f6') + '; height:100%; width:' + pct + '%; transition:width 0.3s;"></div>'
            + '</div>'
            + '</div>';
    });

    // === Row 2: Deadline helper ===
    function renderDeadlineItems(items, emptyMessage) {
        if (items.length === 0) {
            return '<p style="color: #10b981; padding: 20px;">✅ ' + emptyMessage + '</p>';
        }
        return items.map(function(d) {
            const days = getCountdown(d.date);
            return '<div class="action-item">'
                + getCountdownBadge(days, d.tbd)
                + '<div style="flex: 1;">'
                + '<strong>' + escapeHtml(d.what) + '</strong>'
                + '<span style="color: #b0bcc8; margin-left: 10px;">' + escapeHtml(d.course) + '</span>'
                + '</div>'
                + '<span style="color: #b0bcc8;">' + escapeHtml(d.weight || '') + '</span>'
                + '</div>';
        }).join('');
    }

    // Next 7 days - directly from deadlines array (synced with Deadlines tab)
    const next7 = deadlines.filter(function(d) {
        if (d.done) return false;
        const days = getCountdown(d.date);
        return days >= 0 && days <= 7;
    }).sort(function(a, b) { return parseLocalDate(a.date) - parseLocalDate(b.date); });

    // Next 8-14 days
    const next14 = deadlines.filter(function(d) {
        if (d.done) return false;
        const days = getCountdown(d.date);
        return days > 7 && days <= 14;
    }).sort(function(a, b) { return parseLocalDate(a.date) - parseLocalDate(b.date); });

    // Next 15-30 days (next month)
    const nextMonth = deadlines.filter(function(d) {
        if (d.done) return false;
        const days = getCountdown(d.date);
        return days > 14 && days <= 30;
    }).sort(function(a, b) { return parseLocalDate(a.date) - parseLocalDate(b.date); });

    // Unscheduled/TBD deadlines
    const unscheduled = deadlines.filter(function(d) {
        if (d.done) return false;
        if (!d.date || d.tbd) return true;
        return false;
    }).map(function(d) {
        if (!d.date && !d.tbd) return Object.assign({}, d, { tbd: true });
        return d;
    });

    // === Row 4: Key Dates Countdown ===
    const d3End = new Date(2026, 4, 13);       // May 13, 2026
    const extStart = new Date(2026, 4, 19);    // May 19, 2026
    const graduation = new Date(2027, 4, 12);  // May 12, 2027
    const daysTo = function(target) { return Math.max(0, Math.ceil((target - today) / (1000 * 60 * 60 * 24))); };
    var useTopRailSplit = dashboardUseSplitTopRail();
    var topRailHeight = dashboardTopRailMaxHeight();

    // Build the full dashboard HTML
    let html = '';

    // Top rail: appointments + todo side by side
    html += '<div style="display:grid; grid-template-columns:' + (useTopRailSplit ? 'minmax(0, 1.55fr) minmax(340px, 0.95fr)' : '1fr') + '; gap:16px; align-items:start; margin-bottom:16px;">';
    html += renderUpcomingAppointmentsSection(today, { daysAhead: 30, useScrollPane: useTopRailSplit, maxHeight: topRailHeight });
    html += '<div id="dashTodoListContainer">' + renderTodoListSection({ useScrollPane: useTopRailSplit, maxHeight: topRailHeight }) + '</div>';
    html += '</div>';

    // Current date display
    html += '<div id="currentDateDisplay" style="text-align:center; color:#94a3b8; font-size:0.9em; margin-bottom:16px;">'
        + today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        + '</div>';

    // === ROW 1: Clinic Requirements Hero Card ===
    html += '<div class="mission-card" style="background:linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95)); border:1px solid rgba(59,130,246,0.3); border-radius:14px; padding:20px; margin-bottom:16px;">';
    html += '<h2 style="color:#93c5fd; margin:0 0 16px 0; font-size:1.3em;">🏥 Clinic Requirements</h2>';

    // Headline counters
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">';

    // Appointments counter — smart aggregation from all sources
    html += '<div style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); border-radius:10px; padding:14px;">';
    html += '<div style="font-size:0.85em; color:#93c5fd; margin-bottom:8px; font-weight:600;">Appointments</div>';
    html += '<div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">';
    html += '<span style="font-size:1.4em; font-weight:700; color:#e2e8f0;">' + clinicHeadlines.appointments.completed + '</span>';
    html += '<span style="color:#64748b; font-size:1.1em;">/</span>';
    html += '<input type="number" id="headline-apt-target" value="' + clinicHeadlines.appointments.target + '" min="0" '
        + 'onchange="updateHeadlineTarget(\'appointments\', this.value)" '
        + 'style="width:50px; background:rgba(30,41,59,0.8); border:1px solid rgba(100,116,139,0.4); border-radius:6px; color:#e2e8f0; padding:4px 6px; text-align:center; font-size:1.1em;">';
    html += '</div>';
    html += '<div style="background:rgba(100,116,139,0.3); border-radius:4px; height:6px; overflow:hidden;">';
    html += '<div style="background:#3b82f6; height:100%; width:' + aptPct + '%; transition:width 0.3s;"></div>';
    html += '</div>';
    // Source breakdown
    var aptBreakdown = [];
    if (smartApts.snapshotIsFloor) {
        aptBreakdown.push(smartApts.fromSnapshot + ' per SPS dashboard');
    } else {
        if (smartApts.fromAppointments > 0) aptBreakdown.push(smartApts.fromAppointments + ' completed');
        if (smartApts.fromPlannerSync > 0) aptBreakdown.push(smartApts.fromPlannerSync + ' via planner');
        if (smartApts.fromPatientVisits > 0) aptBreakdown.push(smartApts.fromPatientVisits + ' patient visits');
        if (smartApts.fromSnapshot > 0) aptBreakdown.push('SPS: ' + smartApts.fromSnapshot);
    }
    html += '<div style="font-size:0.65em; color:#64748b; margin-top:4px;">' + (aptBreakdown.length > 0 ? aptBreakdown.join(' + ') : 'No data yet') + '</div>';
    // Pace projection — red if behind schedule (projected past D3 end)
    if (aptPace) {
        var aptPaceColor = aptPace.daysToTarget === 0 ? '#10b981' : aptPace.behindSchedule ? '#f87171' : '#93c5fd';
        var aptPaceText = aptPace.daysToTarget === 0 ? 'Target met!' : aptPace.ratePerWeek + '/wk pace — target by ' + aptPace.projectedDate;
        if (aptPace.behindSchedule && aptPace.daysToTarget > 0) aptPaceText += ' ⚠️';
        html += '<div style="font-size:0.65em; color:' + aptPaceColor + '; margin-top:2px;">' + aptPaceText + '</div>';
    }
    html += '</div>';

    // Procedures counter — smart aggregation from all sources
    html += '<div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); border-radius:10px; padding:14px;">';
    html += '<div style="font-size:0.85em; color:#6ee7b7; margin-bottom:8px; font-weight:600;">Procedures</div>';
    html += '<div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">';
    html += '<span style="font-size:1.4em; font-weight:700; color:#e2e8f0;">' + clinicHeadlines.procedures.completed + '</span>';
    html += '<span style="color:#64748b; font-size:1.1em;">/</span>';
    html += '<input type="number" id="headline-proc-target" value="' + clinicHeadlines.procedures.target + '" min="0" '
        + 'onchange="updateHeadlineTarget(\'procedures\', this.value)" '
        + 'style="width:50px; background:rgba(30,41,59,0.8); border:1px solid rgba(100,116,139,0.4); border-radius:6px; color:#e2e8f0; padding:4px 6px; text-align:center; font-size:1.1em;">';
    html += '</div>';
    html += '<div style="background:rgba(100,116,139,0.3); border-radius:4px; height:6px; overflow:hidden;">';
    html += '<div style="background:#10b981; height:100%; width:' + procPct + '%; transition:width 0.3s;"></div>';
    html += '</div>';
    // Source breakdown
    var procBreakdown = [];
    if (smartProcs.snapshotIsAuthoritative) {
        procBreakdown.push(smartProcs.fromSnapshot + ' per SPS dashboard');
    } else {
        if (smartProcs.fromProcedureRecords > 0) procBreakdown.push(smartProcs.fromProcedureRecords + ' recorded');
        if (smartProcs.fromCompetencyManual > 0) procBreakdown.push(smartProcs.fromCompetencyManual + ' from competencies');
        if (smartProcs.fromSnapshot > 0) procBreakdown.push('SPS: ' + smartProcs.fromSnapshot);
    }
    html += '<div style="font-size:0.65em; color:#64748b; margin-top:4px;">' + (procBreakdown.length > 0 ? procBreakdown.join(' + ') : 'No data yet') + '</div>';
    // Pace projection — red if behind schedule
    if (procPace) {
        var procPaceColor = procPace.daysToTarget === 0 ? '#10b981' : procPace.behindSchedule ? '#f87171' : '#6ee7b7';
        var procPaceText = procPace.daysToTarget === 0 ? 'Target met!' : procPace.ratePerWeek + '/wk pace — target by ' + procPace.projectedDate;
        if (procPace.behindSchedule && procPace.daysToTarget > 0) procPaceText += ' ⚠️';
        html += '<div style="font-size:0.65em; color:' + procPaceColor + '; margin-top:2px;">' + procPaceText + '</div>';
    }
    html += '</div>';

    html += '</div>'; // end headline counters grid

    // === Graduation Readiness Score ===
    html += '<div style="display:flex; align-items:center; justify-content:space-between; background:rgba(124,58,237,0.1); border:1px solid rgba(124,58,237,0.25); border-radius:10px; padding:12px 16px; margin-bottom:12px;">';
    html += '<div style="display:flex; align-items:center; gap:10px;">';
    html += '<div style="font-size:1.6em; font-weight:800; color:' + (readiness.percent >= 50 ? '#a78bfa' : readiness.percent > 0 ? '#f59e0b' : '#ef4444') + ';">' + readiness.percent + '%</div>';
    html += '<div><div style="font-size:0.9em; color:#e2e8f0; font-weight:600;">Graduation Readiness</div>';
    html += '<div style="font-size:0.7em; color:#94a3b8;">Weighted across ' + Object.keys(readiness.details).length + ' competency categories</div></div>';
    html += '</div>';
    if (gaps.total > 0) {
        html += '<div style="font-size:0.75em; color:#f59e0b; text-align:right;">';
        if (gaps.zeroProgress.length > 0) html += gaps.zeroProgress.length + ' items at 0%<br>';
        if (gaps.behindPace.length > 0) html += gaps.behindPace.length + ' behind pace';
        html += '</div>';
    }
    html += '</div>';

    // Competency category grid
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; margin-bottom:12px;">';
    html += categoryProgressHTML;
    html += '</div>';

    // Overall competency total
    html += '<div style="text-align:center; color:#94a3b8; font-size:0.85em; margin-bottom:12px;">'
        + 'Competency items: ' + overallStats.completedItems + '/' + overallStats.totalItems + ' completed'
        + ' (' + overallStats.overallPercent + '%)'
        + '</div>';

    // Quick action buttons
    html += '<div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:12px;">';
    html += '<button onclick="switchTab(\'competencies\')" style="background:rgba(124,58,237,0.2); border:1px solid rgba(124,58,237,0.4); color:#a78bfa; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:0.85em; font-weight:600;">Competencies →</button>';
    html += '<button onclick="switchTab(\'clinical\')" style="background:rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.4); color:#93c5fd; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:0.85em; font-weight:600;">Clinical →</button>';
    html += '<button onclick="backfillClinicalData()" style="background:rgba(245,158,11,0.2); border:1px solid rgba(245,158,11,0.4); color:#fbbf24; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:0.85em; font-weight:600;">Backfill Data</button>';
    html += '</div>';

    // Patient tracker summary
    if (typeof getPatientRecords === 'function') {
        const ptRecords = (typeof getAllPatientRecords === 'function') ? getAllPatientRecords() : (roadmapData.clinicalData?.patientRecords || {});
        const ptCount = Object.keys(ptRecords).length;
        if (ptCount > 0) {
            html += '<div class="card" style="border: 2px solid #7c3aed; margin-top: 15px;">'
                + '<div class="card-header"><span class="card-title">🩺 Patient Tracker</span>'
                + '<span style="color: #a78bfa; font-size: 0.85em;">' + ptCount + ' patients</span></div>'
                + '<p style="color: #94a3b8; font-size: 0.9em; margin: 0 0 10px 0;">Track your patient records, requirements fulfillment, and clinical progress.</p>'
                + '<button onclick="switchTab(\'patients\')" style="background:rgba(124,58,237,0.2); border:1px solid rgba(124,58,237,0.4); color:#a78bfa; padding:8px 20px; border-radius:8px; cursor:pointer; font-size:0.9em; font-weight:600;">Open Patients →</button>'
                + '</div>';
        }
    }

    html += '</div>'; // end clinic requirements card

    // === ALERTS & ACTIONS ROW ===
    var alertItems = [];
    // Upcoming appointments this week
    var thisWeekApts = getValues(roadmapData.clinicalData?.appointments).filter(function(a) {
        if (a.status === 'cancelled' || a.status === 'completed') return false;
        var aptDate = parseLocalDate(a.date);
        var weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return aptDate && aptDate >= today && aptDate <= weekEnd;
    });
    if (thisWeekApts.length > 0) {
        alertItems.push({ type: 'info', icon: '📅', text: thisWeekApts.length + ' appointment' + (thisWeekApts.length > 1 ? 's' : '') + ' this week', action: 'switchTab(\'clinical\')' });
    }
    // Scheduled (uncompleted) past appointments
    var pastScheduled = getValues(roadmapData.clinicalData?.appointments).filter(function(a) {
        return a.status === 'scheduled' && a.date && a.date < getLocalDateString(today);
    });
    if (pastScheduled.length > 0) {
        alertItems.push({ type: 'warning', icon: '⚠️', text: pastScheduled.length + ' past appointment' + (pastScheduled.length > 1 ? 's' : '') + ' need completion — click Backfill', action: 'backfillClinicalData()' });
    }
    // Recalls due
    var recallsDue = getValues(roadmapData.clinicalData?.patientRecords || {}).filter(function(p) {
        if ((p.activeStatus || 'Active') === 'Inactive') return false;
        var recallMatch = (p.recallHistory || '').match(/Next due:\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
        if (!recallMatch) return false;
        var recallDate = parseLocalDate(recallMatch[1]);
        var thirtyOut = new Date(today);
        thirtyOut.setDate(thirtyOut.getDate() + 30);
        return recallDate && recallDate <= thirtyOut;
    });
    if (recallsDue.length > 0) {
        alertItems.push({ type: 'warning', icon: '🔔', text: recallsDue.length + ' patient recall' + (recallsDue.length > 1 ? 's' : '') + ' due within 30 days', action: 'switchTab(\'clinical\')' });
    }
    // Competency gaps — use navigateToEntity for deep linking to the first gap's category
    if (gaps.zeroProgress.length > 0) {
        var firstZeroId = gaps.zeroProgress[0].id;
        alertItems.push({ type: 'blocker', icon: '🚫', text: gaps.zeroProgress.length + ' competency item' + (gaps.zeroProgress.length > 1 ? 's' : '') + ' at 0% — need attention', action: 'navigateToEntity(\'competency\', \'' + escapeHtml(firstZeroId) + '\')' });
    }
    if (gaps.behindPace.length > 0) {
        var firstBehindId = gaps.behindPace[0].id;
        alertItems.push({ type: 'warning', icon: '📉', text: gaps.behindPace.length + ' item' + (gaps.behindPace.length > 1 ? 's' : '') + ' behind pace for graduation', action: 'navigateToEntity(\'competency\', \'' + escapeHtml(firstBehindId) + '\')' });
    }

    if (alertItems.length > 0) {
        html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(239,68,68,0.2); border-radius:14px; padding:14px; margin-bottom:14px;">';
        html += '<h3 style="color:#f87171; margin:0 0 10px 0; font-size:1em;">⚡ Alerts & Actions</h3>';
        alertItems.forEach(function(alert) {
            var borderColor = alert.type === 'blocker' ? 'rgba(239,68,68,0.4)' : alert.type === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(59,130,246,0.4)';
            var bgColor = alert.type === 'blocker' ? 'rgba(239,68,68,0.08)' : alert.type === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)';
            html += '<div onclick="' + alert.action + '" style="cursor:pointer; display:flex; align-items:center; gap:8px; padding:8px 10px; background:' + bgColor + '; border:1px solid ' + borderColor + '; border-radius:8px; margin-bottom:6px; font-size:0.85em; color:#e2e8f0;">';
            html += '<span>' + alert.icon + '</span>';
            html += '<span style="flex:1;">' + alert.text + '</span>';
            html += '<span style="color:#64748b; font-size:0.8em;">→</span>';
            html += '</div>';
        });
        html += '</div>';
    }

    // === ROW 2: ACTION ITEMS — Missing Notes + To-Do List ===
    html += '<div id="dashMissingNotesContainer">' + renderMissingNotesSection() + '</div>';

    // === ROW 3: Do Today Widget ===
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:14px; padding:16px; margin-bottom:16px;">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">';
    html += '<h3 style="color:#fbbf24; margin:0; font-size:1.1em;">⚡ Do Today</h3>';
    html += '<span id="doTodayCount" class="empty" style="background:#f59e0b; color:#000; font-weight:700; padding:2px 8px; border-radius:10px; font-size:0.85em;">0</span>';
    html += '</div>';
    html += '<div id="doTodayTasksList"></div>';
    html += '</div>';

    // === ROW 3: Deadline Windows ===
    // Next 7 days
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(239,68,68,0.3); border-radius:14px; padding:16px; margin-bottom:12px;">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">';
    html += '<h3 style="color:#f87171; margin:0; font-size:1.05em;">🔴 Next 7 Days</h3>';
    html += '<span id="next7Count" style="background:' + (next7.length > 0 ? '#dc2626' : '#059669') + '; color:#fff; font-weight:700; padding:2px 8px; border-radius:10px; font-size:0.85em;">' + next7.length + '</span>';
    html += '</div>';
    html += '<div id="next7Days">' + renderDeadlineItems(next7, 'No deadlines in the next 7 days!') + '</div>';
    html += '</div>';

    // Next 8-14 days
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(217,119,6,0.3); border-radius:14px; padding:16px; margin-bottom:12px;">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">';
    html += '<h3 style="color:#fbbf24; margin:0; font-size:1.05em;">🟡 Next 8–14 Days</h3>';
    html += '<span id="next14Count" style="background:' + (next14.length > 0 ? '#d97706' : '#059669') + '; color:#fff; font-weight:700; padding:2px 8px; border-radius:10px; font-size:0.85em;">' + next14.length + '</span>';
    html += '</div>';
    html += '<div id="next14Days">' + renderDeadlineItems(next14, 'No deadlines in days 8-14!') + '</div>';
    html += '</div>';

    // Next 15-30 days
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(100,116,139,0.3); border-radius:14px; padding:16px; margin-bottom:12px;">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">';
    html += '<h3 style="color:#94a3b8; margin:0; font-size:1.05em;">📅 Next 15–30 Days</h3>';
    html += '<span id="nextMonthCount" style="background:#475569; color:#fff; font-weight:700; padding:2px 8px; border-radius:10px; font-size:0.85em;">' + nextMonth.length + '</span>';
    html += '</div>';
    html += '<div id="nextMonthDays">' + renderDeadlineItems(nextMonth, 'No deadlines in days 15-30!') + '</div>';
    html += '</div>';

    // Unscheduled/TBD deadlines card
    if (unscheduled.length > 0) {
        html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(139,92,246,0.3); border-radius:14px; padding:16px; margin-bottom:12px;">';
        html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">';
        html += '<h3 style="color:#a78bfa; margin:0; font-size:1.05em;">📌 Unscheduled</h3>';
        html += '<span style="background:#7c3aed; color:#fff; font-weight:700; padding:2px 8px; border-radius:10px; font-size:0.85em;">' + unscheduled.length + '</span>';
        html += '</div>';
        html += renderDeadlineItems(unscheduled, 'No unscheduled items!');
        html += '</div>';
    }

    // === ROW 4: Key Dates Countdown ===
    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:14px; padding:16px; margin-bottom:16px;">';
    html += '<h3 style="color:#fbbf24; margin:0 0 12px 0; font-size:1.1em;">🎯 Key Dates</h3>';
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">';

    // D3 End — with appointment context
    var d3Remaining = clinicHeadlines.appointments.target - clinicHeadlines.appointments.completed;
    html += '<div style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.25); border-radius:10px; padding:12px; text-align:center;">';
    html += '<div style="font-size:1.8em; font-weight:800; color:#60a5fa;">' + daysTo(d3End) + '</div>';
    html += '<div style="font-size:0.75em; color:#94a3b8; margin-top:2px;">days to D3 End</div>';
    html += '<div style="font-size:0.7em; color:#64748b;">May 13, 2026</div>';
    if (d3Remaining > 0) {
        html += '<div style="font-size:0.6em; color:#93c5fd; margin-top:4px;">' + d3Remaining + ' apts remaining</div>';
    } else if (d3Remaining < 0) {
        html += '<div style="font-size:0.6em; color:#10b981; margin-top:4px;">Target exceeded by ' + Math.abs(d3Remaining) + '!</div>';
    }
    html += '</div>';

    // Externship Start — with readiness context
    html += '<div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:10px; padding:12px; text-align:center;">';
    html += '<div style="font-size:1.8em; font-weight:800; color:#34d399;">' + daysTo(extStart) + '</div>';
    html += '<div style="font-size:0.75em; color:#94a3b8; margin-top:2px;">days to Externship</div>';
    html += '<div style="font-size:0.7em; color:#64748b;">May 19, 2026</div>';
    html += '<div style="font-size:0.6em; color:#6ee7b7; margin-top:4px;">' + readiness.percent + '% ready</div>';
    html += '</div>';

    // Graduation — with overall progress
    var procRemaining = clinicHeadlines.procedures.target - clinicHeadlines.procedures.completed;
    html += '<div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); border-radius:10px; padding:12px; text-align:center;">';
    html += '<div style="font-size:1.8em; font-weight:800; color:#fbbf24;">' + daysTo(graduation) + '</div>';
    html += '<div style="font-size:0.75em; color:#94a3b8; margin-top:2px;">days to Graduation</div>';
    html += '<div style="font-size:0.7em; color:#64748b;">May 12, 2027</div>';
    if (procRemaining > 0) {
        html += '<div style="font-size:0.6em; color:#fbbf24; margin-top:4px;">' + procRemaining + ' procs remaining</div>';
    } else if (procRemaining < 0) {
        html += '<div style="font-size:0.6em; color:#10b981; margin-top:4px;">Target exceeded by ' + Math.abs(procRemaining) + '!</div>';
    }
    html += '</div>';

    html += '</div>'; // end countdown grid
    html += '</div>'; // end key dates card

    // Write the entire dashboard
    container.innerHTML = html;

    // Render Do Today tasks widget (cross-app sync) — populates #doTodayTasksList inside the container
    renderDoTodayTasks();
}


// ==================== MISSING NOTES SECTION ====================
function renderMissingNotesSection() {
    var pending = getMissingNotesPending();
    var completed = getMissingNotesCompleted();
    var alertLevel = getMissingNotesAlertLevel(pending.length);
    var borderColor = alertLevel === 'RED' ? 'rgba(239,68,68,0.5)' : alertLevel === 'YELLOW' ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.3)';
    var badgeBg = alertLevel === 'RED' ? '#dc2626' : alertLevel === 'YELLOW' ? '#d97706' : '#059669';
    var badgeText = alertLevel === 'RED' ? '#fff' : alertLevel === 'YELLOW' ? '#fff' : '#fff';
    var html = '';

    // Alert banner for critical level
    if (pending.length >= 6) {
        html += '<div class="mn-alert-critical" style="background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(153,27,27,0.15)); border:1px solid rgba(239,68,68,0.5); border-radius:10px; padding:12px 16px; margin-bottom:12px; animation: urgentPulse 2s ease-in-out infinite;">';
        html += '<div style="color:#f87171; font-weight:700; font-size:0.95em;">CRITICAL: ' + pending.length + ' unclosed notes — EXCEEDS 6 LIMIT. Close immediately.</div>';
        html += '</div>';
    } else if (pending.length >= 4) {
        html += '<div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:10px 14px; margin-bottom:12px;">';
        html += '<div style="color:#fbbf24; font-weight:600; font-size:0.9em;">WARNING: ' + pending.length + ' unclosed notes — approaching 6-note limit.</div>';
        html += '</div>';
    }

    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid ' + borderColor + '; border-radius:14px; padding:16px; margin-bottom:14px;">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">';
    html += '<h3 style="color:#e2e8f0; margin:0; font-size:1.05em;">Missing Progress Notes</h3>';
    html += '<span style="background:' + badgeBg + '; color:' + badgeText + '; font-weight:700; padding:2px 10px; border-radius:10px; font-size:0.85em;">' + pending.length + ' pending</span>';
    html += '</div>';
    html += '<div style="color:#94a3b8; font-size:0.75em; margin-bottom:10px;">Hard limit: 6 before write-up</div>';

    // Capacity bar
    var fillPct = Math.min(100, (pending.length / 6) * 100);
    var barColor = alertLevel === 'RED' ? '#dc2626' : alertLevel === 'YELLOW' ? '#d97706' : '#10b981';
    html += '<div style="background:rgba(100,116,139,0.2); border-radius:6px; height:8px; margin-bottom:12px; overflow:hidden;">';
    html += '<div style="background:' + barColor + '; height:100%; width:' + fillPct + '%; border-radius:6px; transition:width 0.3s;"></div>';
    html += '</div>';

    if (pending.length === 0) {
        html += '<div style="color:#6ee7b7; font-size:0.85em; padding:8px 0; text-align:center;">All notes closed. No pending items.</div>';
    } else {
        // Sort by date oldest first (most overdue at top)
        pending.sort(function(a, b) { return (a.date || '').localeCompare(b.date || ''); });
        pending.forEach(function(note) {
            var safeId = note.id.replace(/'/g, "\\'");
            html += '<div style="display:flex; align-items:flex-start; gap:10px; padding:8px 10px; background:rgba(15,23,42,0.5); border:1px solid rgba(100,116,139,0.15); border-radius:8px; margin-bottom:6px; font-size:0.85em;">';
            html += '<input type="checkbox" onclick="toggleMissingNoteStatus(\'' + safeId + '\')" style="margin-top:3px; cursor:pointer; width:18px; height:18px; accent-color:' + barColor + ';">';
            html += '<div style="flex:1; min-width:0;">';
            html += '<div style="color:#e2e8f0; font-weight:600;">' + escapeHtml(note.patientName) + '</div>';
            html += '<div style="color:#94a3b8; font-size:0.85em;">' + escapeHtml(note.date) + ' — Chart: ' + escapeHtml(note.chartNumber) + '</div>';
            html += '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:3px;">';
            html += '<span style="background:rgba(251,191,36,0.15); color:#fbbf24; padding:1px 6px; border-radius:4px; font-size:0.8em;">Dr. ' + escapeHtml(note.faculty) + '</span>';
            if (note.session) html += '<span style="background:rgba(100,116,139,0.15); color:#94a3b8; padding:1px 6px; border-radius:4px; font-size:0.8em;">' + escapeHtml(note.session) + '</span>';
            if (note.location) html += '<span style="background:rgba(100,116,139,0.15); color:#94a3b8; padding:1px 6px; border-radius:4px; font-size:0.8em;">' + escapeHtml(note.location) + '</span>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        });
    }

    // Faculty cross-reference with upcoming appointments
    var facultyMatches = getMissingNotesFacultyMatches();
    if (facultyMatches.length > 0) {
        html += '<div style="margin-top:10px; padding:8px 10px; background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.2); border-radius:8px;">';
        html += '<div style="color:#93c5fd; font-size:0.8em; font-weight:600; margin-bottom:4px;">Faculty Match</div>';
        facultyMatches.forEach(function(m) {
            html += '<div style="color:#94a3b8; font-size:0.8em; padding:2px 0;">' + m.message + '</div>';
        });
        html += '</div>';
    }

    // Completed section
    if (completed.length > 0) {
        html += '<details style="margin-top:10px;">';
        html += '<summary style="color:#64748b; font-size:0.8em; cursor:pointer; user-select:none;">Completed Notes (' + completed.length + ')</summary>';
        html += '<div style="margin-top:6px;">';
        completed.sort(function(a, b) { return (b.completedAt || '').localeCompare(a.completedAt || ''); });
        completed.forEach(function(note) {
            var safeId = note.id.replace(/'/g, "\\'");
            html += '<div style="display:flex; align-items:center; gap:8px; padding:4px 8px; font-size:0.8em; color:#64748b; text-decoration:line-through;">';
            html += '<input type="checkbox" checked onclick="toggleMissingNoteStatus(\'' + safeId + '\')" style="cursor:pointer; width:16px; height:16px; accent-color:#10b981;">';
            html += '<span>' + escapeHtml(note.patientName) + ' — ' + escapeHtml(note.date) + '</span>';
            html += '</div>';
        });
        html += '</div>';
        html += '<button onclick="clearCompletedMissingNotes()" style="margin-top:6px; padding:4px 10px; font-size:0.75em; background:rgba(100,116,139,0.15); color:#94a3b8; border:1px solid rgba(100,116,139,0.2); border-radius:6px; cursor:pointer;">Clear completed</button>';
        html += '</details>';
    }

    // Cross-reference with SPS dashboard
    var snapshots = getValues(roadmapData.clinicalData?.dashboardSnapshots);
    if (snapshots.length > 0 && pending.length > 0) {
        var notesAtRisk = snapshots[0]?.appointments?.notesAtRisk ?? 0;
        if (notesAtRisk > 0 && notesAtRisk !== pending.length) {
            html += '<div style="color:#94a3b8; font-size:0.7em; margin-top:8px; padding:4px 8px; background:rgba(100,116,139,0.08); border-radius:4px;">';
            html += 'Dashboard shows ' + notesAtRisk + ' at-risk notes. Missing notes list shows ' + pending.length + '. Difference may be due to timing.';
            html += '</div>';
        }
    }

    html += '</div>'; // end card
    return html;
}

// ==================== TODO LIST SECTION ====================
function renderTodoListSection(options) {
    options = options || {};
    var pending = getTodoPending();
    var completed = getTodoCompleted();
    var useScrollPane = !!options.useScrollPane;
    var maxHeight = options.maxHeight || '72vh';
    var html = '';

    html += '<div class="mission-card" style="background:rgba(30,41,59,0.8); border:1px solid rgba(139,92,246,0.3); border-radius:14px; padding:16px; margin-bottom:' + (useScrollPane ? '0' : '14px') + ';' + (useScrollPane ? ' display:flex; flex-direction:column; min-height:420px; max-height:' + maxHeight + ';' : '') + '">';
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">';
    html += '<h3 style="color:#e2e8f0; margin:0; font-size:1.05em;">To-Do List</h3>';
    html += '<span style="background:#7c3aed; color:#fff; font-weight:700; padding:2px 10px; border-radius:10px; font-size:0.85em;">' + pending.length + '</span>';
    html += '</div>';

    // Quick add input
    html += '<div style="display:flex; gap:6px; margin-bottom:12px;">';
    html += '<input id="todoQuickAdd" type="text" placeholder="Add a task..." '
        + 'onkeydown="if(event.key===\'Enter\'){dashboardAddTodo();}" '
        + 'style="flex:1; background:rgba(15,23,42,0.6); border:1px solid rgba(100,116,139,0.2); border-radius:8px; padding:8px 12px; color:#e2e8f0; font-size:0.85em; outline:none;">';
    html += '<button onclick="dashboardAddTodo()" style="background:#7c3aed; color:#fff; border:none; border-radius:8px; padding:8px 14px; font-size:0.85em; cursor:pointer; font-weight:600; white-space:nowrap;">+ Add</button>';
    html += '</div>';

    if (useScrollPane) {
        html += '<div style="flex:1; min-height:0; overflow-y:auto; padding-right:4px;">';
    }

    if (pending.length === 0) {
        html += '<div style="color:#a78bfa; font-size:0.85em; padding:8px 0; text-align:center;">No pending tasks. Import from Claude or add above.</div>';
    } else {
        // Sort newest first
        pending.sort(function(a, b) { return (b.addedAt || b.dateAdded || '').localeCompare(a.addedAt || a.dateAdded || ''); });
        pending.forEach(function(item) {
            var safeId = item.id.replace(/'/g, "\\'");
            var badgeColor = getTodoSourceBadgeColor(item.source);
            html += '<div style="display:flex; align-items:flex-start; gap:10px; padding:8px 10px; background:rgba(15,23,42,0.5); border:1px solid rgba(100,116,139,0.15); border-radius:8px; margin-bottom:6px; font-size:0.85em;">';
            html += '<input type="checkbox" onclick="toggleTodoStatus(\'' + safeId + '\')" style="margin-top:3px; cursor:pointer; width:18px; height:18px; accent-color:#7c3aed;">';
            html += '<div style="flex:1; min-width:0;">';
            html += '<div style="color:#e2e8f0; font-weight:500;">' + escapeHtml(item.description) + '</div>';
            html += '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:3px; align-items:center;">';
            html += '<span style="background:' + badgeColor + '; color:#fff; padding:1px 6px; border-radius:4px; font-size:0.75em;">' + escapeHtml(item.source || 'MANUAL') + '</span>';
            if (item.dateAdded) html += '<span style="color:#64748b; font-size:0.8em;">' + escapeHtml(item.dateAdded) + '</span>';
            if (item.sourceDetail) html += '<span style="color:#94a3b8; font-size:0.8em;">— ' + escapeHtml(item.sourceDetail) + '</span>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        });
    }

    // Completed section
    if (completed.length > 0) {
        html += '<details style="margin-top:10px;">';
        html += '<summary style="color:#64748b; font-size:0.8em; cursor:pointer; user-select:none;">Completed (' + completed.length + ')</summary>';
        html += '<div style="margin-top:6px;">';
        completed.sort(function(a, b) { return (b.completedAt || '').localeCompare(a.completedAt || ''); });
        completed.forEach(function(item) {
            var safeId = item.id.replace(/'/g, "\\'");
            html += '<div style="display:flex; align-items:center; gap:8px; padding:4px 8px; font-size:0.8em; color:#64748b; text-decoration:line-through;">';
            html += '<input type="checkbox" checked onclick="toggleTodoStatus(\'' + safeId + '\')" style="cursor:pointer; width:16px; height:16px; accent-color:#7c3aed;">';
            html += '<span>' + escapeHtml(item.description) + '</span>';
            html += '</div>';
        });
        html += '</div>';
        html += '<button onclick="clearCompletedTodos()" style="margin-top:6px; padding:4px 10px; font-size:0.75em; background:rgba(100,116,139,0.15); color:#94a3b8; border:1px solid rgba(100,116,139,0.2); border-radius:6px; cursor:pointer;">Clear completed</button>';
        html += '</details>';
    }

    if (useScrollPane) {
        html += '</div>';
    }

    html += '</div>'; // end card
    return html;
}

// Targeted re-render for Missing Notes section (preserves details open state)
function rerenderMissingNotesSection() {
    var container = document.getElementById('dashMissingNotesContainer');
    if (!container) return;
    var details = container.querySelector('details');
    var wasOpen = details ? details.open : false;
    // NOTE: innerHTML is safe here — renderMissingNotesSection() builds HTML from
    // escapeHtml()-sanitized user data only. No raw user input enters the template.
    container.innerHTML = renderMissingNotesSection();
    if (wasOpen) {
        var newDetails = container.querySelector('details');
        if (newDetails) newDetails.open = true;
    }
}

// Targeted re-render for Todo List section (preserves details open state)
function rerenderTodoListSection() {
    var container = document.getElementById('dashTodoListContainer');
    if (!container) return;
    var details = container.querySelector('details');
    var wasOpen = details ? details.open : false;
    // NOTE: innerHTML is safe here — renderTodoListSection() builds HTML from
    // escapeHtml()-sanitized user data only. No raw user input enters the template.
    container.innerHTML = renderTodoListSection({
        useScrollPane: dashboardUseSplitTopRail(),
        maxHeight: dashboardTopRailMaxHeight()
    });
    if (wasOpen) {
        var newDetails = container.querySelector('details');
        if (newDetails) newDetails.open = true;
    }
}

// Dashboard quick-add todo handler
function dashboardAddTodo() {
    var input = document.getElementById('todoQuickAdd');
    if (!input) return;
    var text = input.value.trim();
    if (!text) {
        showToast('Enter a task description', 'warning');
        return;
    }
    addTodoItem(text, 'MANUAL', '');
    input.value = '';
    rerenderTodoListSection();
    var newInput = document.getElementById('todoQuickAdd');
    if (newInput) newInput.focus();
    showToast('Added: ' + text, 'info');
}

// ==================== HEADLINE COUNTER HELPERS ====================
function updateHeadlineTarget(type, value) {
    roadmapData.clinicHeadlines = roadmapData.clinicHeadlines || {};
    roadmapData.clinicHeadlines[type] = roadmapData.clinicHeadlines[type] || {};
    roadmapData.clinicHeadlines[type].target = parseInt(value) || 0;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
    renderDashboard();
}

// ==================== GRADUATION PREP TAB ====================
function renderGraduationPrep() {
    const container = document.getElementById('tab-gradprep');
    if (!container) return;

    const gp = roadmapData.graduationPrep || {};
    const ext = gp.externship || {};
    const cdca = gp.cdcaAdex || {};
    const inbde = gp.inbde || {};
    const jobs = gp.jobSearch || {};

    let html = '<h2 style="color:#f59e0b; margin-bottom:16px; font-size:1.3em;">🎓 Graduation Prep</h2>';

    // Externship Card
    html += '<div style="background:rgba(30,41,59,0.8); border:1px solid rgba(16,185,129,0.3); border-radius:14px; padding:18px; margin-bottom:14px;">';
    html += '<h3 style="color:#6ee7b7; margin:0 0 12px 0;">🌴 Externship (Florida)</h3>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">';
    html += '<label style="display:flex; flex-direction:column; gap:4px; color:#94a3b8; font-size:0.85em;">Start Date';
    html += '<input type="date" value="' + (ext.startDate || '') + '" onchange="updateGradPrep(\'externship\',\'startDate\',this.value)" '
        + 'style="background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:6px; color:#e2e8f0; padding:6px 8px;">';
    html += '</label>';
    html += '<label style="display:flex; flex-direction:column; gap:4px; color:#94a3b8; font-size:0.85em;">End Date';
    html += '<input type="date" value="' + (ext.endDate || '') + '" onchange="updateGradPrep(\'externship\',\'endDate\',this.value)" '
        + 'style="background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:6px; color:#e2e8f0; padding:6px 8px;">';
    html += '</label>';
    html += '</div>';
    html += '<h4 style="color:#94a3b8; font-size:0.9em; margin:8px 0 6px 0;">Active Patients Needing Management</h4>';
    html += '<textarea placeholder="Track patients with active treatments, denture deliveries, etc..." '
        + 'onchange="updateGradPrep(\'externship\',\'notes\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(ext.notes || '') + '</textarea>';
    html += '<h4 style="color:#94a3b8; font-size:0.9em; margin:12px 0 6px 0;">Logistics</h4>';
    html += '<textarea placeholder="Housing, travel, schedule details..." '
        + 'onchange="updateGradPrep(\'externship\',\'logistics\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(ext.logistics || '') + '</textarea>';
    html += '</div>';

    // CDCA/ADEX Card
    html += '<div style="background:rgba(30,41,59,0.8); border:1px solid rgba(59,130,246,0.3); border-radius:14px; padding:18px; margin-bottom:14px;">';
    html += '<h3 style="color:#93c5fd; margin:0 0 8px 0;">🦷 CDCA/ADEX</h3>';
    html += '<p style="color:#9ca3af; font-size:0.8em; margin:0 0 10px 0;">1 formative + 2-3 summative sessions before externship. Summative scores = 10% of Fixed 2 grade.</p>';
    html += '<textarea placeholder="Session dates, scores, prep notes..." '
        + 'onchange="updateGradPrep(\'cdcaAdex\',\'notes\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(cdca.notes || '') + '</textarea>';
    html += '</div>';

    // INBDE Card
    html += '<div style="background:rgba(30,41,59,0.8); border:1px solid rgba(124,58,237,0.3); border-radius:14px; padding:18px; margin-bottom:14px;">';
    html += '<h3 style="color:#a78bfa; margin:0 0 10px 0;">📝 INBDE Prep</h3>';
    html += '<textarea placeholder="Study plan, resources, timeline..." '
        + 'onchange="updateGradPrep(\'inbde\',\'notes\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(inbde.notes || '') + '</textarea>';
    html += '</div>';

    // Job Search Card
    html += '<div style="background:rgba(30,41,59,0.8); border:1px solid rgba(245,158,11,0.3); border-radius:14px; padding:18px; margin-bottom:14px;">';
    html += '<h3 style="color:#fbbf24; margin:0 0 10px 0;">💼 Job Search</h3>';
    html += '<textarea placeholder="Target locations, contacts, timeline..." '
        + 'onchange="updateGradPrep(\'jobSearch\',\'notes\',this.value)" '
        + 'style="width:100%; min-height:70px; background:rgba(30,41,59,0.9); border:1px solid rgba(100,116,139,0.4); border-radius:8px; color:#e2e8f0; padding:10px; font-size:0.9em; resize:vertical; box-sizing:border-box;">'
        + escapeHtml(jobs.notes || '') + '</textarea>';
    html += '</div>';

    container.innerHTML = html;
}

function updateGradPrep(category, field, value) {
    roadmapData.graduationPrep = roadmapData.graduationPrep || {};
    roadmapData.graduationPrep[category] = roadmapData.graduationPrep[category] || {};
    roadmapData.graduationPrep[category][field] = value;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
    saveData();
}

// ==================== INITIALIZE ====================
function initUI() {

    // ============================================
    // CRITICAL FIX: Reset deadlines array from STATIC_DEADLINES
    // This prevents duplicate custom deadlines from accumulating
    // when initUI() is called multiple times (tab switch, visibility change, etc.)
    // ============================================
    deadlines.length = 0; // Clear the working array
    STATIC_DEADLINES.forEach(d => deadlines.push({...d})); // Deep copy static deadlines

    // Tag each static deadline with its original stableId BEFORE any edits are applied
    // This allows CRUD operations to always use the correct persistence key
    deadlines.forEach(d => { d._originalStableId = getDeadlineId(d); });

    // CRITICAL FIX: Filter out deleted static deadlines
    // Without this, deleted static deadlines reappear every time initUI() runs
    // because they get re-added from STATIC_DEADLINES above
    try {
        if (roadmapData.deletedDeadlines && getCount(roadmapData.deletedDeadlines) > 0) {
            const deletedValues = getValues(roadmapData.deletedDeadlines);
            for (let i = deadlines.length - 1; i >= 0; i--) {
                const d = deadlines[i];
                const matchesDeleted = deletedValues.some(del =>
                    del.date === d.date && del.what === d.what && del.course === d.course
                );
                if (matchesDeleted) {
                    deadlines.splice(i, 1);
                }
            }
        }
    } catch(e) { console.error('Error filtering deleted deadlines:', e); }

    // Sync static exams array to roadmapData for cross-app integration
    // Body Comp Tracker pulls this from Firebase
    if (!roadmapData.exams || getCount(roadmapData.exams) === 0) {
        // Convert static exams array to object format
        roadmapData.exams = {};
        exams.forEach((e, i) => {
            const examId = e.id || generateId('exam') + '_' + i;
            roadmapData.exams[examId] = { ...e, id: examId };
        });
        // Save to Firebase so Body Comp Tracker can access exams
        // GUARD: Only save if Firebase load is complete — prevents saving defaults during race
        if (hasLoadedFromCloud && !awaitingFirebaseLoad) {
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            setTimeout(() => saveData(), 100);
        }
    }

    try {
        // Restore mandatory checkboxes
        Object.keys(roadmapData.mandatoryItems).forEach(key => {
            if (roadmapData.mandatoryItems[key]) {
                const item = document.getElementById('mandatory-' + key);
                if (item) {
                    const checkbox = item.querySelector('input');
                    if (checkbox) {
                        checkbox.checked = true;
                        item.classList.remove('unchecked');
                        item.classList.add('checked');
                    }
                }
            }
        });
    } catch(e) { console.error('Error restoring mandatory items:', e); }

    try {
        // Restore Peds locked in value
        const pedsLockedEl = document.getElementById('pedsLockedIn');
        const pedsLockedEl2 = document.getElementById('pedsLockedIn2');
        if (pedsLockedEl) pedsLockedEl.textContent = roadmapData.pedsLockedIn;
        if (pedsLockedEl2) pedsLockedEl2.textContent = roadmapData.pedsLockedIn;
    } catch(e) { console.error('Error restoring peds locked in:', e); }

    try {
        // Restore edited deadlines using STABLE ID matching
        // This survives array reordering and custom deadline additions
        if (roadmapData.editedDeadlines) {
            Object.entries(roadmapData.editedDeadlines).forEach(([key, edited]) => {
                if (!edited) return;

                // Try to find deadline by stable ID first
                let deadlineIdx = deadlines.findIndex(d => getDeadlineId(d) === key);

                // FIX: Also check _originalStableId — if an earlier edit in this loop
                // already mutated a deadline, getDeadlineId(d) may no longer match
                if (deadlineIdx === -1) {
                    deadlineIdx = deadlines.findIndex(d => d._originalStableId === key);
                }

                // Fallback: Legacy numeric index (for migration from old data)
                if (deadlineIdx === -1 && /^\d+$/.test(key)) {
                    const idx = parseInt(key, 10);
                    if (deadlines[idx]) {
                        // Migrate: re-save with stable ID
                        const stableId = getDeadlineId(deadlines[idx]);
                        roadmapData.editedDeadlines[stableId] = edited;
                        delete roadmapData.editedDeadlines[key];
                        deadlineIdx = idx;
                    }
                }

                if (deadlineIdx !== -1) {
                    // Apply the edit to the deadline
                    const deadline = deadlines[deadlineIdx];
                    if (edited.date !== undefined) deadline.date = edited.date;
                    if (edited.day !== undefined) deadline.day = edited.day;
                    if (edited.what !== undefined) deadline.what = edited.what;
                    if (edited.course !== undefined) deadline.course = edited.course;
                    if (edited.weight !== undefined) deadline.weight = edited.weight;
                    if (edited.type !== undefined) deadline.type = edited.type;
                    if (edited.month !== undefined) deadline.month = edited.month;
                    if (edited.done !== undefined) deadline.done = edited.done;
                    if (edited.grade !== undefined) deadline.grade = edited.grade;
                }
            });
        }
    } catch(e) { console.error('Error restoring edited deadlines:', e); }

    try {
        // Add any custom deadlines (preserving their ID!)
        const customDeadlineValues = getValues(roadmapData.customDeadlines);
        if (customDeadlineValues.length > 0) {
            customDeadlineValues.forEach(d => {
                const customStableId = d.id ? sanitizeFirebaseKey(d.id) : getDeadlineId({date: d.date, course: d.course || 'Other', what: d.what});
                // CRITICAL FIX: Check if editedDeadlines has overrides for this custom deadline
                // editedDeadlines loop (above) only matches STATIC deadlines — custom deadline
                // edits stored in editedDeadlines would be orphaned without this check
                const edited = roadmapData.editedDeadlines ? roadmapData.editedDeadlines[customStableId] : null;
                const finalDate = edited?.date || d.date;
                const dateObj = new Date(finalDate + 'T12:00:00');
                const month = edited?.month || dateObj.toLocaleString('en-US', { month: 'long' }).toLowerCase();
                deadlines.push({
                    date: finalDate,
                    day: edited?.day || dateObj.toLocaleString('en-US', { weekday: 'short' }),
                    what: edited?.what || d.what,
                    course: edited?.course || d.course || 'Other',
                    weight: edited?.weight || d.weight || '—',
                    type: edited?.type || d.type || 'Other',
                    month: month,
                    custom: true,
                    id: d.id,  // CRITICAL: Preserve the custom deadline ID!
                    done: edited?.done ?? d.done ?? false,
                    grade: edited?.grade ?? d.grade ?? null,
                    _originalStableId: customStableId
                });
            });
        }
    } catch(e) { console.error('Error adding custom deadlines:', e); }

    // Sort deadlines by date to ensure consistent order
    try {
        deadlines.sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date));
    } catch(e) { console.error('Error sorting deadlines:', e); }

    // Sync upcoming deadlines to roadmapData.upcomingDeadlines for cross-app visibility (Stim Calc)
    try {
        const todayStr = getLocalDateString(new Date());
        const upcomingObj = {};
        let idx = 0;
        deadlines.forEach(d => {
            if (d.date < todayStr || d.done) return;
            const key = 'dl_' + idx++;
            upcomingObj[key] = {
                date: d.date, day: d.day ?? '', what: d.what,
                course: d.course ?? '', weight: d.weight ?? '—', type: d.type ?? 'Other'
            };
        });
        const oldCount = getCount(roadmapData.upcomingDeadlines ?? {});
        roadmapData.upcomingDeadlines = upcomingObj;
        // GUARD: Only save if Firebase load is complete — prevents saving defaults during race
        if (idx !== oldCount && hasLoadedFromCloud && !awaitingFirebaseLoad) {
            safeLocalStorageSet(STORAGE_KEY, JSON.stringify(roadmapData));
            setTimeout(() => saveData(), 2000);
        }
    } catch(e) { console.error('Error syncing upcoming deadlines:', e); }

    // CRITICAL FIX: Restore completed deadlines using stable ID matching
    try {
        if (roadmapData.completedDeadlines) {
            Object.entries(roadmapData.completedDeadlines).forEach(([key, completed]) => {
                if (!completed) return;

                // Try to find deadline by stable ID first
                let deadlineIdx = deadlines.findIndex(d => getDeadlineId(d) === key);

                // FIX: Also check _originalStableId — after edits are applied above,
                // getDeadlineId(d) uses post-edit properties, but the completedDeadlines
                // key was stored using the pre-edit _originalStableId
                if (deadlineIdx === -1) {
                    deadlineIdx = deadlines.findIndex(d => d._originalStableId === key);
                }

                // Fallback: If key looks like an old numeric index, try matching by properties
                if (deadlineIdx === -1 && /^\d+$/.test(key)) {
                    // Try to match by date + course + what for legacy index-based data
                    deadlineIdx = deadlines.findIndex(d =>
                        d.date === completed.date &&
                        d.course === completed.course &&
                        d.what === completed.what
                    );
                }

                if (deadlineIdx !== -1) {
                    deadlines[deadlineIdx].done = true;
                    deadlines[deadlineIdx].grade = completed.grade !== undefined ? completed.grade : null;
                }
            });
        }
    } catch(e) { console.error('Error restoring completed deadlines:', e); }

    console.log('[D3-INIT] Deadline restore complete:',
        'total deadlines:', deadlines.length,
        'editedDeadlines keys:', getCount(roadmapData.editedDeadlines),
        'customDeadlines:', getCount(roadmapData.customDeadlines),
        'completedDeadlines:', getCount(roadmapData.completedDeadlines),
        'deletedDeadlines:', getCount(roadmapData.deletedDeadlines),
        'done count:', deadlines.filter(d => d.done).length);

    // Also restore completion status from grades data (bidirectional sync)
    try {
        if (roadmapData.grades) {
            deadlines.forEach((d, idx) => {
                if (d.done) return; // Already marked complete
                const course = d.course.toLowerCase();
                const what = d.what.toLowerCase();

                // Check if this deadline has a grade entered in the grades tab
                let gradeValue = null;

                // Oral Med
                if (course.includes('oral med') && roadmapData.grades.oralmed) {
                    const quizMatch = what.match(/quiz\s*(\d+)/i);
                    if (quizMatch) gradeValue = roadmapData.grades.oralmed['quiz' + quizMatch[1]];
                    if (what.includes('midterm')) gradeValue = roadmapData.grades.oralmed.midterm;
                    if (what.includes('final')) gradeValue = roadmapData.grades.oralmed.final;
                }
                // Pain Control
                if (course.includes('pain control') && roadmapData.grades.paincontrol) {
                    const rxMatch = what.match(/rx\s*#?(\d)/i);
                    if (rxMatch) gradeValue = roadmapData.grades.paincontrol['rx' + rxMatch[1]];
                    if (what.includes('midterm')) gradeValue = roadmapData.grades.paincontrol.midterm;
                    if (what.includes('final')) gradeValue = roadmapData.grades.paincontrol.final;
                }
                // Peds
                if (course.includes('peds') && roadmapData.grades.peds) {
                    const examMatch = what.match(/exam\s*(\d)/i);
                    if (examMatch) gradeValue = roadmapData.grades.peds['exam' + examMatch[1]];
                }
                // Perio
                if (course.includes('perio') && roadmapData.grades.perio) {
                    if (what.includes('midterm')) gradeValue = roadmapData.grades.perio.midterm;
                    if (what.includes('final')) gradeValue = roadmapData.grades.perio.final;
                }
                // Ortho
                if (course.includes('ortho') && roadmapData.grades.ortho) {
                    if (what.includes('midterm')) gradeValue = roadmapData.grades.ortho.midterm;
                    if (what.includes('final')) gradeValue = roadmapData.grades.ortho.final;
                }

                // If a grade was found, mark the deadline as complete
                if (gradeValue !== null && gradeValue !== undefined && gradeValue !== '') {
                    d.done = true;
                    d.grade = gradeValue;
                }
            });
        }
    } catch(e) { console.error('Error syncing grades to deadlines:', e); }

    // Ensure competencies are initialized before any render that reads them
    try { ensureCompetenciesInitialized(); } catch(e) { console.error('ensureCompetenciesInitialized error:', e); }

    // CIS v3 migrations — idempotent, gated by localStorage flags
    try { migrateCompetencyEnhancements(); } catch(e) { console.error('migrateCompetencyEnhancements error:', e); }
    try { migrateToUnifiedPatientStore(); } catch(e) { console.error('migrateToUnifiedPatientStore error:', e); }

    // Permanent schema field sync — d3Deadline/rules/text/required always match DEFAULT_COMPETENCIES
    try { syncSchemaFields(); } catch(e) { console.error('syncSchemaFields error:', e); }

    // Competency V2: strip evidence-trail model, seed from ground truth audit
    try { migrateToCompetencyV2(); } catch(e) { console.error('migrateToCompetencyV2 error:', e); }

    // ALWAYS try to render, even if above steps failed
    try { renderDashboard(); } catch(e) { console.error('renderDashboard error:', e); }
    try { renderDeadlines(); } catch(e) { console.error('renderDeadlines error:', e); }
    try { loadCourseGrades(); } catch(e) { console.error('loadCourseGrades error:', e); }
    try { renderExamCountdown(); } catch(e) { console.error('renderExamCountdown error:', e); }
    try { initMonthlyPlanner(); } catch(e) { console.error('initMonthlyPlanner error:', e); }
    // Exam Content tab uses dropdown - no auto-load needed

    // Initialize Clinical tab if data exists
    try { initClinicalTab(); } catch(e) { console.error('initClinicalTab error:', e); }
    try { renderCompetencies(); } catch(e) { console.error('renderCompetencies error:', e); }

    // One-time perio noise cleanup
    if (typeof migratePerioNoiseCleanup === 'function') {
        try { migratePerioNoiseCleanup(); } catch(e) { console.error('[PERIO-CLEANUP] Error:', e); }
    }

    // One-time leading-zero chart number dedup
    if (typeof migrateLeadingZeroDedup === 'function') {
        try { migrateLeadingZeroDedup(); } catch(e) { console.error('[LEADING-ZERO-DEDUP] Error:', e); }
    }
}

function init() {
    // Start Firebase initialization
    initFirebase();
}

// ==================== BOOTSTRAP ====================
// Initialize on DOMContentLoaded to ensure all scripts and DOM are ready.
// init() calls initFirebase() which handles async data loading.
document.addEventListener('DOMContentLoaded', () => {
    // One-time cleanup of legacy localStorage backup + checkpoint data to reclaim space
    try {
        localStorage.removeItem('graduationRoadmapBackup');
        localStorage.removeItem('d3RoadmapBackup');
        // Checkpoints now live in Firebase only — clean localStorage copies
        var _pin = localStorage.getItem('dentalQuestPin') || 'default';
        var _pinHash = btoa(_pin).replace(/[^a-zA-Z0-9]/g, '');
        localStorage.removeItem('gradRoadmap_checkpoints_' + _pinHash);
        localStorage.removeItem('d3roadmap_checkpoints_' + _pinHash);
    } catch(e) {}

    init();

    // FALLBACK: If Firebase hangs after 3s, load from localStorage and set ALL sync flags
    // CRITICAL FIX: Skip if user is still typing PIN OR Firebase is mid-load.
    // Firing this with empty localStorage causes defaults to get a recent lastSaved timestamp,
    // which makes finishFirebaseLoad() skip the Firebase merge (thinks local is newer),
    // then saves defaults to Firebase wiping all data.
    setTimeout(() => {
        if (awaitingPinEntry || awaitingFirebaseLoad) {
            console.log('[GRAD-FALLBACK] 3s: Skipping — PIN prompt or Firebase load still active');
            return;
        }
        const dateEl = document.getElementById('currentDateDisplay');
        if (dateEl && (dateEl.textContent === 'Loading...' || !dateEl.textContent)) {
            try { loadFromLocalStorage(false); } catch(e) { console.error('3s fallback localStorage load failed:', e); }
            hasLoadedFromCloud = true;
            isInitialLoad = false;
            roadmapData._dataLoaded = true;
            if (typeof markInitialLoadComplete === 'function') markInitialLoadComplete();
            updateSyncStatus('offline', 'Loaded locally');
            try {
                initUI();
            } catch(e) {
                console.error('3s fallback initUI failed:', e);
                try { renderDashboard(); } catch(e2) { console.error('renderDashboard failed:', e2); }
                try { renderDeadlines(); } catch(e3) { console.error('renderDeadlines failed:', e3); }
            }
        }
    }, 3000);

    // UNCONDITIONAL FAILSAFE: If isInitialLoad is STILL true after 6s, force all flags
    // Same fix: skip if user is still at PIN prompt OR Firebase is mid-load
    setTimeout(() => {
        if (awaitingPinEntry || awaitingFirebaseLoad) {
            console.log('[GRAD-FALLBACK] 6s: Skipping — PIN prompt or Firebase load still active');
            return;
        }
        if (isInitialLoad) {
            console.error('6s failsafe: isInitialLoad still true, forcing flags');
            hasLoadedFromCloud = true;
            isInitialLoad = false;
            roadmapData._dataLoaded = true;
            if (typeof markInitialLoadComplete === 'function') markInitialLoadComplete();
            updateSyncStatus('offline', 'Loaded locally (failsafe)');
            try { initUI(); } catch(e) { console.error('6s failsafe initUI failed:', e); }
        }
    }, 6000);
});
