// ============================================
// GRAPH & CANVAS (Phase 4)
// ============================================

function drawGraph() {
    const canvas = document.getElementById('graphCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Size the buffer from the canvas's own rendered rect — CSS owns the display
    // size (.unified-graph-wrap canvas uses !important, so inline styles lose)
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = rect.width;
    const cssH = rect.height;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = cssW;
    const height = cssH;
    const padding = { left: 50, right: 20, top: 20, bottom: 30 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Time range: 6am to 3am next day (21 hours)
    const startTime = 6 * 60; // 6am
    const endTime = 27 * 60; // 3am next day
    const timeRange = endTime - startTime;

    // Find max values for scaling
    const effectiveThreshold = getEffectiveThreshold();
    let maxAmp = effectiveThreshold * 2;
    let maxCaff = state.settings.caffThreshold * 2;

    for (let t = startTime; t <= endTime; t += 15) {
        const a = calculateAmpLoad(t);
        const c = calculateCaffLoad(t);
        if (Number.isFinite(a)) maxAmp = Math.max(maxAmp, a);
        if (Number.isFinite(c)) maxCaff = Math.max(maxCaff, c);
    }

    let maxY = Math.max(maxAmp, maxCaff, 50);
    if (!Number.isFinite(maxY)) maxY = 50;

    // Draw Forbidden Zone band (red, semi-transparent)
    const forbiddenZone = getForbiddenZone();
    let fzStart = forbiddenZone.start;
    let fzEnd = forbiddenZone.end;
    // Removed buggy > 24*60 wrapping that made zones disappear

    // Adjust for graph coordinates
    if (fzStart >= startTime && fzStart <= endTime) {
        const fzStartX = padding.left + ((fzStart - startTime) / timeRange) * graphWidth;
        const fzEndX = padding.left + ((Math.min(fzEnd, endTime) - startTime) / timeRange) * graphWidth;

        ctx.fillStyle = 'rgba(184, 92, 92, 0.08)';
        ctx.fillRect(fzStartX, padding.top, fzEndX - fzStartX, graphHeight);

        // Label — skip when the visible band is too narrow to hold the text
        // (narrow mobile graphs otherwise overlap this with the Sleep Gate label)
        ctx.font = 'bold 9px Inter, sans-serif';
        if (fzEndX - fzStartX >= ctx.measureText('FORBIDDEN').width + 8) {
            ctx.fillStyle = 'rgba(184, 92, 92, 0.5)';
            ctx.textAlign = 'center';
            ctx.fillText('FORBIDDEN', (fzStartX + fzEndX) / 2, padding.top + 12);
            ctx.fillText('ZONE', (fzStartX + fzEndX) / 2, padding.top + 22);
        }
    }

    // Draw Sleep Gate band (green, semi-transparent)
    const sleepGate = getSleepGate();
    let sgStart = sleepGate.start;
    let sgEnd = sleepGate.end;
    // Removed buggy > 24*60 wrapping that made zones disappear

    if (sgStart >= startTime && sgStart <= endTime) {
        const sgStartX = padding.left + ((sgStart - startTime) / timeRange) * graphWidth;
        const sgEndX = padding.left + ((Math.min(sgEnd, endTime) - startTime) / timeRange) * graphWidth;

        ctx.fillStyle = 'rgba(94, 138, 94, 0.08)';
        ctx.fillRect(sgStartX, padding.top, sgEndX - sgStartX, graphHeight);

        // Label — same narrow-band skip as the Forbidden Zone label
        ctx.font = 'bold 9px Inter, sans-serif';
        if (sgEndX - sgStartX >= ctx.measureText('SLEEP').width + 8) {
            ctx.fillStyle = 'rgba(94, 138, 94, 0.5)';
            ctx.textAlign = 'center';
            ctx.fillText('SLEEP', (sgStartX + sgEndX) / 2, padding.top + 12);
            ctx.fillText('GATE', (sgStartX + sgEndX) / 2, padding.top + 22);
        }
    }

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (graphHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Y-axis labels
        const value = Math.round(maxY * (1 - i / 5));
        ctx.fillStyle = '#9C948B';
        ctx.font = '11px SF Mono, Consolas, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(value + 'mg', padding.left - 8, y + 4);
    }

    // Vertical grid lines and time labels
    const timeLabels = ['6am', '9am', '12pm', '3pm', '6pm', '9pm', '12am', '3am'];
    const timePoints = [6, 9, 12, 15, 18, 21, 24, 27];

    timePoints.forEach((hour, i) => {
        const x = padding.left + ((hour * 60 - startTime) / timeRange) * graphWidth;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();

        ctx.fillStyle = '#9C948B';
        ctx.font = '11px SF Mono, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeLabels[i], x, height - 8);
    });

    // Draw threshold line (using effective threshold)
    ctx.strokeStyle = '#B85C5C';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const thresholdY = padding.top + graphHeight * (1 - effectiveThreshold / maxY);
    ctx.beginPath();
    ctx.moveTo(padding.left, thresholdY);
    ctx.lineTo(width - padding.right, thresholdY);
    ctx.stroke();

    // Label threshold
    ctx.fillStyle = '#B85C5C';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${effectiveThreshold.toFixed(0)}mg threshold`, padding.left + 5, thresholdY - 5);

    ctx.setLineDash([]);

    // Draw "Stimulant Blockade" shading (area between amp curve and threshold)
    // This visually shows when drugs are blocking sleep
    ctx.fillStyle = 'rgba(74, 124, 155, 0.12)';
    ctx.beginPath();
    ctx.moveTo(padding.left, thresholdY);

    for (let t = startTime; t <= endTime; t += 5) {
        const x = padding.left + ((t - startTime) / timeRange) * graphWidth;
        const load = calculateAmpLoad(t);
        const y = padding.top + graphHeight * (1 - load / maxY);

        // Only shade if above threshold
        if (load > effectiveThreshold) {
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, thresholdY);
        }
    }

    // Close the path back along the threshold line
    ctx.lineTo(width - padding.right, thresholdY);
    ctx.lineTo(padding.left, thresholdY);
    ctx.closePath();
    ctx.fill();

    // Add "Stimulant Blockade" label in the shaded area
    const medsForPeak = getValues(state.medications);
    const peakTime = medsForPeak.length > 0 ?
        Math.min(...medsForPeak.map(m => timeToMinutes(m.time))) + 180 : // ~3 hrs after first dose
        startTime + 360;

    if (peakTime >= startTime && peakTime <= endTime) {
        const peakLoad = calculateAmpLoad(peakTime);
        if (peakLoad > effectiveThreshold) {
            const labelX = padding.left + ((peakTime - startTime) / timeRange) * graphWidth;
            const labelY = padding.top + graphHeight * (1 - (effectiveThreshold + (peakLoad - effectiveThreshold) / 2) / maxY);

            ctx.fillStyle = 'rgba(74, 124, 155, 0.6)';
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('STIMULANT', labelX, labelY - 5);
            ctx.fillText('BLOCKADE', labelX, labelY + 5);
        }
    }

    // Draw amphetamine curve
    ctx.strokeStyle = '#4A7C9B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let firstPoint = true;

    for (let t = startTime; t <= endTime; t += 5) {
        const x = padding.left + ((t - startTime) / timeRange) * graphWidth;
        const load = calculateAmpLoad(t);
        const y = padding.top + graphHeight * (1 - load / maxY);

        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw caffeine curve
    ctx.strokeStyle = '#C4923A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    firstPoint = true;

    for (let t = startTime; t <= endTime; t += 5) {
        const x = padding.left + ((t - startTime) / timeRange) * graphWidth;
        const load = calculateCaffLoad(t);
        const y = padding.top + graphHeight * (1 - load / maxY);

        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // Draw "now" line
    const now = getCurrentMinutes();
    if (now >= startTime && now <= endTime) {
        const nowX = padding.left + ((now - startTime) / timeRange) * graphWidth;
        ctx.strokeStyle = '#5E8A5E';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(nowX, padding.top);
        ctx.lineTo(nowX, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#5E8A5E';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NOW', nowX, padding.top - 5);
    }

    // Draw projected sleep time marker
    const { sleepTime } = calculateSleepTime();
    let displaySleepTime = sleepTime;
    if (displaySleepTime < 0) displaySleepTime += 24 * 60;
    if (displaySleepTime > 24 * 60) displaySleepTime -= 24 * 60;

    // Adjust for graph (which shows 6am to 3am next day)
    let graphSleepTime = displaySleepTime;
    if (displaySleepTime < startTime) graphSleepTime += 24 * 60; // Next day

    if (graphSleepTime >= startTime && graphSleepTime <= endTime) {
        const sleepX = padding.left + ((graphSleepTime - startTime) / timeRange) * graphWidth;

        // Draw sleep time line
        ctx.strokeStyle = '#5E8A5E';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(sleepX, padding.top);
        ctx.lineTo(sleepX, height - padding.bottom);
        ctx.stroke();

        // Sleep time arrow at bottom
        ctx.fillStyle = '#5E8A5E';
        ctx.beginPath();
        ctx.moveTo(sleepX, height - padding.bottom + 5);
        ctx.lineTo(sleepX - 6, height - padding.bottom + 12);
        ctx.lineTo(sleepX + 6, height - padding.bottom + 12);
        ctx.closePath();
        ctx.fill();

        // Label — inside the plot just above the axis, on a backing chip.
        // The old below-axis position collided with the x-axis time labels
        // and clipped the time line off the bottom of the canvas.
        const sleepLabel = minutesToTime(displaySleepTime);
        ctx.font = 'bold 10px Inter, sans-serif';
        const labelW = Math.max(ctx.measureText('SLEEP').width, ctx.measureText(sleepLabel).width);
        const labelX = Math.min(Math.max(sleepX, padding.left + labelW / 2 + 3), width - labelW / 2 - 3);
        ctx.fillStyle = 'rgba(250, 248, 245, 0.85)';
        ctx.fillRect(labelX - labelW / 2 - 3, height - padding.bottom - 28, labelW + 6, 25);
        ctx.fillStyle = '#5E8A5E';
        ctx.textAlign = 'center';
        ctx.fillText('SLEEP', labelX, height - padding.bottom - 17);
        ctx.fillText(sleepLabel, labelX, height - padding.bottom - 6);
    }
}

// ============================================
// GRAPH TOOLTIP
// ============================================

function setupGraphTooltip() {
    const canvas = document.getElementById('graphCanvas');
    const tooltip = document.getElementById('graphTooltip');
    const container = document.getElementById('graphContainer');

    if (!canvas || !tooltip || !container) return;

    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Graph dimensions (must match drawGraph) — use CSS-pixel dims from
        // getBoundingClientRect so hit-testing stays consistent with the mouse
        // coords above after the canvas backing store is DPR-scaled.
        const padding = { left: 50, right: 20, top: 20, bottom: 30 };
        const graphWidth = rect.width - padding.left - padding.right;
        const graphHeight = rect.height - padding.top - padding.bottom;

        // Check if within graph area
        if (x < padding.left || x > rect.width - padding.right ||
            y < padding.top || y > rect.height - padding.bottom) {
            tooltip.style.display = 'none';
            return;
        }

        // Time range (must match drawGraph)
        const startTime = 6 * 60; // 6am
        const endTime = 27 * 60; // 3am next day
        const timeRange = endTime - startTime;

        // Calculate time at mouse position
        const timeAtMouse = startTime + ((x - padding.left) / graphWidth) * timeRange;

        // Calculate drug loads at this time
        const ampLoad = calculateAmpLoad(timeAtMouse);
        const caffLoad = calculateCaffLoad(timeAtMouse);
        const effectiveThreshold = getEffectiveThreshold();

        // Format time
        let displayTime = timeAtMouse;
        if (displayTime >= 24 * 60) displayTime -= 24 * 60;
        const timeStr = minutesToTime(displayTime);

        // Check zones
        const inForbidden = isInForbiddenZone(timeAtMouse);
        const inSleepGate = isInSleepGate(timeAtMouse);

        let zoneText = '';
        if (inForbidden) {
            zoneText = '<div style="color: #B85C5C; font-size: 0.85em; margin-top: 6px; font-family: Inter, sans-serif;">Warning: Forbidden Zone</div>';
        } else if (inSleepGate) {
            zoneText = '<div style="color: #5E8A5E; font-size: 0.85em; margin-top: 6px; font-family: Inter, sans-serif;">Sleep Gate</div>';
        }

        // Status indicators
        const ampStatus = ampLoad < effectiveThreshold ? 'OK' : 'pending';
        const caffStatus = caffLoad < state.settings.caffThreshold ? 'OK' : 'pending';

        tooltip.innerHTML = `
            <div class="tooltip-time">${timeStr}</div>
            <div class="tooltip-row">
                <span class="tooltip-label">Amphetamine:</span>
                <span class="tooltip-value amp">${ampLoad.toFixed(1)}mg ${ampStatus}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Caffeine:</span>
                <span class="tooltip-value caff">${caffLoad.toFixed(1)}mg ${caffStatus}</span>
            </div>
            <div class="tooltip-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-default);">
                <span class="tooltip-label">Threshold:</span>
                <span class="tooltip-value" style="color: #B85C5C;">${effectiveThreshold.toFixed(1)}mg</span>
            </div>
            ${zoneText}
        `;

        // Position tooltip
        const containerRect = container.getBoundingClientRect();
        let tooltipX = e.clientX - containerRect.left + 15;
        let tooltipY = e.clientY - containerRect.top - 10;

        // Keep tooltip within container
        const tooltipWidth = 170;
        const tooltipHeight = 120;

        if (tooltipX + tooltipWidth > containerRect.width - 20) {
            tooltipX = e.clientX - containerRect.left - tooltipWidth - 15;
        }
        if (tooltipY + tooltipHeight > containerRect.height - 20) {
            tooltipY = containerRect.height - tooltipHeight - 20;
        }
        if (tooltipY < 10) tooltipY = 10;

        tooltip.style.left = tooltipX + 'px';
        tooltip.style.top = tooltipY + 'px';
        tooltip.style.display = 'block';
    });

    canvas.addEventListener('mouseleave', function() {
        tooltip.style.display = 'none';
    });
}

// ============================================
// SLEEP PERFORMANCE GRAPH UTILITIES
// ============================================

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

// Cardinal spline interpolation for smooth curves
// Extracted from drawSleepPerformanceGraph to module level
function getCardinalSplinePoints(points, tension) {
    if (tension === undefined) tension = 0.4;
    if (points.length < 2) return points;

    const result = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        for (let t = 0; t <= 1; t += 0.05) {
            const t2 = t * t;
            const t3 = t2 * t;

            // x moves linearly p1→p2 (splining x too loops backward when point
            // spacing is uneven — e.g. a months-long data gap next to daily points)
            const x = p1.x + (p2.x - p1.x) * t;

            const y = 0.5 * ((2 * p1.y) +
                (-p0.y + p2.y) * t +
                (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

            result.push({ x, y });
        }
    }
    result.push(points[points.length - 1]);
    return result;
}

function _setupSleepTooltipForCanvas(canvasId, tooltipId, dateId, hoursId, statusId, vsAvgId, data, avg) {
    const canvas = document.getElementById(canvasId);
    const tooltip = document.getElementById(tooltipId);
    if (!canvas || !tooltip) return;

    if (data.length < 2) return;
    const padding = { top: 25, right: 15, bottom: 35, left: 35 };
    const graphHeight = 220 - padding.top - padding.bottom;

    canvas.onmousemove = function(e) {
        const canvasRect = canvas.getBoundingClientRect();
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;

        // Recompute graphWidth & pointSpacing live (canvas may be scrollable/resized)
        const liveGraphWidth = canvasRect.width - padding.left - padding.right;
        const livePointSpacing = liveGraphWidth / (data.length - 1);

        // Find closest data point
        let closestPoint = null;
        let closestDist = Infinity;

        data.forEach((d, i) => {
            if (d.hoursSlept === null) return;

            const px = padding.left + i * livePointSpacing;
            const py = padding.top + graphHeight - (Math.min(d.hoursSlept, 12) / 12) * graphHeight;
            const dist = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2));

            if (dist < closestDist && dist < 30) {
                closestDist = dist;
                closestPoint = { ...d, px, py };
            }
        });

        if (closestPoint) {
            tooltip.style.display = 'block';

            // Position tooltip
            let tooltipX = closestPoint.px + 15;
            let tooltipY = closestPoint.py - 60;

            // Adjust if too far right — use live canvas width
            if (tooltipX + 150 > canvasRect.width) {
                tooltipX = closestPoint.px - 160;
            }
            // Adjust if too high
            if (tooltipY < 10) {
                tooltipY = closestPoint.py + 20;
            }

            tooltip.style.left = tooltipX + 'px';
            tooltip.style.top = tooltipY + 'px';

            // Fill tooltip content
            const fullDate = closestPoint.date.toLocaleDateString('en-US', {
                weekday: 'long', month: 'short', day: 'numeric'
            });

            let statusText, statusColor;
            if (closestPoint.hoursSlept >= 8) {
                statusText = 'Excellent recovery';
                statusColor = '#5E8A5E';
            } else if (closestPoint.hoursSlept >= 7) {
                statusText = 'Good night';
                statusColor = '#5E8A5E';
            } else if (closestPoint.hoursSlept >= 5.5) {
                statusText = 'Functional';
                statusColor = '#9C948B';
            } else if (closestPoint.hoursSlept >= 4.5) {
                statusText = 'Sleep deprived';
                statusColor = '#C4923A';
            } else {
                statusText = 'Severe deficit';
                statusColor = '#B85C5C';
            }

            const vsAvg = closestPoint.hoursSlept - avg;
            const vsAvgText = vsAvg >= 0 ? `+${vsAvg.toFixed(1)}h vs avg` : `${vsAvg.toFixed(1)}h vs avg`;

            const dateEl = document.getElementById(dateId);
            const hoursEl = document.getElementById(hoursId);
            const statusEl = document.getElementById(statusId);
            const vsAvgEl = document.getElementById(vsAvgId);
            if (dateEl) dateEl.textContent = fullDate;
            if (hoursEl) hoursEl.innerHTML = `<span style="color: ${statusColor}">${closestPoint.hoursSlept.toFixed(1)}h</span>`;
            if (statusEl) statusEl.innerHTML = `<span style="color: ${statusColor}">${statusText}</span>`;
            if (vsAvgEl) vsAvgEl.textContent = vsAvgText;

        } else {
            tooltip.style.display = 'none';
        }
    };

    canvas.onmouseleave = function() {
        tooltip.style.display = 'none';
    };
}

function setupSleepGraphTooltip(data, avg) {
    // Calendar page tooltip only — dashboard tooltip handled by renderDashSleepHistoryFull
    _setupSleepTooltipForCanvas('sleepPerformanceGraph', 'sleepGraphTooltip', 'tooltipDate', 'tooltipHours', 'tooltipStatus', 'tooltipVsAvg', data, avg);
}

function _drawSleepGraphToCanvas(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Bail if container not visible (e.g. display:none page)
    const parentRect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : canvas.getBoundingClientRect();
    if (parentRect.width < 10) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size — draw at the canvas's actual rendered height (each call
    // site pins its own CSS height: dashboard 180px, calendar 240px)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 25, right: 15, bottom: 35, left: 35 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Collect valid data points for the curve
    const validPoints = [];
    if (!data || !Array.isArray(data) || data.length < 2) return;
    const pointSpacing = graphWidth / (data.length - 1);

    data.forEach((d, i) => {
        const x = padding.left + i * pointSpacing;
        if (d.hoursSlept !== null && Number.isFinite(d.hoursSlept)) {
            const y = padding.top + graphHeight - (Math.min(d.hoursSlept, 12) / 12) * graphHeight;
            validPoints.push({ x, y, hours: d.hoursSlept, isToday: d.isToday, dayLabel: d.dayLabel, index: i });
        }
    });

    // Draw subtle horizontal reference lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    [4, 6, 8, 10].forEach(hours => {
        const y = padding.top + graphHeight - (hours / 12) * graphHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    });

    // Y-axis labels (minimal)
    ctx.font = '10px SF Mono, Consolas, monospace';
    ctx.fillStyle = '#9C948B';
    ctx.textAlign = 'right';
    [4, 8, 12].forEach(hours => {
        const y = padding.top + graphHeight - (hours / 12) * graphHeight;
        ctx.fillText(hours + 'h', padding.left - 8, y + 3);
    });

    if (validPoints.length >= 1) {
        // Split into segments — never connect the curve across a gap of more
        // than 7 missing days (e.g. months with no tracking)
        const segments = [];
        let seg = [validPoints[0]];
        for (let i = 1; i < validPoints.length; i++) {
            if (validPoints[i].index - validPoints[i - 1].index > 7) {
                segments.push(seg);
                seg = [];
            }
            seg.push(validPoints[i]);
        }
        segments.push(seg);

        // Draw gradient fill under the curve
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + graphHeight);
        gradient.addColorStop(0, 'rgba(74, 124, 155, 0.25)');    // Medical blue at top
        gradient.addColorStop(0.3, 'rgba(94, 138, 94, 0.15)'); // Success green
        gradient.addColorStop(0.6, 'rgba(74, 124, 155, 0.08)'); // Medical blue
        gradient.addColorStop(1, 'rgba(74, 124, 155, 0.05)');   // Fade to near-transparent

        segments.forEach(segPoints => {
            if (segPoints.length < 2) return; // lone points render as dots below
            const smoothPoints = getCardinalSplinePoints(segPoints);

            ctx.beginPath();
            ctx.moveTo(smoothPoints[0].x, padding.top + graphHeight);
            ctx.lineTo(smoothPoints[0].x, smoothPoints[0].y);

            smoothPoints.forEach(p => ctx.lineTo(p.x, p.y));

            ctx.lineTo(smoothPoints[smoothPoints.length - 1].x, padding.top + graphHeight);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw the main line — clean, no glow
            ctx.beginPath();
            ctx.moveTo(smoothPoints[0].x, smoothPoints[0].y);
            smoothPoints.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.strokeStyle = '#5E8A5E';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        });

        // Draw data points — crisp dots, no glow layers
        validPoints.forEach((p, idx) => {
            let pointColor;
            if (p.hours >= 7) {
                pointColor = '#5E8A5E';
            } else if (p.hours >= 5.5) {
                pointColor = '#9C948B';
            } else if (p.hours >= 4.5) {
                pointColor = '#C4923A';
            } else {
                pointColor = '#B85C5C';
            }

            const radius = p.isToday ? 5 : 3.5;

            // Main point
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = pointColor;
            ctx.fill();

            // Subtle border
            ctx.strokeStyle = '#FAF8F5';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Today indicator ring
            if (p.isToday) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(94, 138, 94, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });
    }

    // Draw reference lines (8h optimal, 4.5h danger) - subtle
    const optimalY = padding.top + graphHeight - (8 / 12) * graphHeight;
    const dangerY = padding.top + graphHeight - (4.5 / 12) * graphHeight;

    // Optimal line (8h) - subtle green
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(padding.left, optimalY);
    ctx.lineTo(width - padding.right, optimalY);
    ctx.strokeStyle = 'rgba(94, 138, 94, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Danger line (4.5h) - subtle red
    ctx.beginPath();
    ctx.moveTo(padding.left, dangerY);
    ctx.lineTo(width - padding.right, dangerY);
    ctx.strokeStyle = 'rgba(184, 92, 92, 0.2)';
    ctx.stroke();
    ctx.setLineDash([]);

    // X-axis labels — adaptive spacing based on data length
    ctx.font = '9px SF Mono, Consolas, monospace';
    ctx.textAlign = 'center';

    // Pick label interval: every 7 days for <=60 points, every 14 for <=120, every 30 for more
    const labelInterval = data.length <= 60 ? 7 : data.length <= 120 ? 14 : 30;

    data.forEach((d, i) => {
        const x = padding.left + i * pointSpacing;

        // Show label at interval boundaries, first point, and today
        if (i === 0 || i % labelInterval === 0 || d.isToday) {
            ctx.fillStyle = d.isToday ? '#5E8A5E' : '#9C948B';
            ctx.font = d.isToday ? 'bold 10px Inter, sans-serif' : '9px SF Mono, Consolas, monospace';
            ctx.fillText(d.isToday ? 'Today' : d.dayLabel, x, height - 10);

            // Tick mark
            if (!d.isToday) {
                ctx.beginPath();
                ctx.moveTo(x, padding.top + graphHeight);
                ctx.lineTo(x, padding.top + graphHeight + 4);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    });
}

function drawSleepPerformanceGraph(data) {
    // Draw to Calendar page canvas only — dashboard has its own full-history renderer
    _drawSleepGraphToCanvas('sleepPerformanceGraph', data);
}

// ============================================
// ACCURACY TIMELINE GRAPH (Phase 5)
// ============================================

function drawAccuracyTimeline() {
    var canvas = document.getElementById('accuracyTimelineGraph');
    if (!canvas) return;

    // Bail if container not visible (e.g. display:none page)
    var parentRect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : canvas.getBoundingClientRect();
    if (parentRect.width < 10) return;

    var entries = getValues(state.history).filter(function(e) {
        return e.actualSleep !== null && e.actualSleep !== undefined && !isNaN(e.actualSleep) &&
               e.predictedSleep !== null && e.predictedSleep !== undefined && !isNaN(e.predictedSleep);
    });
    entries.sort(function(a, b) { return a.date.localeCompare(b.date); });
    entries = entries.slice(-30);

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    var width = rect.width;
    var height = 200;
    var padding = { top: 20, right: 15, bottom: 30, left: 40 };
    var gw = width - padding.left - padding.right;
    var gh = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    if (entries.length < 2) {
        ctx.fillStyle = '#9C948B';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Need 2+ entries with feedback to show timeline', width / 2, height / 2);
        return;
    }

    var maxDelta = 90; // clamp display range

    // Draw colored zones
    // Green zone: -30 to +30
    var greenTop = padding.top + gh * (1 - (maxDelta - 30) / (2 * maxDelta));
    var greenBot = padding.top + gh * (1 - (maxDelta - (-30)) / (2 * maxDelta));
    // Actually: y = padding.top + gh * (1 - (val + maxDelta) / (2 * maxDelta))
    // For val=30: y = padding.top + gh * (1 - (30+90)/180) = padding.top + gh * (1 - 0.667) = padding.top + gh*0.333
    // For val=-30: y = padding.top + gh * (1 - (-30+90)/180) = padding.top + gh * (1 - 0.333) = padding.top + gh*0.667

    function valToY(v) {
        var clamped = Math.max(-maxDelta, Math.min(maxDelta, v));
        return padding.top + gh * (1 - (clamped + maxDelta) / (2 * maxDelta));
    }

    // Red zone (>60 or <-60)
    ctx.fillStyle = 'rgba(184, 92, 92, 0.06)';
    ctx.fillRect(padding.left, valToY(maxDelta), gw, valToY(60) - valToY(maxDelta));
    ctx.fillRect(padding.left, valToY(-60), gw, valToY(-maxDelta) - valToY(-60));

    // Yellow zone (30-60 and -60 to -30)
    ctx.fillStyle = 'rgba(196, 146, 58, 0.06)';
    ctx.fillRect(padding.left, valToY(60), gw, valToY(30) - valToY(60));
    ctx.fillRect(padding.left, valToY(-30), gw, valToY(-60) - valToY(-30));

    // Green zone (-30 to 30)
    ctx.fillStyle = 'rgba(94, 138, 94, 0.08)';
    ctx.fillRect(padding.left, valToY(30), gw, valToY(-30) - valToY(30));

    // Zero line (dashed)
    var zeroY = valToY(0);
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Y-axis labels
    ctx.fillStyle = '#9C948B';
    ctx.font = '9px Inter, system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    [-60, -30, 0, 30, 60].forEach(function(v) {
        ctx.fillText((v > 0 ? '+' : '') + v + 'm', padding.left - 4, valToY(v) + 3);
    });

    // Plot points and line
    var spacing = entries.length > 1 ? gw / (entries.length - 1) : 0;
    var points = entries.map(function(e, i) {
        var delta = computeSleepDelta(e.predictedSleep, e.actualSleep);
        return { x: padding.left + i * spacing, y: valToY(delta), delta: delta, date: e.date };
    });

    // Draw spline if available, else straight lines
    if (points.length >= 3 && typeof getCardinalSplinePoints === 'function') {
        var spline = getCardinalSplinePoints(points, 0.3, 16);
        ctx.beginPath();
        ctx.moveTo(spline[0].x, spline[0].y);
        for (var i = 1; i < spline.length; i++) ctx.lineTo(spline[i].x, spline[i].y);
        ctx.strokeStyle = 'rgba(107, 124, 94, 0.6)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
    } else if (points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.strokeStyle = 'rgba(107, 124, 94, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Data points with color
    points.forEach(function(p) {
        var absDelta = Math.abs(p.delta);
        var color = absDelta <= 30 ? '#5E8A5E' : absDelta <= 60 ? '#C4923A' : '#B85C5C';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // X-axis date labels (sparse)
    ctx.fillStyle = '#9C948B';
    ctx.font = '9px Inter, system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    var labelInterval = Math.max(1, Math.floor(entries.length / 5));
    entries.forEach(function(e, i) {
        if (i === 0 || i === entries.length - 1 || i % labelInterval === 0) {
            var d = parseLocalDate(e.date);
            ctx.fillText(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), padding.left + i * spacing, height - 8);
        }
    });
}

// ============================================
// RESIZE HANDLER — Redraw visible graphs
// ============================================

var _graphResizeTimer = null;
window.addEventListener('resize', function() {
    clearTimeout(_graphResizeTimer);
    _graphResizeTimer = setTimeout(function() {
        // drawGraph() — visibility guard is inside the function
        drawGraph();
        // drawSleepPerformanceGraph() — only redraw if canvas parent is visible
        // Needs data param so trigger via calendar re-render if available
        var sp = document.getElementById('sleepPerformanceGraph');
        if (sp && sp.parentElement && sp.parentElement.getBoundingClientRect().width > 10) {
            if (typeof renderCalendarTab === 'function') {
                try { renderCalendarTab(); } catch(e) {}
            }
        }
        // Also redraw dashboard sleep history graph on resize
        var spDash = document.getElementById('sleepHistoryGraphDash');
        if (spDash && spDash.parentElement && spDash.parentElement.getBoundingClientRect().width > 10) {
            if (typeof renderSleepPerformance === 'function') {
                try { renderSleepPerformance(); } catch(e) {}
            }
        }
        // drawAccuracyTimeline() — visibility guard is inside the function
        drawAccuracyTimeline();
    }, 200);
});
