/* client/src/utils/pdfGenerator.js */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Helper to generate a simple SVG Pie Chart for distribution
 */
const generatePieSVG = (dist) => {
    if (!dist || dist.length === 0) return '';
    const total = dist.reduce((sum, d) => sum + d.count, 0);
    let cumulativePercent = 0;
    const colors = ['#003f88', '#E87722', '#10B981', '#6B7280'];

    const paths = dist.map((d, i) => {
        const percent = d.count / total;
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += percent;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = percent > 0.5 ? 1 : 0;
        const pathData = [
            `M 1 1`,
            `L ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L 1 1`,
        ].join(' ');
        return `<path d="${pathData}" fill="${colors[i % colors.length]}"></path>`;
    }).join('');

    return `<svg viewBox="-1 -1 4 4" style="width: 150px; height: 150px; transform: rotate(-90deg);">${paths}</svg>`;
};

const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x + 1, y + 1];
};

/**
 * Helper to generate a simple SVG Bar Chart
 */
const generateBarSVG = (stats, dataKey, labelKey) => {
    if (!stats || stats.length === 0) return '';
    const maxVal = Math.max(...stats.map(s => s[dataKey])) || 100;
    return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${stats.map(s => {
        const width = (s[dataKey] / maxVal) * 100;
        return `
                    <div style="display: flex; align-items: center; gap: 10px; font-size: 11px;">
                        <div style="width: 100px; text-align: right; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${s[labelKey]}</div>
                        <div style="flex: 1; background: #eee; height: 12px; border-radius: 6px;">
                            <div style="width: ${width}%; background: #003f88; height: 100%; border-radius: 6px;"></div>
                        </div>
                        <div style="width: 40px; font-weight: bold;">${parseFloat(s[dataKey]).toFixed(1)}</div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
};

/**
 * Generates a professional PDF report from a data object and a template type.
 * @param {Object} data - The aggregated report data from backend.
 * @param {String} type - 'admin-summary', 'team-report', or 'individual-assessment'.
 */
export const generateProfessionalPDF = async (data, type) => {
    // Create a hidden container for the report
    const container = document.createElement('div');
    container.className = 'print-report-template';
    // Position off-screen but fully rendered at A4 width
    container.style.cssText = 'position:fixed;top:0;left:-9999px;width:900px;background:white;z-index:-1;';
    document.body.appendChild(container);

    try {
        let html = '';
        const timestamp = new Date().toLocaleString();

        if (type === 'admin-summary') {
            const { header, summary, top_performers, improvement_needed, distribution, dept_stats, manager_stats } = data;

            // Helper for Performance Level
            const getLevel = (score) => {
                if (score >= 85) return { label: 'Excellent', color: '#10B981', bg: '#D1FAE5' };
                if (score >= 70) return { label: 'Good', color: '#3B82F6', bg: '#DBEAFE' };
                if (score >= 50) return { label: 'Satisfactory', color: '#F59E0B', bg: '#FEF3C7' };
                return { label: 'Needs Improvement', color: '#EF4444', bg: '#FEE2E2' };
            };

            const orgLevel = getLevel(summary.average_score);
            
            // Calculate distribution percentages
            const totalCompleted = summary.completed || 1;
            const distWithPercent = distribution.map(d => ({
                ...d,
                percentage: Math.round((d.count / totalCompleted) * 100)
            }));

            html = `
                <div style="font-family: 'Inter', sans-serif; color: #1E293B; max-width: 800px; margin: 0 auto; background: white; padding: 40px;">
                    
                    <!-- COVER PAGE -->
                    <div style="text-align: center; padding: 100px 0; border-bottom: 3px solid #0F172A; margin-bottom: 50px;">
                        <div style="font-size: 14px; color: #64748B; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">OFFICIAL REPORT</div>
                        <h1 style="font-size: 36px; font-weight: 800; color: #0F172A; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">ORGANIZATION</h1>
                        <h1 style="font-size: 36px; font-weight: 800; color: #003f88; margin: 0 0 30px 0; text-transform: uppercase; letter-spacing: 1px;">PERFORMANCE REPORT</h1>
                        <div style="width: 100px; height: 3px; background: #E87722; margin: 30px auto;"></div>
                        <div style="font-size: 18px; color: #334155; margin: 30px 0 10px 0; font-weight: 600;">${header.organization_name}</div>
                        <div style="font-size: 14px; color: #64748B; margin: 5px 0;">Evaluation Cycle: ${header.cycle_name}</div>
                        <div style="font-size: 14px; color: #64748B; margin: 5px 0;">Period: ${new Date(header.start_date).toLocaleDateString()} - ${new Date(header.end_date).toLocaleDateString()}</div>
                        <div style="font-size: 12px; color: #94A3B8; margin-top: 40px;">Report Generated: ${timestamp}</div>
                        <div style="font-size: 12px; color: #94A3B8; margin-top: 5px;">Total Employees Evaluated: ${summary.total_employees}</div>
                    </div>

                    <!-- Executive Summary -->
                    <div style="margin-bottom: 40px;">
                        <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 20px;">Executive Summary</h3>
                        
                        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                            <div style="flex: 1; background: #F8FAFC; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0;">
                                <div style="font-size: 11px; color: #64748B; text-transform: uppercase;">Org Average</div>
                                <div style="font-size: 32px; font-weight: 800; color: #0F172A; margin: 5px 0;">${summary.average_score}</div>
                                <div style="background: ${orgLevel.bg}; color: ${orgLevel.color}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; display: inline-block;">${orgLevel.label.toUpperCase()}</div>
                            </div>
                            <div style="flex: 1; background: #F8FAFC; padding: 20px; border-radius: 8px; border: 1px solid #E2E8F0;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <div>
                                        <div style="font-size: 11px; color: #64748B;">Highest Score</div>
                                        <div style="font-size: 18px; font-weight: 700; color: #10B981;">${summary.highest_score}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 11px; color: #64748B;">Lowest Score</div>
                                        <div style="font-size: 18px; font-weight: 700; color: #EF4444;">${summary.lowest_score}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 11px; color: #64748B;">Evaluated</div>
                                        <div style="font-size: 18px; font-weight: 700; color: #334155;">${summary.total_employees}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 11px; color: #64748B;">Completion</div>
                                        <div style="font-size: 18px; font-weight: 700; color: #3B82F6;">${Math.round((summary.completed / (summary.total_employees || 1)) * 100)}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Distribution Chart area (simplified text version for PDF reliability, or SVG) -->
                        <div style="background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px;">
                             <h4 style="font-size: 12px; font-weight: 600; color: #475569; margin: 0 0 15px 0; text-transform: uppercase;">Performance Distribution</h4>
                             ${generateBarSVG(distribution, 'count', 'level')}
                             <div style="display: flex; gap: 15px; margin-top: 15px; justify-content: center; font-size: 11px; color: #64748B;">
                                ${distribution.map(d => `<span><strong>${d.level}:</strong> ${d.count} (${Math.round((d.count / summary.completed) * 100)}%)</span>`).join(' â€¢ ')}
                             </div>
                        </div>
                    </div>

                    <!-- Detailed Analysis Grid -->
                    <div style="display: grid; grid-template-columns: 1fr; gap: 40px; margin-bottom: 40px;">
                        
                        <!-- Department Analysis -->
                        <div>
                            <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 15px;">Department Analysis</h3>
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead style="background: #F8FAFC; color: #475569; text-align: left;">
                                    <tr>
                                        <th style="padding: 8px;">Department</th>
                                        <th style="padding: 8px; text-align: center;">Emp</th>
                                        <th style="padding: 8px; text-align: center;">Avg Score</th>
                                        <th style="padding: 8px; text-align: center;">Min / Max</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${dept_stats.map(d => `
                                        <tr style="border-bottom: 1px solid #F1F5F9;">
                                            <td style="padding: 8px; font-weight: 600;">${d.Department_name}</td>
                                            <td style="padding: 8px; text-align: center;">${d.emp_count}</td>
                                            <td style="padding: 8px; text-align: center; font-weight: 700;">${parseFloat(d.avg_score).toFixed(1)}</td>
                                            <td style="padding: 8px; text-align: center; color: #64748B;">${parseFloat(d.min_score || 0).toFixed(0)} - ${parseFloat(d.max_score || 0).toFixed(0)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- Line Manager Summary -->
                        ${manager_stats ? `
                        <div>
                            <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 15px;">Line Manager Check-ins</h3>
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead style="background: #F8FAFC; color: #475569; text-align: left;">
                                    <tr>
                                        <th style="padding: 8px;">Manager</th>
                                        <th style="padding: 8px; text-align: center;">Assigned</th>
                                        <th style="padding: 8px; text-align: center;">Done</th>
                                        <th style="padding: 8px; text-align: right;">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${manager_stats.map(m => `
                                        <tr style="border-bottom: 1px solid #F1F5F9;">
                                            <td style="padding: 8px; font-weight: 600;">${m.manager_name}</td>
                                            <td style="padding: 8px; text-align: center;">${m.total_assigned}</td>
                                            <td style="padding: 8px; text-align: center;">${m.completed}</td>
                                            <td style="padding: 8px; text-align: right; font-weight: 700; color: ${m.completed === m.total_assigned ? '#10B981' : '#F59E0B'}">
                                                ${Math.round((m.completed / m.total_assigned) * 100)}%
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>` : ''}
                    </div>

                    <!-- Top Performers & Needs Improvement -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
                        <div>
                            <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 15px;">Top Performers</h3>
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead style="background: #F1F5F9; color: #475569;">
                                    <tr>
                                        <th style="padding: 8px; text-align: left;">Name</th>
                                        <th style="padding: 8px; text-align: left;">Dept</th>
                                        <th style="padding: 8px; text-align: right;">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${top_performers.map(p => `
                                        <tr style="border-bottom: 1px solid #F1F5F9;">
                                            <td style="padding: 8px; font-weight: 600;">${p.First_name} ${p.Last_name}</td>
                                            <td style="padding: 8px; color: #64748B;">${p.department_name || '-'}</td>
                                            <td style="padding: 8px; text-align: right; font-weight: 700; color: #10B981;">${p.overall_score}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 15px;">Focus Areas (Lowest 5)</h3>
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead style="background: #FEF2F2; color: #7F1D1D;">
                                    <tr>
                                        <th style="padding: 8px; text-align: left;">Name</th>
                                        <th style="padding: 8px; text-align: left;">Dept</th>
                                        <th style="padding: 8px; text-align: right;">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${improvement_needed ? improvement_needed.slice(0, 5).map(p => `
                                        <tr style="border-bottom: 1px solid #F1F5F9;">
                                            <td style="padding: 8px; font-weight: 600;">${p.First_name} ${p.Last_name}</td>
                                            <td style="padding: 8px; color: #64748B;">${p.department_name || '-'}</td>
                                            <td style="padding: 8px; text-align: right; font-weight: 700; color: #EF4444;">${p.overall_score}</td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="3" style="padding: 10px; color: #64748B;">No employees flagged for improvement.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="border-top: 1px solid #E2E8F0; padding-top: 15px; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; text-transform: uppercase;">
                        <div>Confidential â€¢ ${header.organization_name}</div>
                        <div>Page 1 of 1</div>
                    </div>
                </div>
            `;
        } else if (type === 'individual-assessment') {
            const { employee_details, cycle_details, performance, ai, benchmarking, verdict } = data;
            const overallScore = parseFloat(performance?.overall_score || 0);
            const isLineManager = !employee_details?.team; // no team = line manager report
            const params = performance?.parameters || [];

            // Helper: get display percentage for a parameter
            // For staff: rating*20. For LM or when no rating: use score directly (already %)
            const getParamPct = (p) => {
                const r = parseFloat(p.rating || 0);
                const s = parseFloat(p.score || 0);
                return r > 0 ? r * 20 : s;
            };

            const bench = benchmarking || {};
            const aiFlags = ai?.flags || [];
            // Sort by pct descending
            const sortedParams = [...params].map(p => ({ ...p, pct: getParamPct(p) }))
                .sort((a, b) => b.pct - a.pct);
            const top2 = sortedParams.slice(0, 2);
            const bottom2 = sortedParams.slice(-2).reverse();

            // For LM: weakest = pct < 70, strongest = top 1
            const lmWeakest = sortedParams.filter(p => p.pct < 70);
            const lmStrongest = sortedParams[0];

            // Overall weighted score for breakdown table
            const computedWeighted = params.reduce((sum, p) => {
                const pct = getParamPct(p);
                return sum + (pct * parseFloat(p.weightage || 0) / 100);
            }, 0);
            const displayOverall = overallScore > 0 ? overallScore : computedWeighted;

            const hasTrend = performance?.previous_score != null;
            const prevScore = parseFloat(performance?.previous_score || 0);
            const trendDiff = hasTrend ? (displayOverall - prevScore).toFixed(1) : null;
            const trendUp = parseFloat(trendDiff) >= 0;
            const vLabel = verdict?.label || 'Meets Expectations';
            const cycleStart = cycle_details?.start ? new Date(cycle_details.start).toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'}) : 'N/A';
            const cycleEnd = cycle_details?.end ? new Date(cycle_details.end).toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'}) : 'N/A';

            // Recommendations: for LM use params < 70%, for staff use bottom2
            const recParams = isLineManager ? lmWeakest : bottom2;
            const recActions = recParams.map(p => `Targeted development in ${p.parameter_name}`);
            if (displayOverall >= 75) recActions.unshift('Consider for leadership development program');

            const ratingToScore = (r) => r ? (parseFloat(r) * 20).toFixed(0) + '%' : '-';

            html = `
            <div style="font-family:Arial,sans-serif;color:#000000;max-width:820px;margin:0 auto;background:white;padding:50px 55px;font-size:14px;line-height:1.6;">

              <!-- TITLE -->
              <div data-section style="margin-bottom:30px;padding:0 55px;background:white;">
                <div style="height:20px;"></div>
                <h1 style="font-size:28px;font-weight:900;color:#000000;margin:0 0 4px;line-height:1.2;text-transform:uppercase;">EMPLOYEE PERFORMANCE MANAGEMENT SYSTEM (EPMS)</h1>
                <div style="border-top:3px solid #000000;margin-top:16px;padding-top:12px;">
                  <span style="font-size:14px;font-weight:700;color:#000000;text-transform:uppercase;letter-spacing:1px;">FINAL PERFORMANCE REPORT</span>
                </div>
              </div>

              <!-- SECTION 1: EXECUTIVE SUMMARY -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;">
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">1. Executive Summary</h2>
                <table style="width:100%;font-size:14px;border-collapse:collapse;">
                  <tr><td style="padding:5px 0;color:#000000;width:200px;"><strong>Employee Name:</strong></td><td style="padding:5px 0;color:#000000;">${employee_details?.name || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;color:#000000;"><strong>Role:</strong></td><td style="padding:5px 0;color:#000000;">${employee_details?.role || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;color:#000000;"><strong>Department:</strong></td><td style="padding:5px 0;color:#000000;">${employee_details?.department || 'N/A'}</td></tr>
                  ${!isLineManager ? `<tr><td style="padding:5px 0;color:#000000;"><strong>Team:</strong></td><td style="padding:5px 0;color:#000000;">${employee_details?.team || 'N/A'}</td></tr>` : ''}
                </table>
                <div style="height:10px;"></div>
                <table style="width:100%;font-size:14px;border-collapse:collapse;">
                  <tr><td style="padding:5px 0;color:#000000;width:200px;"><strong>Performance Cycle:</strong></td><td style="padding:5px 0;color:#000000;">${cycle_details?.name || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;color:#000000;"><strong>Cycle Period:</strong></td><td style="padding:5px 0;color:#000000;">${cycleStart} – ${cycleEnd}</td></tr>
                  <tr><td style="padding:5px 0;color:#000000;"><strong>Evaluator:</strong></td><td style="padding:5px 0;color:#000000;">${isLineManager ? 'Admin' : (performance?.evaluator_name || 'N/A')}</td></tr>
                </table>
                <div style="height:14px;"></div>
                <!-- Overall Performance Snapshot -->
                <div style="margin-top:20px;padding:20px;background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%);border-radius:12px;">
                  <div style="font-size:13px;font-weight:700;color:#000000;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;text-align:center;">Overall Performance Snapshot</div>
                  <div style="display:flex;align-items:center;justify-content:space-around;gap:24px;flex-wrap:wrap;">

                    <!-- Big Score -->
                    <div style="text-align:center;">
                      <div style="font-size:60px;font-weight:900;color:${displayOverall >= 80 ? '#10b981' : displayOverall >= 70 ? '#f59e0b' : '#ef4444'};line-height:1;">${displayOverall.toFixed(1)}%</div>
                      <div style="font-size:11px;color:#64748b;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Overall Score</div>
                    </div>

                    <!-- Circular Gauge -->
                    <div style="position:relative;width:130px;height:130px;flex-shrink:0;">
                      <svg width="130" height="130" viewBox="0 0 130 130" style="transform:rotate(-90deg);">
                        <circle cx="65" cy="65" r="52" fill="none" stroke="#e2e8f0" stroke-width="14"/>
                        <circle cx="65" cy="65" r="52" fill="none"
                          stroke="${displayOverall >= 80 ? '#10b981' : displayOverall >= 70 ? '#f59e0b' : '#ef4444'}"
                          stroke-width="14"
                          stroke-dasharray="${(displayOverall / 100 * 327).toFixed(1)} 327"
                          stroke-linecap="round"/>
                      </svg>
                      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
                        <div style="font-size:22px;font-weight:800;color:${displayOverall >= 80 ? '#10b981' : displayOverall >= 70 ? '#f59e0b' : '#ef4444'};">${displayOverall.toFixed(0)}</div>
                        <div style="font-size:10px;color:#64748b;">/ 100</div>
                      </div>
                    </div>

                    <!-- Badge + Bar -->
                    <div style="flex:1;min-width:200px;max-width:320px;">
                      <div style="display:inline-block;padding:8px 24px;border-radius:50px;background:${displayOverall >= 80 ? '#d1fae5' : displayOverall >= 70 ? '#fef3c7' : '#fee2e2'};color:${displayOverall >= 80 ? '#065f46' : displayOverall >= 70 ? '#92400e' : '#991b1b'};font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">
                        ${displayOverall >= 80 ? 'Excellent' : displayOverall >= 70 ? 'Average' : 'Needs Improvement'}
                      </div>
                      <div style="background:#e2e8f0;border-radius:8px;height:18px;overflow:hidden;margin-bottom:6px;">
                        <div style="width:${displayOverall}%;height:100%;background:${displayOverall >= 80 ? '#10b981' : displayOverall >= 70 ? '#f59e0b' : '#ef4444'};border-radius:8px;"></div>
                      </div>
                      <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin-bottom:10px;"><span>0%</span><span>50%</span><span>100%</span></div>
                      <div style="display:flex;gap:10px;font-size:10px;flex-wrap:wrap;">
                        <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:3px;"></span><span style="color:#64748b;">Excellent (≥80)</span></span>
                        <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;margin-right:3px;"></span><span style="color:#64748b;">Average (70–79)</span></span>
                        <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-right:3px;"></span><span style="color:#64748b;">Needs Improvement (&lt;70)</span></span>
                      </div>
                    </div>
                  </div>
                </div>
                ${hasTrend ? `<div style="font-size:13px;margin-top:10px;color:#000000;padding:0 4px;"><strong>Performance ${trendUp ? 'improved' : 'declined'} by ${trendUp ? '+' : ''}${trendDiff}%</strong> from the previous cycle. ${trendUp ? '↑' : '↓'}</div>` : ''}
              </div>

              <!-- SECTION 2: PERFORMANCE BREAKDOWN -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;margin-top:120px;">
                <div style="height:5px;"></div>
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">2. Performance Breakdown</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead>
                    <tr style="background:#f0f0f0;border-bottom:2px solid #999999;">
                      <th style="padding:10px 8px;text-align:left;font-weight:700;color:#000000;border:1px solid #cccccc;">Parameter</th>
                      <th style="padding:10px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #cccccc;">Weight</th>
                      <th style="padding:10px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #cccccc;">Rating (1–5)</th>
                      <th style="padding:10px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #cccccc;">Score (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${params.map((p, i) => {
                        const pct = getParamPct(p);
                        const rowBg = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
                        return `<tr style="background:${rowBg};">
                          <td style="padding:9px 8px;font-weight:600;color:#000000;border:1px solid #dddddd;">${p.parameter_name}</td>
                          <td style="padding:9px 8px;text-align:center;color:#000000;border:1px solid #dddddd;">${p.weightage}%</td>
                          <td style="padding:9px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${p.rating || '-'} / 5</td>
                          <td style="padding:9px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${pct.toFixed(0)}%</td>
                        </tr>`;
                    }).join('')}
                    <tr style="background:#f0f0f0;font-weight:700;">
                      <td colspan="3" style="padding:10px 8px;text-align:right;color:#000000;border:1px solid #cccccc;font-size:14px;">OVERALL WEIGHTED SCORE:</td>
                      <td style="padding:10px 8px;text-align:center;color:#000000;border:1px solid #cccccc;font-size:15px;font-weight:900;">${displayOverall.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- SECTION 3: FEEDBACK & RECOMMENDATION -->
              ${(performance?.feedback || performance?.recommendation) ? `
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;margin-top:120px;">
                <div style="height:5px;"></div>
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">3. Feedback &amp; Recommendation</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                  <div style="border:1px solid #cccccc;border-radius:8px;overflow:hidden;">
                    <div style="background:#003f88;color:#ffffff;padding:10px 14px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Feedback</div>
                    <div style="padding:14px;font-size:13px;color:#000000;line-height:1.7;min-height:80px;">${performance?.feedback || '<span style="color:#999;">No feedback provided.</span>'}</div>
                  </div>
                  <div style="border:1px solid #cccccc;border-radius:8px;overflow:hidden;">
                    <div style="background:#003f88;color:#ffffff;padding:10px 14px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Recommendation</div>
                    <div style="padding:14px;font-size:13px;color:#000000;line-height:1.7;min-height:80px;">${performance?.recommendation || '<span style="color:#999;">No recommendation provided.</span>'}</div>
                  </div>
                </div>
              </div>` : ''}

              <!-- SECTION 4: BENCHMARK COMPARISON -->
              ${(bench.team_average != null || bench.dept_average != null || bench.org_average != null) ? `
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;margin-top:120px;">
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">4. Benchmark Comparison</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead>
                    <tr style="background:#f0f0f0;border-bottom:2px solid #999999;">
                      <th style="padding:10px 12px;text-align:left;font-weight:700;color:#000000;border:1px solid #cccccc;">Comparison</th>
                      <th style="padding:10px 12px;text-align:center;font-weight:700;color:#000000;border:1px solid #cccccc;">Your Score</th>
                      <th style="padding:10px 12px;text-align:center;font-weight:700;color:#000000;border:1px solid #cccccc;">Average Score</th>
                      <th style="padding:10px 12px;text-align:center;font-weight:700;color:#000000;border:1px solid #cccccc;">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${bench.team_average != null ? `<tr style="border-bottom:1px solid #dddddd;">
                      <td style="padding:10px 12px;font-weight:600;color:#000000;border:1px solid #dddddd;">Team Average</td>
                      <td style="padding:10px 12px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${overallScore.toFixed(1)}%</td>
                      <td style="padding:10px 12px;text-align:center;color:#000000;border:1px solid #dddddd;">${bench.team_average.toFixed(1)}%</td>
                      <td style="padding:10px 12px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${overallScore >= bench.team_average ? '+' : ''}${(overallScore - bench.team_average).toFixed(1)}%</td>
                    </tr>` : ''}
                    ${bench.dept_average != null ? `<tr style="background:#f9f9f9;border-bottom:1px solid #dddddd;">
                      <td style="padding:10px 12px;font-weight:600;color:#000000;border:1px solid #dddddd;">Department Average</td>
                      <td style="padding:10px 12px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${overallScore.toFixed(1)}%</td>
                      <td style="padding:10px 12px;text-align:center;color:#000000;border:1px solid #dddddd;">${bench.dept_average.toFixed(1)}%</td>
                      <td style="padding:10px 12px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${overallScore >= bench.dept_average ? '+' : ''}${(overallScore - bench.dept_average).toFixed(1)}%</td>
                    </tr>` : ''}
                    ${bench.org_average != null ? `<tr style="border-bottom:1px solid #dddddd;">
                      <td style="padding:10px 12px;font-weight:600;color:#000000;border:1px solid #dddddd;">Company Average</td>
                      <td style="padding:10px 12px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${overallScore.toFixed(1)}%</td>
                      <td style="padding:10px 12px;text-align:center;color:#000000;border:1px solid #dddddd;">${bench.org_average.toFixed(1)}%</td>
                      <td style="padding:10px 12px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${overallScore >= bench.org_average ? '+' : ''}${(overallScore - bench.org_average).toFixed(1)}%</td>
                    </tr>` : ''}
                  </tbody>
                </table>
              </div>` : ''}

              <!-- SECTION 5: PERFORMANCE VISUALIZATION -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;margin-top:120px;">
                <div style="height:5px;"></div>
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">5. Performance Visualization</h2>

                <!-- Insight Summary -->
                <div style="display:flex;gap:16px;margin-bottom:20px;">
                  <div style="flex:1;background:#fee2e2;border-left:4px solid #ef4444;padding:10px 14px;border-radius:6px;">
                    <div style="font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">⚠ Weakest Area</div>
                    ${isLineManager
                      ? (lmWeakest.length > 0
                          ? `<div style="font-size:14px;font-weight:700;color:#000000;">${lmWeakest[lmWeakest.length-1].parameter_name}</div><div style="font-size:13px;color:#555555;">${lmWeakest[lmWeakest.length-1].pct.toFixed(0)}%</div>`
                          : `<div style="font-size:13px;color:#065f46;font-weight:600;">All parameters performing well</div>`)
                      : `<div style="font-size:14px;font-weight:700;color:#000000;">${bottom2[0]?.parameter_name || '—'}</div><div style="font-size:13px;color:#555555;">${bottom2[0] ? bottom2[0].pct.toFixed(0) : '—'}%</div>`
                    }
                  </div>
                  <div style="flex:1;background:#d1fae5;border-left:4px solid #10b981;padding:10px 14px;border-radius:6px;">
                    <div style="font-size:11px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">★ Strongest Area</div>
                    <div style="font-size:14px;font-weight:700;color:#000000;">${(isLineManager ? lmStrongest : top2[0])?.parameter_name || '—'}</div>
                    <div style="font-size:13px;color:#555555;">${(isLineManager ? lmStrongest : top2[0]) ? (isLineManager ? lmStrongest : top2[0]).pct.toFixed(0) : '—'}%</div>
                  </div>
                </div>

                <!-- Bar Chart: sorted lowest to highest -->
                ${(() => {
                  const scored = params.map(p => ({ ...p, pct: getParamPct(p) }))
                    .sort((a, b) => a.pct - b.pct);
                  const minPct = scored[0]?.pct ?? 0;
                  const maxPct = scored[scored.length - 1]?.pct ?? 0;
                  const barAreaW = 380;

                  return `<div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;">
                    ${scored.map((p, i) => {
                      const isMin = p.pct === minPct;
                      const isMax = p.pct === maxPct;
                      // Color by score threshold, not just min/max
                      const barColor = p.pct < 70 ? '#ef4444' : p.pct >= 80 ? '#10b981' : '#f59e0b';
                      const name = p.parameter_name.length > 22 ? p.parameter_name.substring(0, 22) + '…' : p.parameter_name;
                      return `<div style="display:flex;align-items:center;margin-bottom:10px;">
                        <div style="width:180px;font-size:12px;color:#000000;font-weight:${isMin||isMax?'700':'400'};padding-right:10px;text-align:right;flex-shrink:0;">${name}</div>
                        <div style="flex:1;display:flex;align-items:center;gap:8px;">
                          <div style="background:#e2e8f0;border-radius:4px;height:22px;flex:1;">
                            <div style="background:${barColor};height:100%;width:${p.pct}%;border-radius:4px;min-width:4px;"></div>
                          </div>
                          <div style="font-size:12px;font-weight:700;color:${barColor};width:38px;text-align:left;">${p.pct.toFixed(0)}%</div>
                        </div>
                      </div>`;
                    }).join('')}
                    <div style="display:flex;margin-left:180px;padding-top:4px;border-top:1px solid #e2e8f0;">
                      <div style="flex:1;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;padding:0 46px 0 0;">
                        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                      </div>
                    </div>
                    <div style="display:flex;gap:16px;margin-top:10px;font-size:11px;justify-content:center;">
                      <span><span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:2px;margin-right:4px;"></span>≥80%</span>
                      <span><span style="display:inline-block;width:10px;height:10px;background:#f59e0b;border-radius:2px;margin-right:4px;"></span>70–79%</span>
                      <span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;margin-right:4px;"></span>&lt;70%</span>
                    </div>
                  </div>`;
                })()}
                })()}

                ${hasTrend ? `
                <div style="margin-top:20px;">
                  <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:10px;">Trend Across Cycles</div>
                  <div style="display:flex;align-items:center;gap:30px;background:#f5f5f5;border-radius:6px;padding:16px;border:1px solid #dddddd;">
                    <div style="text-align:center;">
                      <div style="font-size:12px;color:#000000;">Previous Cycle</div>
                      <div style="font-size:24px;font-weight:800;color:#000000;">${prevScore.toFixed(1)}%</div>
                      <div style="font-size:11px;color:#555555;">${performance.previous_cycle || ''}</div>
                    </div>
                    <div style="flex:1;text-align:center;">
                      <div style="font-size:32px;font-weight:900;color:#000000;">${trendUp ? '↑' : '↓'} ${Math.abs(trendDiff)}%</div>
                      <div style="font-size:12px;color:#000000;">${trendUp ? 'Improvement' : 'Decline'} from last cycle</div>
                    </div>
                    <div style="text-align:center;">
                      <div style="font-size:12px;color:#000000;">Current Cycle</div>
                      <div style="font-size:24px;font-weight:800;color:#000000;">${displayOverall.toFixed(1)}%</div>
                      <div style="font-size:11px;color:#555555;">${cycle_details?.name || ''}</div>
                    </div>
                  </div>
                </div>` : ''}
              </div>

              <!-- SECTION 6: STRENGTHS & AREAS FOR IMPROVEMENT -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;margin-top:120px;">
                <div style="height:5px;"></div>
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">6. Top Strengths & Areas for Improvement</h2>
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:8px;">Strengths:</div>
                <ul style="margin:0 0 16px;padding-left:24px;font-size:14px;line-height:2;color:#000000;">
                  ${(isLineManager ? [lmStrongest].filter(Boolean) : top2).map(p => {
                      return `<li><strong>${p.parameter_name}</strong> — ${p.pct.toFixed(0)}%</li>`;
                  }).join('')}
                </ul>
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:8px;">Needs Improvement:</div>
                <ul style="margin:0;padding-left:24px;font-size:14px;line-height:2;color:#000000;">
                  ${isLineManager
                    ? (lmWeakest.length > 0
                        ? lmWeakest.map(p => `<li><strong>${p.parameter_name}</strong> — ${p.pct.toFixed(0)}%</li>`).join('')
                        : '<li>All parameters are performing well (≥70%)</li>')
                    : bottom2.map(p => `<li><strong>${p.parameter_name}</strong> — ${p.pct.toFixed(0)}%</li>`).join('')
                  }
                </ul>
              </div>

              <!-- SECTION 7: EVALUATION METADATA -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;">
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">7. Evaluation Metadata</h2>
                <table style="width:100%;font-size:14px;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;color:#000000;width:240px;"><strong>Evaluated by:</strong></td><td style="padding:6px 0;color:#000000;">${isLineManager ? 'Admin' : (performance?.evaluator_name || 'N/A')}</td></tr>
                  <tr><td style="padding:6px 0;color:#000000;"><strong>Evaluation Date:</strong></td><td style="padding:6px 0;color:#000000;">${performance?.submitted_at ? new Date(performance.submitted_at).toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'}) : 'N/A'}</td></tr>
                  <tr><td style="padding:6px 0;color:#000000;"><strong>Evaluation Cycle:</strong></td><td style="padding:6px 0;color:#000000;">${cycle_details?.name || 'N/A'}</td></tr>
                  <tr><td style="padding:6px 0;color:#000000;"><strong>Cycle Period:</strong></td><td style="padding:6px 0;color:#000000;">${cycleStart} – ${cycleEnd}</td></tr>
                  <tr><td style="padding:6px 0;color:#000000;"><strong>Organization:</strong></td><td style="padding:6px 0;color:#000000;">${cycle_details?.organization || 'N/A'}</td></tr>
                </table>
              </div>

              <!-- END OF REPORT -->
              <div data-section style="border-top:2px solid #000000;padding:16px 55px 0;margin-top:8px;background:white;">
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:4px;">End of Report</div>
                <div style="font-size:13px;font-style:italic;color:#000000;">Confidential – For Internal Use Only</div>
              </div>

            </div>
            `;

        } else if (type === 'team-report') {
            const { team_info, summary, trend, distribution, parameters, employees, benchmarking, ai, risks, recommendations } = data;
            const avgScore = parseFloat(summary?.average_score || 0);
            const getLevel = (s) => {
                if (s >= 90) return { label: 'Excellent', color: '#10b981' };
                if (s >= 75) return { label: 'Very Good', color: '#3b82f6' };
                if (s >= 60) return { label: 'Good', color: '#8b5cf6' };
                if (s >= 45) return { label: 'Satisfactory', color: '#f59e0b' };
                return { label: 'Needs Improvement', color: '#ef4444' };
            };
            const level = getLevel(avgScore);
            const trendDiff = trend ? parseFloat(trend.change) : null;
            const trendUp = trendDiff >= 0;
            const sortedEmps = [...(employees || [])].sort((a, b) => parseFloat(b.total_score || 0) - parseFloat(a.total_score || 0));
            const top3 = sortedEmps.slice(0, 3);
            const bottom3 = [...sortedEmps].reverse().slice(0, 3);
            const params = parameters || [];
            const strongParam = params[0];
            const weakParam = params[params.length - 1];
            const bench = benchmarking || {};
            const dist = distribution || {};
            const totalDist = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

            html = `
            <div style="font-family:Arial,sans-serif;color:#000000;max-width:820px;margin:0 auto;background:white;padding:50px 55px;font-size:14px;line-height:1.6;">

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <div style="height:20px;"></div>
                <h1 style="font-size:26px;font-weight:900;color:#000000;margin:0 0 4px;text-transform:uppercase;">TEAM PERFORMANCE REPORT</h1>
                <div style="border-top:3px solid #000000;margin-top:14px;padding-top:10px;">
                  <span style="font-size:13px;font-weight:700;color:#000000;text-transform:uppercase;letter-spacing:1px;">${team_info?.cycle_name || ''} — Final Report</span>
                </div>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">1. Executive Summary</h2>
                <table style="width:100%;font-size:14px;border-collapse:collapse;">
                  <tr><td style="padding:5px 0;width:200px;"><strong>Team Name:</strong></td><td>${team_info?.team_name || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>Department:</strong></td><td>${team_info?.department || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>Line Manager:</strong></td><td>${team_info?.manager_name || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>Evaluation Cycle:</strong></td><td>${team_info?.cycle_name || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>Cycle Period:</strong></td><td>${team_info?.duration || 'N/A'}</td></tr>
                </table>
                <div style="height:12px;"></div>
                <div style="font-size:15px;"><strong>Team Average Performance: ${avgScore.toFixed(1)}% (${level.label})</strong></div>
                <div style="font-size:14px;margin-top:5px;">Completion Rate: <strong>${summary?.completion_percentage || 0}%</strong></div>
                ${trendDiff !== null ? `<div style="font-size:14px;margin-top:4px;"><strong>Trend: ${trendUp ? '+' : ''}${trendDiff}%</strong> ${trendUp ? 'improvement' : 'decline'} from last cycle ${trendUp ? '↑' : '↓'}</div>` : ''}
                ${summary?.team_rank ? `<div style="font-size:14px;margin-top:4px;">Team Rank: <strong>${summary.team_rank}${summary.team_rank===1?'st':summary.team_rank===2?'nd':summary.team_rank===3?'rd':'th'} out of ${summary.total_teams} teams</strong></div>` : ''}
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">2. Team KPI Cards</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Metric</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Value</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Status</th></tr></thead>
                  <tbody>
                    <tr><td style="padding:9px;border:1px solid #ddd;font-weight:600;">Average Score</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${avgScore.toFixed(1)}%</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${level.label}</td></tr>
                    <tr style="background:#f9f9f9;"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">Total Team Members</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${summary?.total_members || 0}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">—</td></tr>
                    <tr><td style="padding:9px;border:1px solid #ddd;font-weight:600;">Completed Evaluations</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${summary?.completed || 0}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${summary?.completion_percentage || 0}%</td></tr>
                    <tr style="background:#f9f9f9;"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">Pending Evaluations</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${summary?.pending || 0}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;color:${(summary?.pending||0)>0?'#ef4444':'#10b981'};">${(summary?.pending||0)>0?'Action Required':'Complete'}</td></tr>
                  </tbody>
                </table>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">3. Team Performance Distribution</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Performance Level</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Employees</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Percentage</th><th style="padding:10px;text-align:left;border:1px solid #ccc;">Visual</th></tr></thead>
                  <tbody>
                    ${[['Excellent','90%+','#10b981'],['Good','75–89%','#3b82f6'],['Average','60–74%','#f59e0b'],['Poor','<60%','#ef4444']].map((r,i)=>{
                        const count=dist[r[0]]||0; const pct=Math.round((count/totalDist)*100);
                        return `<tr style="background:${i%2===0?'#fff':'#f9f9f9'};"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">${r[0]} (${r[1]})</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${count}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${pct}%</td><td style="padding:9px;border:1px solid #ddd;"><div style="background:#e5e7eb;height:10px;border-radius:4px;"><div style="width:${pct}%;background:${r[2]};height:100%;border-radius:4px;"></div></div></td></tr>`;
                    }).join('')}
                  </tbody>
                </table>
                <div style="font-size:13px;margin-top:8px;"><strong>Insight:</strong> ${(dist.Excellent||0)+(dist.Good||0)} out of ${totalDist} employees (${Math.round(((dist.Excellent||0)+(dist.Good||0))/totalDist*100)}%) performing at Good or Excellent level.</div>
              </div>

              ${params.length > 0 ? `
              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">4. Parameter-Level Team Analysis</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Parameter</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Team Avg</th><th style="padding:10px;text-align:left;border:1px solid #ccc;">Visual</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Insight</th></tr></thead>
                  <tbody>
                    ${params.map((p,i)=>{const sc=parseFloat(p.avg_score);const isS=i===0;const isW=i===params.length-1;return `<tr style="background:${i%2===0?'#fff':'#f9f9f9'};"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">${p.name}</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${sc.toFixed(0)}%</td><td style="padding:9px;border:1px solid #ddd;"><div style="background:#e5e7eb;height:10px;border-radius:4px;"><div style="width:${Math.min(100,sc)}%;background:${isS?'#10b981':isW?'#ef4444':'#3b82f6'};height:100%;border-radius:4px;"></div></div></td><td style="padding:9px;text-align:center;border:1px solid #ddd;font-size:11px;font-weight:700;color:${isS?'#10b981':isW?'#ef4444':'#000'};">${isS?'Top Strength':isW?'Weak Area':''}</td></tr>`;}).join('')}
                  </tbody>
                </table>
                <div style="font-size:13px;margin-top:8px;"><strong>Key Insight:</strong> ${strongParam?`Strong Area: ${strongParam.name} (${strongParam.avg_score}%)`:''}${weakParam&&weakParam!==strongParam?` | Weak Area: ${weakParam.name} (${weakParam.avg_score}%) needs focus.`:''}</div>
              </div>` : ''}

              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">5. Top Performers & Employees Needing Attention</h2>
                <div style="display:flex;gap:20px;">
                  <div style="flex:1;">
                    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">Top Performers</div>
                    ${(()=>{const topEmps=sortedEmps.filter(e=>parseFloat(e.total_score||0)>=75&&e.evaluation_status==='completed').slice(0,3);return topEmps.length>0?`<ul style="margin:0;padding-left:20px;font-size:13px;line-height:2;">${topEmps.map(e=>`<li><strong>${e.name}</strong> — ${parseFloat(e.total_score||0).toFixed(1)}% (${e.performance_level||''})</li>`).join('')}</ul>`:`<div style="font-size:13px;color:#555;">No top performers in this cycle.</div>`;})()}
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:14px;font-weight:700;margin-bottom:8px;">Needs Attention</div>
                    ${(()=>{const poorEmps=sortedEmps.filter(e=>parseFloat(e.total_score||0)<60&&e.evaluation_status==='completed');return poorEmps.length>0?`<ul style="margin:0;padding-left:20px;font-size:13px;line-height:2;">${poorEmps.map(e=>`<li><strong>${e.name}</strong> — ${parseFloat(e.total_score||0).toFixed(1)}% (${e.performance_level||''})</li>`).join('')}</ul>`:`<div style="font-size:13px;color:#10b981;font-weight:600;">✅ All employees are performing at an acceptable level.</div>`;})()}
                  </div>
                </div>
              </div>

              ${trend ? `
              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">6. Trend Across Cycles</h2>
                <div style="display:flex;align-items:center;gap:30px;background:#f5f5f5;border-radius:6px;padding:16px;border:1px solid #ddd;">
                  <div style="text-align:center;"><div style="font-size:12px;color:#555;">Previous Cycle</div><div style="font-size:24px;font-weight:800;">${trend.previous_score}%</div><div style="font-size:11px;color:#777;">${trend.previous_cycle}</div></div>
                  <div style="flex:1;text-align:center;"><div style="font-size:32px;font-weight:900;">${trendUp?'↑':'↓'} ${Math.abs(trendDiff)}%</div><div style="font-size:12px;">${trendUp?'Improvement':'Decline'} from last cycle</div></div>
                  <div style="text-align:center;"><div style="font-size:12px;color:#555;">Current Cycle</div><div style="font-size:24px;font-weight:800;">${avgScore.toFixed(1)}%</div><div style="font-size:11px;color:#777;">${team_info?.cycle_name}</div></div>
                </div>
                <div style="font-size:13px;margin-top:8px;"><strong>Insight:</strong> ${trendUp?'Consistent upward growth trend.':'Performance declined — requires attention.'}</div>
              </div>` : ''}

              ${(bench.dept_avg||bench.org_avg) ? `
              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">7. Benchmark Comparison</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Benchmark</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Score</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Difference vs Team</th></tr></thead>
                  <tbody>
                    <tr><td style="padding:9px;border:1px solid #ddd;font-weight:700;">Team Average</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${avgScore.toFixed(1)}%</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">—</td></tr>
                    ${bench.dept_avg?`<tr style="background:#f9f9f9;"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">Department Average</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${bench.dept_avg}%</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${avgScore>=bench.dept_avg?'+':''}${(avgScore-bench.dept_avg).toFixed(1)}%</td></tr>`:''}
                    ${bench.org_avg?`<tr><td style="padding:9px;border:1px solid #ddd;font-weight:600;">Company Average</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${bench.org_avg}%</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${avgScore>=bench.org_avg?'+':''}${(avgScore-bench.org_avg).toFixed(1)}%</td></tr>`:''}
                  </tbody>
                </table>
              </div>` : ''}

              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">8. Evaluation Health & Workload</h2>
                <ul style="font-size:14px;line-height:2;margin:0;padding-left:20px;">
                  <li>Total team members: <strong>${summary?.total_members||0}</strong></li>
                  <li>Completed evaluations: <strong>${summary?.completed||0}</strong></li>
                  <li>Pending evaluations: <strong>${summary?.pending||0}</strong></li>
                  <li>On-time completion rate: <strong>${summary?.completion_percentage||0}%</strong></li>
                </ul>
                <div style="font-size:13px;margin-top:8px;"><strong>Insight:</strong> ${(summary?.pending||0)===0?'Evaluation process is complete with 100% completion rate.':`${summary?.pending} pending evaluation(s) should be completed to ensure accurate data.`}</div>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">9. Risk Detection</h2>
                ${(risks||[]).length>0?`<ul style="font-size:13px;line-height:2;margin:0;padding-left:20px;">${(risks||[]).map(r=>`<li>⚠ ${r}</li>`).join('')}</ul>`:`<div style="font-size:14px;">✅ No significant risks detected for this team.</div>`}
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">10. Manager Recommendations</h2>
                <ol style="font-size:14px;line-height:2;margin:0;padding-left:22px;">${(recommendations||[]).map(r=>`<li>${r}</li>`).join('')}</ol>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;margin-top:120px;">
                <div style="height:10px;"></div>
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">11. Team Members Detailed Table</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Employee Name</th><th style="padding:10px;text-align:left;border:1px solid #ccc;">Role</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Score</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Rating</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Status</th></tr></thead>
                  <tbody>
                    ${sortedEmps.map((e,i)=>{const sc=parseFloat(e.total_score||0);const lv=getLevel(sc);return `<tr style="background:${i%2===0?'#fff':'#f9f9f9'};"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">${e.name}</td><td style="padding:9px;border:1px solid #ddd;">${e.role||'—'}</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${sc>0?sc.toFixed(1)+'%':'—'}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${e.performance_level||lv.label}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;font-size:11px;font-weight:700;color:${e.evaluation_status==='completed'?'#10b981':'#f59e0b'};">${(e.evaluation_status||'').toUpperCase()}</td></tr>`;}).join('')}
                  </tbody>
                </table>
              </div>

              <div data-section style="border-top:2px solid #000;padding:16px 0 0;background:white;">
                <div style="font-size:13px;font-weight:700;color:#000;margin-bottom:4px;">End of Report</div>
                <div style="font-size:12px;font-style:italic;">Generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'2-digit'})} — Confidential – Management Use Only</div>
              </div>

            </div>
            `;
        } else if (type === 'department-report') {
            const { dept_info, summary, distribution, teams, top_team, bottom_team, parameters, benchmarking, risks, recommendations } = data;
            const avgScore = parseFloat(summary?.avg_score || 0);
            const getLevel = (s) => {
                if (s >= 90) return 'Excellent';
                if (s >= 80) return 'Very Good';
                if (s >= 70) return 'Good';
                if (s >= 60) return 'Satisfactory';
                return 'Needs Improvement';
            };
            const trendUp = summary?.trend_change >= 0;
            const totalDist = Object.values(distribution || {}).reduce((a, b) => a + b, 0) || 1;
            const cycleStart = dept_info?.start_date ? new Date(dept_info.start_date).toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'}) : 'N/A';
            const cycleEnd = dept_info?.end_date ? new Date(dept_info.end_date).toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'}) : 'N/A';

            html = `
            <div style="font-family:Arial,sans-serif;color:#000000;max-width:820px;margin:0 auto;background:white;padding:50px 55px;font-size:14px;line-height:1.6;">

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h1 style="font-size:26px;font-weight:900;color:#000000;margin:0 0 4px;text-transform:uppercase;">DEPARTMENT PERFORMANCE REPORT</h1>
                <div style="border-top:3px solid #000000;margin-top:14px;padding-top:10px;">
                  <span style="font-size:13px;font-weight:700;color:#000000;text-transform:uppercase;letter-spacing:1px;">${dept_info?.cycle_name || ''} — Final Report</span>
                </div>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">1. Executive Summary</h2>
                <table style="width:100%;font-size:14px;border-collapse:collapse;">
                  <tr><td style="padding:5px 0;width:220px;"><strong>Department Name:</strong></td><td>${dept_info?.dept_name || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>Total Teams:</strong></td><td>${dept_info?.total_teams || 0}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>Total Employees:</strong></td><td>${dept_info?.total_employees || 0}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>Evaluation Cycle:</strong></td><td>${dept_info?.cycle_name || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;"><strong>Cycle Period:</strong></td><td>${cycleStart} – ${cycleEnd}</td></tr>
                </table>
                <div style="height:12px;"></div>
                <div style="font-size:15px;"><strong>Department Average Performance: ${avgScore.toFixed(1)}% (${getLevel(avgScore)})</strong></div>
                <div style="font-size:14px;margin-top:5px;">Completion Rate: <strong>${summary?.completion_rate || 0}%</strong></div>
                ${summary?.trend_change !== null && summary?.trend_change !== undefined ? `<div style="font-size:14px;margin-top:4px;"><strong>Trend: ${trendUp ? '+' : ''}${summary.trend_change}%</strong> ${trendUp ? 'improvement' : 'decline'} from last cycle ${trendUp ? '↑' : '↓'}</div>` : ''}
                ${dept_info?.dept_rank ? `<div style="font-size:14px;margin-top:4px;">Rank: <strong>${dept_info.dept_rank}${dept_info.dept_rank===1?'st':dept_info.dept_rank===2?'nd':dept_info.dept_rank===3?'rd':'th'} out of ${dept_info.total_depts} departments</strong></div>` : ''}
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">2. KPI Cards</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Metric</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Value</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Status</th></tr></thead>
                  <tbody>
                    <tr><td style="padding:9px;border:1px solid #ddd;font-weight:600;">⭐ Best Team</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${teams&&teams.length>0?`${teams[0].name} — ${teams[0].avg_score}%`:'—'}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;color:#10b981;font-weight:700;">${teams&&teams.length>0?getLevel(teams[0].avg_score):'—'}</td></tr>
                    <tr style="background:#f9f9f9;"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">⚠ Lowest Team</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${teams&&teams.length>1?`${teams[teams.length-1].name} — ${teams[teams.length-1].avg_score}%`:'—'}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;color:#ef4444;font-weight:700;">${teams&&teams.length>1?getLevel(teams[teams.length-1].avg_score):'—'}</td></tr>
                    <tr><td style="padding:9px;border:1px solid #ddd;font-weight:600;">Total Teams</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${dept_info?.total_teams || 0}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">—</td></tr>
                    <tr style="background:#f9f9f9;"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">Avg Department Score</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${avgScore.toFixed(1)}%</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${getLevel(avgScore)}</td></tr>
                  </tbody>
                </table>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">3. Department Score Distribution</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Performance Level</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Employees</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Percentage</th><th style="padding:10px;text-align:left;border:1px solid #ccc;">Visual</th></tr></thead>
                  <tbody>
                    ${[['Excellent','≥90%','#10b981'],['Very Good','80–89%','#3b82f6'],['Good','70–79%','#8b5cf6'],['Needs Attention','<70%','#ef4444']].map((r,i)=>{
                        const count=(distribution||{})[r[0]]||0; const pct=Math.round((count/totalDist)*100);
                        return `<tr style="background:${i%2===0?'#fff':'#f9f9f9'};"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">${r[0]} (${r[1]})</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${count}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${pct}%</td><td style="padding:9px;border:1px solid #ddd;"><div style="background:#e5e7eb;height:10px;border-radius:4px;"><div style="width:${pct}%;background:${r[2]};height:100%;border-radius:4px;"></div></div></td></tr>`;
                    }).join('')}
                  </tbody>
                </table>
                <div style="font-size:13px;margin-top:8px;"><strong>Insight:</strong> ${(()=>{const good=((distribution||{})['Excellent']||0)+((distribution||{})['Very Good']||0)+((distribution||{})['Good']||0);const pct=Math.round((good/totalDist)*100);return `${pct}% of employees performing at Good or above. ${(distribution||{})['Needs Attention']>0?`${(distribution||{})['Needs Attention']} employee(s) need immediate attention.`:''}`;})()}</div>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:6px;">4. Team Comparison</h2>
                <p style="font-size:12px;color:#555555;margin:0 0 14px;">Comparison of team performance within this department</p>

                ${(()=>{
                  if(!teams||teams.length===0) return `<div style="font-size:13px;color:#888;padding:20px 0;">No team data available.</div>`;
                  const best=teams[0]; const worst=teams[teams.length-1];
                  const gap=best&&worst?(best.avg_score-worst.avg_score).toFixed(1):0;
                  const noHigh=teams.every(t=>t.avg_score<80);
                  const insightText=noHigh
                    ?'⚠ No high-performing teams (≥80%) in this cycle.'
                    :best&&worst&&best.name!==worst.name
                      ?`📊 ${best.name} leads with ${best.avg_score}%, while ${worst.name} lags at ${worst.avg_score}% — a gap of ${gap}%.`
                      :`📊 ${best?.name} is the only team with ${best?.avg_score}%.`;
                  const barRows=teams.map(t=>{
                    const color=t.avg_score>=80?'#10b981':t.avg_score>=60?'#f59e0b':'#ef4444';
                    const barW=Math.round(t.avg_score*2.8);
                    const compRate=t.members>0?Math.round((t.completed/t.members)*100):0;
                    return `<div style="display:flex;align-items:center;margin-bottom:12px;font-size:13px;">
                      <div style="width:160px;font-weight:600;color:#000;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${t.name}</div>
                      <div style="flex:1;background:#e5e7eb;height:20px;border-radius:4px;margin:0 10px;position:relative;">
                        <div style="width:${barW}px;max-width:100%;background:${color};height:100%;border-radius:4px;"></div>
                      </div>
                      <div style="width:50px;font-weight:700;color:#000;">${t.avg_score>0?t.avg_score.toFixed(1)+'%':'—'}</div>
                      <div style="width:80px;font-size:11px;color:#555;text-align:right;">${t.members} members</div>
                    </div>`;
                  }).join('');
                  return `
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#334155;">${insightText}</div>
                    <div style="margin-bottom:10px;">${barRows}</div>
                    <div style="display:flex;gap:18px;font-size:11px;color:#555;margin-top:6px;">
                      <span><span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:2px;margin-right:4px;"></span>High (≥80%)</span>
                      <span><span style="display:inline-block;width:10px;height:10px;background:#f59e0b;border-radius:2px;margin-right:4px;"></span>Average (60–79%)</span>
                      <span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;margin-right:4px;"></span>Needs Attention (&lt;60%)</span>
                    </div>`;
                })()}
              </div>

              ${(parameters||[]).length>0?`
              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">5. Parameter-Level Department Analysis</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Parameter</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Dept Avg</th><th style="padding:10px;text-align:left;border:1px solid #ccc;">Visual</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Insight</th></tr></thead>
                  <tbody>
                    ${(parameters||[]).map((p,i)=>{const sc=parseFloat(p.avg_score);const isS=i===0;const isW=i===parameters.length-1;return `<tr style="background:${i%2===0?'#fff':'#f9f9f9'};"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">${p.name}</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${sc.toFixed(0)}%</td><td style="padding:9px;border:1px solid #ddd;"><div style="background:#e5e7eb;height:10px;border-radius:4px;"><div style="width:${Math.min(100,sc)}%;background:${isS?'#10b981':isW?'#ef4444':'#3b82f6'};height:100%;border-radius:4px;"></div></div></td><td style="padding:9px;text-align:center;border:1px solid #ddd;font-size:11px;font-weight:700;color:${isS?'#10b981':isW?'#ef4444':'#000'};">${isS?'Strongest':isW?'Weakest':''}</td></tr>`;}).join('')}
                  </tbody>
                </table>
                <div style="font-size:13px;margin-top:8px;"><strong>Key Insight:</strong> ${parameters[0]?`Strong Area: ${parameters[0].name} (${parameters[0].avg_score}%).`:''}${parameters.length>1?` Weak Area: ${parameters[parameters.length-1].name} (${parameters[parameters.length-1].avg_score}%) needs department-wide focus.`:''}</div>
              </div>` : ''}

              ${summary?.trend_change!==null&&summary?.trend_change!==undefined?`
              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">6. Trend Across Cycles</h2>
                <div style="display:flex;align-items:center;gap:30px;background:#f5f5f5;border-radius:6px;padding:16px;border:1px solid #ddd;">
                  <div style="text-align:center;"><div style="font-size:12px;color:#555;">Previous Cycle</div><div style="font-size:24px;font-weight:800;">${summary.prev_cycle_score}%</div><div style="font-size:11px;color:#777;">${summary.prev_cycle_name||''}</div></div>
                  <div style="flex:1;text-align:center;"><div style="font-size:32px;font-weight:900;">${trendUp?'↑':'↓'} ${Math.abs(summary.trend_change)}%</div><div style="font-size:12px;">${trendUp?'Improvement':'Decline'} from last cycle</div></div>
                  <div style="text-align:center;"><div style="font-size:12px;color:#555;">Current Cycle</div><div style="font-size:24px;font-weight:800;">${avgScore.toFixed(1)}%</div><div style="font-size:11px;color:#777;">${dept_info?.cycle_name||''}</div></div>
                </div>
                <div style="font-size:13px;margin-top:8px;"><strong>Insight:</strong> ${trendUp?'Positive growth trend — department is improving.':'Performance declined — root cause analysis recommended.'}</div>
              </div>` : ''}

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">7. Benchmark Comparison</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Benchmark</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Score</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Difference</th></tr></thead>
                  <tbody>
                    <tr><td style="padding:9px;border:1px solid #ddd;font-weight:700;">Department Average</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${avgScore.toFixed(1)}%</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">—</td></tr>
                    ${benchmarking?.org_avg?`<tr style="background:#f9f9f9;"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">Company Average</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${benchmarking.org_avg}%</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${avgScore>=benchmarking.org_avg?'+':''}${(avgScore-benchmarking.org_avg).toFixed(1)}%</td></tr>`:''}
                  </tbody>
                </table>
                <div style="font-size:13px;margin-top:8px;"><strong>Conclusion:</strong> ${benchmarking?.org_avg?`${dept_info?.dept_name} is performing ${avgScore>=benchmarking.org_avg?'above':'below'} the company average by ${Math.abs((avgScore-benchmarking.org_avg).toFixed(1))}%.`:'Benchmark data not available.'}</div>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">8. Top & Bottom Teams</h2>
                <div style="display:flex;gap:20px;">
                  <div style="flex:1;background:#f0fff4;border:1px solid #bbf7d0;border-radius:6px;padding:14px;">
                    <div style="font-size:14px;font-weight:700;margin-bottom:6px;">⭐ Top Team</div>
                    ${top_team?`<div style="font-size:15px;font-weight:800;">${top_team.name}</div><div style="font-size:13px;margin-top:4px;">Score: <strong>${top_team.avg_score}%</strong> | Members: ${top_team.members} | Completion: ${top_team.completion_rate}%</div>`:'<div style="font-size:13px;color:#555;">No team scoring above 80% in this cycle.</div>'}
                  </div>
                  <div style="flex:1;background:#fff5f5;border:1px solid #fecaca;border-radius:6px;padding:14px;">
                    <div style="font-size:14px;font-weight:700;margin-bottom:6px;">⚠ Needs Attention</div>
                    ${bottom_team?`<div style="font-size:15px;font-weight:800;">${bottom_team.name}</div><div style="font-size:13px;margin-top:4px;">Score: <strong>${bottom_team.avg_score}%</strong> | Members: ${bottom_team.members} | Completion: ${bottom_team.completion_rate}%</div><div style="font-size:12px;margin-top:4px;color:#ef4444;">Below acceptable threshold — urgent intervention required.</div>`:'<div style="font-size:13px;color:#10b981;">✅ All teams performing above 60% — no critical concerns.</div>'}
                  </div>
                </div>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">9. Risk Detection</h2>
                ${(risks||[]).length>0?`<ul style="font-size:13px;line-height:2;margin:0;padding-left:20px;">${(risks||[]).map(r=>`<li>⚠ ${r}</li>`).join('')}</ul>`:`<div style="font-size:14px;">✅ No significant risks detected for this department.</div>`}
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">10. Actionable Recommendations</h2>
                <ol style="font-size:14px;line-height:2;margin:0;padding-left:22px;">${(recommendations||[]).map(r=>`<li>${r}</li>`).join('')}</ol>
              </div>

              <div data-section style="margin-bottom:30px;padding:0;background:white;">
                <h2 style="font-size:18px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:14px;">11. Teams Detailed Table</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead><tr style="background:#f0f0f0;border-bottom:2px solid #999;"><th style="padding:10px;text-align:left;border:1px solid #ccc;">Team Name</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Avg Score</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Members</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Completion Rate</th><th style="padding:10px;text-align:center;border:1px solid #ccc;">Status</th></tr></thead>
                  <tbody>
                    ${(teams||[]).map((t,i)=>{const lv=getLevel(t.avg_score);return `<tr style="background:${i%2===0?'#fff':'#f9f9f9'};"><td style="padding:9px;border:1px solid #ddd;font-weight:600;">${t.name}</td><td style="padding:9px;text-align:center;font-weight:700;border:1px solid #ddd;">${t.avg_score>0?t.avg_score.toFixed(1)+'%':'—'}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${t.members}</td><td style="padding:9px;text-align:center;border:1px solid #ddd;">${t.completion_rate}%</td><td style="padding:9px;text-align:center;border:1px solid #ddd;font-size:11px;font-weight:700;">${lv}</td></tr>`;}).join('')}
                  </tbody>
                </table>
              </div>

              <div data-section style="border-top:2px solid #000;padding:16px 0 0;background:white;">
                <div style="font-size:13px;font-weight:700;color:#000;margin-bottom:4px;">End of Report</div>
                <div style="font-size:12px;font-style:italic;">Generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'2-digit'})} — Confidential – Leadership Use Only</div>
              </div>

            </div>
            `;
        }

        container.innerHTML = html;

        // Give browser time to render fonts and layout
        await new Promise(r => setTimeout(r, 400));

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10; // 10mm left/right margin
        const contentWidth = pageWidth - (margin * 2);

        if (type === 'individual-assessment') {
            // Render each section separately to avoid mid-content page breaks
            const sections = container.querySelectorAll('div[data-section]');

            if (sections.length === 0) {
                // Fallback: render whole container with clean page breaks
                const canvas = await html2canvas(container, {
                    scale: 2, useCORS: true, logging: false,
                    backgroundColor: '#ffffff', windowWidth: 900
                });
                const imgData = canvas.toDataURL('image/png');
                const imgW = contentWidth;
                const imgH = (canvas.height * imgW) / canvas.width;
                let heightLeft = imgH;
                let pos = 0;
                pdf.addImage(imgData, 'PNG', margin, pos, imgW, imgH);
                heightLeft -= pageHeight;
                while (heightLeft > 0) {
                    pos -= pageHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', margin, pos, imgW, imgH);
                    heightLeft -= pageHeight;
                }
            } else {
                let currentY = 0;
                let isFirstPage = true;

                for (const section of sections) {
                    const canvas = await html2canvas(section, {
                        scale: 2, useCORS: true, logging: false,
                        backgroundColor: '#ffffff', windowWidth: 900
                    });
                    const imgData = canvas.toDataURL('image/png');
                    const imgW = contentWidth;
                    const imgH = (canvas.height * imgW) / canvas.width;

                    // If section is taller than a full page, split it across pages
                    if (imgH > pageHeight) {
                        if (!isFirstPage && currentY > 0) {
                            pdf.addPage();
                            currentY = 0;
                        }
                        let remaining = imgH;
                        let srcY = 0;
                        while (remaining > 0) {
                            const sliceH = Math.min(remaining, pageHeight - currentY);
                            pdf.addImage(imgData, 'PNG', margin, currentY - srcY, imgW, imgH);
                            remaining -= sliceH;
                            srcY += sliceH;
                            if (remaining > 0) {
                                pdf.addPage();
                                currentY = 0;
                            } else {
                                currentY += sliceH;
                            }
                        }
                    } else {
                        // If section doesn't fit on current page, start a new page
                        if (!isFirstPage && currentY + imgH > pageHeight - 5) {
                            pdf.addPage();
                            currentY = 0;
                        }
                        pdf.addImage(imgData, 'PNG', margin, currentY, imgW, imgH);
                        currentY += imgH + 3;
                    }
                    isFirstPage = false;
                }
            }
        } else {
            // For other report types (team-report, admin-summary): standard multi-page rendering
            // Also handles team-report which uses data-section
            const sections = container.querySelectorAll('div[data-section]');

            if (sections.length > 0) {
                let currentY = 0;
                let isFirstPage = true;
                for (const section of sections) {
                    const canvas = await html2canvas(section, {
                        scale: 2, useCORS: true, logging: false,
                        backgroundColor: '#ffffff', windowWidth: 900
                    });
                    const imgData = canvas.toDataURL('image/png');
                    const imgW = contentWidth;
                    const imgH = (canvas.height * imgW) / canvas.width;

                    if (imgH > pageHeight) {
                        if (!isFirstPage && currentY > 0) { pdf.addPage(); currentY = 0; }
                        let remaining = imgH;
                        let srcY = 0;
                        while (remaining > 0) {
                            const sliceH = Math.min(remaining, pageHeight - currentY);
                            pdf.addImage(imgData, 'PNG', margin, currentY - srcY, imgW, imgH);
                            remaining -= sliceH;
                            srcY += sliceH;
                            if (remaining > 0) { pdf.addPage(); currentY = 0; }
                            else { currentY += sliceH; }
                        }
                    } else {
                        if (!isFirstPage && currentY + imgH > pageHeight - 5) { pdf.addPage(); currentY = 0; }
                        pdf.addImage(imgData, 'PNG', margin, currentY, imgW, imgH);
                        currentY += imgH + 3;
                    }
                    isFirstPage = false;
                }
            } else {
                const canvas = await html2canvas(container, {
                    scale: 2, useCORS: true, logging: false,
                    backgroundColor: '#ffffff', windowWidth: 900,
                    scrollX: 0, scrollY: 0
                });
                const imgData = canvas.toDataURL('image/png');
                const imgW = contentWidth;
                const imgH = (canvas.height * imgW) / canvas.width;
                let heightLeft = imgH;
                let pos = 0;
                pdf.addImage(imgData, 'PNG', margin, pos, imgW, imgH);
                heightLeft -= pageHeight;
                while (heightLeft > 0) {
                    pos -= pageHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', margin, pos, imgW, imgH);
                    heightLeft -= pageHeight;
                }
            }
        }

        const fileName = `${type.replace('-', '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

    } catch (error) {
        console.error('PDF Generation failed:', error);
        throw error;
    } finally {
        document.body.removeChild(container);
    }
};
