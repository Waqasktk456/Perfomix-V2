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

            html = `
                <div style="font-family: 'Inter', sans-serif; color: #1E293B; max-width: 800px; margin: 0 auto; background: white;">
                    <!-- Cover Page / Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0F172A; padding-bottom: 20px; margin-bottom: 30px;">
                        <div>
                            <h1 style="font-size: 24px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${header.organization_name}</h1>
                            <h2 style="font-size: 16px; font-weight: 500; color: #475569; margin: 5px 0 0 0;">Organization Performance Report</h2>
                        </div>
                        <div style="text-align: right; font-size: 11px; color: #64748B;">
                            <div><strong>Cycle:</strong> ${header.cycle_name}</div>
                            <div><strong>Generated:</strong> ${timestamp}</div>
                        </div>
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
                                ${distribution.map(d => `<span><strong>${d.level}:</strong> ${d.count} (${Math.round((d.count / summary.completed) * 100)}%)</span>`).join(' • ')}
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
                        <div>Confidential • ${header.organization_name}</div>
                        <div>Page 1 of 1</div>
                    </div>
                </div>
            `;
        } else if (type === 'individual-assessment') {
            const { employee_details, cycle_details, performance } = data;
            const overallScore = parseFloat(performance.overall_score || 0);
            const weightedScore = parseFloat(performance.weighted_score || 0);

            // Helper for Performance Level
            const getLevel = (score) => {
                if (score >= 85) return { label: 'EXCELLENT', color: '#10B981', bg: '#D1FAE5', bar: '#10B981' };
                if (score >= 70) return { label: 'GOOD', color: '#3B82F6', bg: '#DBEAFE', bar: '#3B82F6' };
                if (score >= 50) return { label: 'SATISFACTORY', color: '#F59E0B', bg: '#FEF3C7', bar: '#F59E0B' };
                return { label: 'NEEDS IMPROVEMENT', color: '#EF4444', bg: '#FEE2E2', bar: '#EF4444' };
            };

            const level = getLevel(overallScore);

            // Insights Logic
            const sortedParams = [...performance.parameters].sort((a, b) => b.score - a.score);
            const topStrengths = sortedParams.slice(0, 2);
            const weakness = sortedParams[sortedParams.length - 1];

            // Comparison Logic
            let trendHtml = '';
            if (performance.previous_score) {
                const prevScore = parseFloat(performance.previous_score);
                const diff = (overallScore - prevScore).toFixed(1);
                const isUp = diff >= 0;
                trendHtml = `
                    <div style="margin-top: 15px; padding: 10px; background: #F8FAFC; border-radius: 6px; border-left: 4px solid ${isUp ? '#10B981' : '#EF4444'};">
                        <div style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 600;">Historical Comparison</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                            <div>
                                <span style="font-size: 12px; color: #475569;">Previous Cycle: </span>
                                <span style="font-weight: bold; color: #334155;">${prevScore.toFixed(2)}%</span>
                            </div>
                            <div style="font-weight: bold; color: ${isUp ? '#059669' : '#DC2626'}; display: flex; align-items: center; gap: 4px;">
                                ${isUp ? '↑' : '↓'} ${Math.abs(diff)}%
                                <span style="font-size: 10px; color: #64748B; font-weight: normal;">vs last review</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            html = `
                <div style="font-family: 'Inter', sans-serif; color: #1E293B; max-width: 800px; margin: 0 auto; background: white;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0F172A; padding-bottom: 20px; margin-bottom: 30px;">
                        <div>
                            <h1 style="font-size: 24px; font-weight: 800; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${cycle_details.organization}</h1>
                            <h2 style="font-size: 16px; font-weight: 500; color: #475569; margin: 5px 0 0 0;">Individual Performance Report</h2>
                        </div>
                        <div style="text-align: right; font-size: 11px; color: #64748B;">
                            <div><strong>Cycle:</strong> ${cycle_details.name}</div>
                            <div><strong>Date:</strong> ${timestamp}</div>
                        </div>
                    </div>

                    <!-- Employee Info & Summary Grid -->
                    <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 30px; margin-bottom: 40px;">
                        <!-- Employee Info -->
                        <div style="background: #F8FAFC; padding: 20px; border-radius: 8px;">
                            <h3 style="font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin: 0 0 15px 0;">Employee Information</h3>
                            <table style="width: 100%; font-size: 13px; border-collapse: separate; border-spacing: 0 8px;">
                                <tr>
                                    <td style="color: #64748B; font-weight: 500;">Full Name:</td>
                                    <td style="font-weight: 700; color: #0F172A; text-align: right;">${employee_details.name}</td>
                                </tr>
                                <tr>
                                    <td style="color: #64748B; font-weight: 500;">Details:</td>
                                    <td style="font-weight: 600; color: #334155; text-align: right;">${employee_details.role} | ${employee_details.department}</td>
                                </tr>
                                <tr>
                                    <td style="color: #64748B; font-weight: 500;">Line Manager:</td>
                                    <td style="color: #334155; text-align: right;">${performance.evaluator_name || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="color: #64748B; font-weight: 500;">Status:</td>
                                    <td style="text-align: right;"><span style="background: #E2E8F0; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; color: #475569;">${cycle_details.status || 'Active'}</span></td>
                                </tr>
                            </table>
                        </div>

                        <!-- Performance Summary -->
                        <div style="border: 1px solid #E2E8F0; border-top: 4px solid ${level.color}; border-radius: 8px; padding: 20px; text-align: center;">
                            <h3 style="font-size: 12px; text-transform: uppercase; color: #475569; margin: 0 0 10px 0;">Performance Summary</h3>
                            <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;">
                                <div style="font-size: 36px; font-weight: 800; color: ${level.color};">${overallScore.toFixed(1)}%</div>
                                <div style="text-align: left;">
                                    <div style="font-size: 10px; color: #64748B; text-transform: uppercase;">Rating</div>
                                    <div style="background: ${level.bg}; color: ${level.color}; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; display: inline-block;">${level.label}</div>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; pt: 10px;">
                                <div>Weighted: <strong>${weightedScore.toFixed(2)}</strong></div>
                                <div>Completed: <strong>${performance.submitted_at ? new Date(performance.submitted_at).toLocaleDateString() : 'Pending'}</strong></div>
                            </div>
                            ${trendHtml}
                        </div>
                    </div>

                    <!-- Performance Insights -->
                    <div style="margin-bottom: 40px;">
                        <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 20px;">Performance Insights</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 15px;">
                                <div style="font-size: 12px; font-weight: 700; color: #166534; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 14px;">✔</span> KEY STRENGTHS
                                </div>
                                <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #14532D;">
                                    ${topStrengths.map(p => `<li style="margin-bottom: 4px;"><strong>${p.parameter_name}</strong> (${p.score}%)</li>`).join('')}
                                </ul>
                            </div>
                            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 15px;">
                                <div style="font-size: 12px; font-weight: 700; color: #991B1B; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                                    <span style="font-size: 14px;">!</span> AREA FOR IMPROVEMENT
                                </div>
                                <p style="margin: 0; font-size: 12px; color: #7F1D1D;">
                                    ${weakness ? `<strong>${weakness.parameter_name}</strong> (${weakness.score}%) - Focus on development in this area.` : 'No significant weakness identified.'}
                                </p>
                            </div>
                        </div>
                        <div style="margin-top: 15px; font-size: 12px; color: #475569; font-style: italic;">
                            <strong>Summary:</strong> ${employee_details.name} has achieved an overall score of ${overallScore}%, categorized as ${level.label}.
                            The strongest performance was observed in ${topStrengths[0]?.parameter_name}, while ${weakness?.parameter_name} requires attention.
                        </div>
                    </div>

                    <!-- Detailed Evaluation Table -->
                    <div style="margin-bottom: 40px;">
                        <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 20px;">Detailed Evaluation</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                            <thead>
                                <tr style="background: #F8FAFC; color: #475569; text-align: left;">
                                    <th style="padding: 10px; border-bottom: 2px solid #E2E8F0;">Parameter</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">Weight</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">Score</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; width: 30%;">Performance Indicator</th>
                                    <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: right;">Weighted</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${performance.parameters.map(p => {
                const pLevel = getLevel(p.score);
                return `
                                    <tr>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #F1F5F9; font-weight: 600; color: #334155;">
                                            ${p.parameter_name}
                                        </td>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #F1F5F9; text-align: center; color: #64748B;">${p.weightage}%</td>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #F1F5F9; text-align: center; font-weight: 700; color: ${pLevel.color};">${p.score}</td>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #F1F5F9;">
                                            <div style="background: #F1F5F9; height: 6px; border-radius: 3px; overflow: hidden;">
                                                <div style="width: ${p.score}%; background: ${pLevel.bar}; height: 100%;"></div>
                                            </div>
                                        </td>
                                        <td style="padding: 12px 10px; border-bottom: 1px solid #F1F5F9; text-align: right; font-weight: 700; color: #0F172A;">${parseFloat(p.weighted_score).toFixed(2)}</td>
                                    </tr>
                                    `;
            }).join('')}
                            </tbody>
                            <tfoot>
                                <tr style="background: #F8FAFC;">
                                    <td colspan="3" style="padding: 10px; text-align: right; font-weight: 700; color: #475569;">TOTALS</td>
                                    <td style="padding: 10px;"></td>
                                    <td style="padding: 10px; text-align: right; font-weight: 800; color: #0F172A; font-size: 14px;">${weightedScore.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <!-- Feedback & Recommendations -->
                    <div style="display: grid; grid-template-columns: 1fr; gap: 30px; margin-bottom: 40px;">
                        <div>
                            <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 15px;">Manager Feedback</h3>
                            <blockquote style="margin: 0; background: #F8FAFC; border-left: 4px solid #3B82F6; padding: 15px; font-style: italic; color: #475569; font-size: 13px; line-height: 1.6;">
                                "${performance.manager_remarks || 'No specific feedback provided for this cycle.'}"
                            </blockquote>
                        </div>
                        <div>
                            <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 15px;">Recommendations & Development</h3>
                            <div style="border: 1px dashed #CBD5E1; padding: 15px; border-radius: 6px; color: #475569; font-size: 13px;">
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li style="margin-bottom: 5px;">Maintain performance in <strong>${topStrengths[0]?.parameter_name}</strong>.</li>
                                    <li style="margin-bottom: 5px;">Focus on improving <strong>${weakness?.parameter_name}</strong> through targeted training or mentorship.</li>
                                    <li>Review progress in the next quarterly check-in.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="border-top: 1px solid #E2E8F0; padding-top: 15px; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; text-transform: uppercase;">
                        <div>Confidential • ${cycle_details.organization}</div>
                        <div>Page 1 of 1</div>
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
                    Confidential Team Performance Record • ${team_info.team_name} • Powered by Perfomix
                </div>
            `;
        }

        container.innerHTML = html;

        // Use html2canvas to capture the report
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        const fileName = `${type.replace('-', '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

    } catch (error) {
        console.error('PDF Generation failed:', error);
        throw error;
    } finally {
        // Cleanup
        document.body.removeChild(container);
    }
};
