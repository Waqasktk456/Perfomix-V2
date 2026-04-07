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
            const params = performance?.parameters || [];
            const bench = benchmarking || {};
            const aiFlags = ai?.flags || [];
            const inconsistencies = aiFlags.filter(f => f.type === 'INCONSISTENCY');
            const weakFlags = aiFlags.filter(f => f.type === 'WEAK_FEEDBACK' || f.type === 'MISSING_FEEDBACK');
            const sortedParams = [...params].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
            const top2 = sortedParams.slice(0, 2);
            const bottom2 = sortedParams.slice(-2).reverse();
            const hasTrend = performance?.previous_score != null;
            const prevScore = parseFloat(performance?.previous_score || 0);
            const trendDiff = hasTrend ? (overallScore - prevScore).toFixed(1) : null;
            const trendUp = parseFloat(trendDiff) >= 0;
            const vLabel = verdict?.label || 'Meets Expectations';
            const cycleStart = cycle_details?.start ? new Date(cycle_details.start).toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'}) : 'N/A';
            const cycleEnd = cycle_details?.end ? new Date(cycle_details.end).toLocaleDateString('en-US',{month:'long',day:'2-digit',year:'numeric'}) : 'N/A';
            const recActions = bottom2.map(p => `Targeted development in ${p.parameter_name}`);
            if (overallScore >= 75) recActions.unshift('Consider for leadership development program');

            // Score to percentage: rating 1-5 maps to 20-100%
            const ratingToScore = (r) => r ? (parseFloat(r) * 20).toFixed(0) + '%' : '-';

            html = `
            <div style="font-family:Arial,sans-serif;color:#000000;max-width:820px;margin:0 auto;background:white;padding:50px 55px;font-size:14px;line-height:1.6;">

              <!-- TITLE -->
              <div data-section style="margin-bottom:30px;padding:0 55px;background:white;">
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
                  <tr><td style="padding:5px 0;color:#000000;"><strong>Team:</strong></td><td style="padding:5px 0;color:#000000;">${employee_details?.team || 'N/A'}</td></tr>
                </table>
                <div style="height:10px;"></div>
                <table style="width:100%;font-size:14px;border-collapse:collapse;">
                  <tr><td style="padding:5px 0;color:#000000;width:200px;"><strong>Performance Cycle:</strong></td><td style="padding:5px 0;color:#000000;">${cycle_details?.name || 'N/A'}</td></tr>
                  <tr><td style="padding:5px 0;color:#000000;"><strong>Cycle Period:</strong></td><td style="padding:5px 0;color:#000000;">${cycleStart} – ${cycleEnd}</td></tr>
                  <tr><td style="padding:5px 0;color:#000000;"><strong>Evaluator:</strong></td><td style="padding:5px 0;color:#000000;">${performance?.evaluator_name || 'N/A'}</td></tr>
                </table>
                <div style="height:14px;"></div>
                <div style="font-size:15px;color:#000000;"><strong>Overall Performance: ${overallScore.toFixed(1)}% (${performance?.rating_name || vLabel})</strong></div>
                ${bench.percentile_rank != null ? `<div style="font-size:14px;margin-top:6px;color:#000000;">You are in the <strong>Top ${100 - bench.percentile_rank}%</strong> of employees company-wide.</div>` : ''}
                ${hasTrend ? `<div style="font-size:14px;margin-top:5px;color:#000000;"><strong>Performance ${trendUp ? 'improved' : 'declined'} by ${trendUp ? '+' : ''}${trendDiff}%</strong> from the previous cycle. ${trendUp ? '↑' : '↓'}</div>` : ''}
              </div>

              <!-- SECTION 2: PERFORMANCE BREAKDOWN -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;">
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">2. Performance Breakdown</h2>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead>
                    <tr style="background:#f0f0f0;border-bottom:2px solid #999999;">
                      <th style="padding:10px 8px;text-align:left;font-weight:700;color:#000000;border:1px solid #cccccc;">Parameter</th>
                      <th style="padding:10px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #cccccc;">Weight</th>
                      <th style="padding:10px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #cccccc;">Rating (1–5)</th>
                      <th style="padding:10px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #cccccc;">Score (%)</th>
                      <th style="padding:10px 8px;text-align:left;font-weight:700;color:#000000;border:1px solid #cccccc;">Feedback</th>
                      <th style="padding:10px 8px;text-align:left;font-weight:700;color:#000000;border:1px solid #cccccc;">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${params.map((p, i) => {
                        const rating = parseFloat(p.rating || 0);
                        const scoreFromRating = rating > 0 ? (rating * 20).toFixed(0) : parseFloat(p.score || 0).toFixed(0);
                        const rowBg = i % 2 === 0 ? '#ffffff' : '#f9f9f9';
                        return `<tr style="background:${rowBg};">
                          <td style="padding:9px 8px;font-weight:600;color:#000000;border:1px solid #dddddd;">${p.parameter_name}</td>
                          <td style="padding:9px 8px;text-align:center;color:#000000;border:1px solid #dddddd;">${p.weightage}%</td>
                          <td style="padding:9px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${p.rating || '-'} / 5</td>
                          <td style="padding:9px 8px;text-align:center;font-weight:700;color:#000000;border:1px solid #dddddd;">${scoreFromRating}%</td>
                          <td style="padding:9px 8px;color:#000000;font-size:12px;line-height:1.5;border:1px solid #dddddd;">${p.feedback || p.parameter_remarks || '—'}</td>
                          <td style="padding:9px 8px;color:#000000;font-size:12px;line-height:1.5;border:1px solid #dddddd;">${p.recommendation || '—'}</td>
                        </tr>`;
                    }).join('')}
                    <tr style="background:#f0f0f0;font-weight:700;">
                      <td colspan="3" style="padding:10px 8px;text-align:right;color:#000000;border:1px solid #cccccc;font-size:14px;">OVERALL WEIGHTED SCORE:</td>
                      <td style="padding:10px 8px;text-align:center;color:#000000;border:1px solid #cccccc;font-size:15px;font-weight:900;">${overallScore.toFixed(1)}%</td>
                      <td colspan="2" style="border:1px solid #cccccc;"></td>
                    </tr>
                  </tbody>
                </table>
                <div style="font-size:12px;color:#000000;margin-top:8px;"><strong>Note:</strong> Score (%) = Rating × 20. Rating 5 = 100%, Rating 4 = 80%, Rating 3 = 60%, Rating 2 = 40%, Rating 1 = 20%</div>
              </div>

              <!-- SECTION 3: PERFORMANCE VISUALIZATION -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;">
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">3. Performance Visualization</h2>
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:12px;">A. Parameter Performance</div>
                ${sortedParams.map(p => {
                    const rating = parseFloat(p.rating || 0);
                    const pct = rating > 0 ? rating * 20 : Math.min(100, parseFloat(p.score || 0));
                    const barW = Math.round(pct * 2.8);
                    return `<div style="display:flex;align-items:center;margin-bottom:8px;font-size:13px;">
                      <div style="width:220px;color:#000000;font-weight:500;">${p.parameter_name}:</div>
                      <div style="background:#333333;height:16px;width:${barW}px;border-radius:2px;margin-right:10px;min-width:4px;"></div>
                      <strong style="color:#000000;">${pct.toFixed(0)}%</strong>
                    </div>`;
                }).join('')}
                <div style="font-size:13px;color:#000000;margin-top:12px;"><strong>Insight:</strong> ${top2[0] ? `Strong ${top2[0].parameter_name} performance` : 'Strong overall performance'}. ${bottom2[0] ? `${bottom2[0].parameter_name} is the key area for further development.` : ''}</div>

                ${hasTrend ? `
                <div style="margin-top:20px;">
                  <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:10px;">B. Trend Across Cycles</div>
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
                      <div style="font-size:24px;font-weight:800;color:#000000;">${overallScore.toFixed(1)}%</div>
                      <div style="font-size:11px;color:#555555;">${cycle_details?.name || ''}</div>
                    </div>
                  </div>
                  <div style="font-size:13px;color:#000000;margin-top:8px;"><strong>Insight:</strong> ${trendUp ? 'Consistent upward growth trend.' : 'Performance declined compared to previous cycle.'}</div>
                </div>` : ''}
              </div>

              <!-- SECTION 4: BENCHMARK COMPARISON -->
              ${(bench.team_average != null || bench.dept_average != null || bench.org_average != null) ? `
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;">
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
                <div style="margin-top:12px;font-size:13px;color:#000000;">
                  <strong>Key Insights:</strong>
                  <ul style="margin:6px 0 0;padding-left:20px;line-height:1.9;color:#000000;">
                    ${bench.team_average != null ? `<li>You performed <strong>${Math.abs((overallScore - bench.team_average).toFixed(1))}% ${overallScore >= bench.team_average ? 'above' : 'below'}</strong> your team average.</li>` : ''}
                    ${bench.percentile_rank != null ? `<li>You are in the <strong>Top ${100 - bench.percentile_rank}%</strong> percentile rank company-wide.</li>` : ''}
                  </ul>
                </div>
              </div>` : ''}

              <!-- SECTION 5: STRENGTHS & AREAS FOR IMPROVEMENT -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;">
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">5. Top Strengths & Areas for Improvement</h2>
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:8px;">Strengths:</div>
                <ul style="margin:0 0 16px;padding-left:24px;font-size:14px;line-height:2;color:#000000;">
                  ${top2.map(p => {
                      const r = parseFloat(p.rating || 0);
                      const sc = r > 0 ? (r * 20).toFixed(0) : parseFloat(p.score || 0).toFixed(0);
                      return `<li><strong>${p.parameter_name}</strong> — Rating: ${p.rating || '-'}/5 (${sc}%)</li>`;
                  }).join('')}
                </ul>
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:8px;">Needs Improvement:</div>
                <ul style="margin:0;padding-left:24px;font-size:14px;line-height:2;color:#000000;">
                  ${bottom2.map(p => {
                      const r = parseFloat(p.rating || 0);
                      const sc = r > 0 ? (r * 20).toFixed(0) : parseFloat(p.score || 0).toFixed(0);
                      return `<li><strong>${p.parameter_name}</strong> — Rating: ${p.rating || '-'}/5 (${sc}%)</li>`;
                  }).join('')}
                </ul>
              </div>

              <!-- SECTION 6: AI INSIGHTS -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;">
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">6. AI Insights (Powered by Advanced NLP)</h2>
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:6px;">A. Sentiment Analysis</div>
                <div style="font-size:14px;margin-bottom:16px;color:#000000;">
                  Overall Sentiment: <strong>${ai?.sentiment === 'POSITIVE' ? 'Predominantly Positive' : ai?.sentiment === 'NEGATIVE' ? 'Predominantly Negative' : ai?.sentiment === 'MIXED' ? 'Mixed' : 'Neutral'}</strong>
                </div>
                ${aiFlags.length > 0 ? `
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:6px;">B. Quality Flags</div>
                <ul style="margin:0 0 16px;padding-left:24px;font-size:13px;line-height:1.9;color:#000000;">
                  ${inconsistencies.map(f => `<li><strong>Inconsistency</strong> in ${f.parameter_name || ''}: ${f.message}</li>`).join('')}
                  ${weakFlags.map(f => `<li><strong>${f.type === 'MISSING_FEEDBACK' ? 'Missing feedback' : 'Weak feedback'}</strong> for ${f.parameter_name || ''}: ${f.message}</li>`).join('')}
                </ul>` : ''}
                <div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:8px;">${aiFlags.length > 0 ? 'C.' : 'B.'} AI Summary</div>
                <div style="font-size:13px;color:#000000;line-height:1.8;background:#f5f5f5;border-left:4px solid #333333;padding:14px 18px;">
                  ${ai?.summary || 'AI analysis not available for this evaluation.'}
                </div>
              </div>

              <!-- SECTION 7: FINAL RECOMMENDATION -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;">
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">7. Final Recommendation</h2>
                <div style="font-size:16px;font-weight:800;color:#000000;margin-bottom:6px;">${vLabel}</div>
                ${overallScore >= 75 ? `<div style="font-size:14px;font-weight:700;color:#000000;margin-bottom:10px;">High-Potential Employee</div>` : ''}
                <div style="font-size:14px;color:#000000;margin-bottom:10px;">Recommended actions:</div>
                <ul style="margin:0;padding-left:24px;font-size:14px;line-height:2;color:#000000;">
                  ${recActions.map(a => `<li>${a}</li>`).join('')}
                </ul>
              </div>

              <!-- SECTION 8: EVALUATION METADATA -->
              <div data-section style="margin-bottom:32px;padding:0 55px;background:white;">
                <h2 style="font-size:20px;font-weight:700;color:#000000;border-bottom:2px solid #cccccc;padding-bottom:8px;margin-bottom:16px;">8. Evaluation Metadata</h2>
                <table style="width:100%;font-size:14px;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;color:#000000;width:240px;"><strong>Evaluated by:</strong></td><td style="padding:6px 0;color:#000000;">${performance?.evaluator_name || 'N/A'}</td></tr>
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
            const { team_info, summary, employees, status } = data;
            const isFinalized = status === 'finalized';

            html = `
                <div class="report-pdf-header">
                    <div>
                        <h1>Team Performance Analysis</h1>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Team: ${team_info.team_name}</p>
                    </div>
                    <div class="cycle-info">
                        <strong>Cycle:</strong> ${team_info.cycle_name}<br/>
                        <strong>Period:</strong> ${team_info.duration}<br/>
                        <strong>Generated:</strong> ${timestamp}
                    </div>
                </div>

                <div class="report-section">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 class="section-title">Team Metrics Overview</h2>
                        ${isFinalized ? '<div style="background: #003f88; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-bottom: 10px;">CYCLE FINALIZED</div>' : ''}
                    </div>
                    <div class="pdf-stats-grid">
                        <div class="pdf-stat-card">
                            <div class="pdf-stat-value">${summary.average_score}</div>
                            <div class="pdf-stat-label">Team Avg. Score</div>
                        </div>
                        <div class="pdf-stat-card">
                            <div class="pdf-stat-value">${summary.completion_percentage}%</div>
                            <div class="pdf-stat-label">Completion</div>
                        </div>
                        <div class="pdf-stat-card">
                            <div class="pdf-stat-value">${summary.highest_score}</div>
                            <div class="pdf-stat-label">Highest Score</div>
                        </div>
                        <div class="pdf-stat-card">
                            <div class="pdf-stat-value">${summary.lowest_score}</div>
                            <div class="pdf-stat-label">Lowest Score</div>
                        </div>
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="section-title">Team Rankings</h2>
                    ${generateBarSVG(employees.filter(e => e.total_score).sort((a, b) => b.total_score - a.total_score), 'total_score', 'name')}
                </div>

                <div class="report-section">
                    <h2 class="section-title">Member Performance List</h2>
                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Score</th>
                                <th>Level</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${employees.map(e => `
                                <tr>
                                    <td>${e.name}</td>
                                    <td>${e.role}</td>
                                    <td><strong>${e.total_score || '-'}</strong></td>
                                    <td>${e.performance_level}</td>
                                    <td>${e.evaluation_status.toUpperCase()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="pdf-footer">
                    Confidential Team Performance Record â€¢ ${team_info.team_name} â€¢ Powered by Perfomix
                </div>
            `;
        }

        container.innerHTML = html;

        // Give browser time to render fonts and layout
        await new Promise(r => setTimeout(r, 400));

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 0;

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
                const imgW = pageWidth;
                const imgH = (canvas.height * imgW) / canvas.width;
                let heightLeft = imgH;
                let pos = 0;
                pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
                heightLeft -= pageHeight;
                while (heightLeft > 0) {
                    pos -= pageHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
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
                    const imgW = pageWidth;
                    const imgH = (canvas.height * imgW) / canvas.width;

                    // If section doesn't fit on current page, add new page
                    if (!isFirstPage && currentY + imgH > pageHeight - 10) {
                        pdf.addPage();
                        currentY = 0;
                    }

                    pdf.addImage(imgData, 'PNG', 0, currentY, imgW, imgH);
                    currentY += imgH + 2; // 2mm gap between sections
                    isFirstPage = false;
                }
            }
        } else {
            // For other report types: standard multi-page rendering
            const canvas = await html2canvas(container, {
                scale: 2, useCORS: true, logging: false,
                backgroundColor: '#ffffff', windowWidth: 900,
                scrollX: 0, scrollY: 0
            });
            const imgData = canvas.toDataURL('image/png');
            const imgW = pageWidth;
            const imgH = (canvas.height * imgW) / canvas.width;
            let heightLeft = imgH;
            let pos = 0;
            pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
            heightLeft -= pageHeight;
            while (heightLeft > 0) {
                pos -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
                heightLeft -= pageHeight;
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
