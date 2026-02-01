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
            const { header, summary, top_performers, distribution, dept_stats } = data;
            html = `
                <div class="report-pdf-header">
                    <div>
                        <h1>Organization Performance Report</h1>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${header.organization_name}</p>
                    </div>
                    <div class="cycle-info">
                        <strong>Evaluation Cycle:</strong> ${header.cycle_name}<br/>
                        <strong>Period:</strong> ${new Date(header.start_date).toLocaleDateString()} - ${new Date(header.end_date).toLocaleDateString()}<br/>
                        <strong>Generated:</strong> ${timestamp}
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="section-title">Executive Summary</h2>
                    <div class="pdf-stats-grid">
                        <div class="pdf-stat-card">
                            <div class="pdf-stat-value">${summary.total_employees}</div>
                            <div class="pdf-stat-label">Total Employees</div>
                        </div>
                        <div class="pdf-stat-card">
                            <div class="pdf-stat-value">${summary.average_score}</div>
                            <div class="pdf-stat-label">Avg. Score</div>
                        </div>
                        <div class="pdf-stat-card">
                            <div class="pdf-stat-value">${summary.completed}</div>
                            <div class="pdf-stat-label">Evaluations Done</div>
                        </div>
                        <div class="pdf-stat-card">
                            <div class="pdf-stat-value">${Math.round((summary.completed / summary.total_employees) * 100)}%</div>
                            <div class="pdf-stat-label">Completion Rate</div>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 35px;">
                    <div>
                        <h2 class="section-title">Score Distribution</h2>
                        ${generatePieSVG(distribution)}
                        <div style="margin-top: 15px; font-size: 11px;">
                            ${distribution.map((d, i) => `<span style="margin-right: 15px;"><span style="color: ${['#003f88', '#E87722', '#10B981', '#6B7280'][i % 4]}">●</span> ${d.level}: ${d.count}</span>`).join('')}
                        </div>
                    </div>
                    <div>
                        <h2 class="section-title">Top Departments</h2>
                        ${generateBarSVG(dept_stats, 'avg_score', 'Department_name')}
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="section-title">Top Performers</h2>
                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Designation</th>
                                <th>Score</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${top_performers.map(p => `
                                <tr>
                                    <td>${p.First_name} ${p.Last_name}</td>
                                    <td>${p.Designation}</td>
                                    <td><strong>${p.overall_score}</strong></td>
                                    <td><span style="color: green; font-weight: bold;">LOCKED</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="pdf-footer">
                    Perfomix Performance Management System • Internal Use Only • Page 1
                </div>
            `;
        } else if (type === 'individual-assessment') {
            const { employee_details, cycle_details, performance } = data;
            const isCompleted = performance.status === 'completed';

            html = `
                <div class="report-pdf-header">
                    <div>
                        <h1>Individual Performance Assessment</h1>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${cycle_details.organization}</p>
                    </div>
                    <div class="cycle-info">
                        <strong>Cycle:</strong> ${cycle_details.name}<br/>
                        <strong>Generated:</strong> ${timestamp}
                    </div>
                </div>

                <div class="employee-summary">
                    <div class="overall-score-large" style="background: ${isCompleted ? '#003f88' : '#6B7280'}">
                        <div class="value">${performance.overall_score}</div>
                        <div class="label">OVERALL SCORE</div>
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h2 style="margin: 0; color: #003f88;">${employee_details.name}</h2>
                                <p style="margin: 5px 0; font-size: 16px;">${employee_details.role}</p>
                            </div>
                            ${isCompleted ? '<div style="background: #E87722; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 12px;">LOCKED</div>' : ''}
                        </div>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;"/>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Department:</strong> ${employee_details.department}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Team:</strong> ${employee_details.team}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Status:</strong> <span style="color: ${isCompleted ? 'green' : '#E87722'}; font-weight: bold;">${performance.status.toUpperCase()}</span></p>
                    </div>
                </div>

                <div class="report-section">
                    <h2 class="section-title">Performance breakdown</h2>
                    ${generateBarSVG(performance.parameters, 'score', 'parameter_name')}
                </div>

                <div class="report-section">
                    <h2 class="section-title">Detailed Evaluation</h2>
                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th style="width: 25%;">Parameter</th>
                                <th style="text-align: center; width: 10%;">Weight</th>
                                <th style="text-align: center; width: 10%;">Score</th>
                                <th style="text-align: center; width: 15%;">Weighted</th>
                                <th>Manager Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${performance.parameters.map(p => `
                                <tr>
                                    <td><strong>${p.parameter_name}</strong></td>
                                    <td style="text-align: center;">${p.weightage}%</td>
                                    <td style="text-align: center;">${p.score}</td>
                                    <td style="text-align: center;"><strong>${parseFloat(p.weighted_score).toFixed(2)}</strong></td>
                                    <td style="font-style: italic; font-size: 11px;">${p.parameter_remarks || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="report-section">
                    <h2 class="section-title">Evaluator Comments</h2>
                    <div style="background: #fdfdfd; border: 1px solid #eee; padding: 15px; border-radius: 8px; min-height: 80px; font-size: 13px;">
                        ${performance.manager_remarks || 'No overall remarks provided.'}
                    </div>
                </div>

                <div class="pdf-footer">
                    Professional Performance Assessment • ${employee_details.name} • ${cycle_details.name}
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
