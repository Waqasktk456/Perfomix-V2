/**
 * Enhanced Organization Performance Report Generator
 * Creates professional, management-ready PDF reports
 * 
 * @author Perfomix Team
 * @version 2.0 - COMPLETE
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ==================== HELPER FUNCTIONS ====================

/**
 * Get performance level classification
 */
const getPerformanceLevel = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 85) return { label: 'Excellent', color: '#10B981', bg: '#D1FAE5', icon: '★' };
    if (numScore >= 70) return { label: 'Good', color: '#3B82F6', bg: '#DBEAFE', icon: '●' };
    if (numScore >= 50) return { label: 'Satisfactory', color: '#F59E0B', bg: '#FEF3C7', icon: '▲' };
    return { label: 'Needs Improvement', color: '#EF4444', bg: '#FEE2E2', icon: '!' };
};

/**
 * Format date to readable string
 */
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
};

/**
 * Generate performance distribution bars
 */
const generateDistributionBars = (distribution, totalCompleted) => {
    if (!distribution || distribution.length === 0) return '';
    
    const colors = {
        'Excellent': '#10B981',
        'Good': '#3B82F6',
        'Satisfactory': '#F59E0B',
        'Needs Improvement': '#EF4444'
    };
    
    return distribution.map(d => {
        const percentage = Math.round((d.count / totalCompleted) * 100);
        const color = colors[d.level] || '#64748B';
        
        return `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                    <span style="font-weight: 600; color: #334155;">${d.level}</span>
                    <span style="color: #64748B;">${d.count} employees (${percentage}%)</span>
                </div>
                <div style="width: 100%; height: 24px; background: #F1F5F9; border-radius: 6px; overflow: hidden;">
                    <div style="width: ${percentage}%; height: 100%; background: ${color}; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; color: white; font-weight: 700; font-size: 11px;">
                        ${percentage}%
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

// ==================== SECTION GENERATORS ====================

/**
 * Generate Cover Page
 */
function generateCoverPage(header, summary, timestamp) {
    return `
        <div style="text-align: center; padding: 120px 0 100px 0; border-bottom: 4px solid #0F172A; margin-bottom: 60px; page-break-after: always;">
            <div style="font-size: 13px; color: #64748B; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 30px; font-weight: 600;">OFFICIAL PERFORMANCE REPORT</div>
            
            <h1 style="font-size: 42px; font-weight: 900; color: #0F172A; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">ORGANIZATION</h1>
            <h1 style="font-size: 42px; font-weight: 900; color: #003f88; margin: 0 0 40px 0; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">PERFORMANCE REPORT</h1>
            
            <div style="width: 120px; height: 4px; background: linear-gradient(90deg, #003f88, #E87722); margin: 40px auto;"></div>
            
            <div style="font-size: 24px; color: #334155; margin: 40px 0 20px 0; font-weight: 700;">${header.organization_name}</div>
            <div style="font-size: 16px; color: #64748B; margin: 10px 0; font-weight: 500;">
                Evaluation Cycle: <span style="color: #334155; font-weight: 600;">${header.cycle_name}</span>
            </div>
            <div style="font-size: 14px; color: #64748B; margin: 8px 0;">
                Period: ${formatDate(header.start_date)} - ${formatDate(header.end_date)}
            </div>
            
            <div style="margin-top: 60px; padding-top: 30px; border-top: 1px solid #E2E8F0;">
                <div style="font-size: 13px; color: #94A3B8; margin: 5px 0;">Report Generated: ${timestamp}</div>
                <div style="font-size: 13px; color: #94A3B8; margin: 5px 0;">
                    Total Employees Evaluated: <span style="font-weight: 600; color: #64748B;">${summary.total_employees}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate Executive Summary
 */
function generateExecutiveSummary(summary, orgLevel, distWithPercent, totalCompleted) {
    const completionRate = Math.round((summary.completed / (summary.total_employees || 1)) * 100);
    
    // Generate narrative based on score
    let narrative = '';
    if (summary.average_score >= 85) {
        narrative = 'The organization demonstrates exceptional performance across all evaluated parameters. This outstanding achievement reflects strong leadership, effective processes, and a highly engaged workforce.';
    } else if (summary.average_score >= 70) {
        narrative = 'The organization shows strong overall performance with consistent results across departments. There are opportunities for targeted improvements in specific areas to achieve excellence.';
    } else if (summary.average_score >= 50) {
        narrative = 'The organization meets basic performance standards. Focused development initiatives and strategic interventions are recommended to elevate performance levels.';
    } else {
        narrative = 'The organization requires immediate attention and comprehensive performance improvement strategies. A detailed action plan should be developed to address systemic challenges.';
    }
    
    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px;">
                EXECUTIVE SUMMARY
            </h2>
            
            <!-- Key Metrics Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #003f88 0%, #0052b3 100%); padding: 25px; border-radius: 10px; text-align: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; opacity: 0.9;">ORG AVERAGE</div>
                    <div style="font-size: 36px; font-weight: 900; margin: 5px 0;">${parseFloat(summary.average_score).toFixed(1)}%</div>
                    <div style="background: ${orgLevel.bg}; color: ${orgLevel.color}; padding: 6px 12px; border-radius: 5px; font-size: 11px; font-weight: 700; display: inline-block; margin-top: 8px;">
                        ${orgLevel.icon} ${orgLevel.label.toUpperCase()}
                    </div>
                </div>
                
                <div style="background: #F8FAFC; padding: 25px; border-radius: 10px; border-left: 4px solid #10B981; text-align: center;">
                    <div style="font-size: 11px; color: #64748B; text-transform: uppercase; margin-bottom: 10px; font-weight: 600;">HIGHEST SCORE</div>
                    <div style="font-size: 36px; font-weight: 900; color: #10B981;">${parseFloat(summary.highest_score).toFixed(1)}%</div>
                </div>
                
                <div style="background: #F8FAFC; padding: 25px; border-radius: 10px; border-left: 4px solid #EF4444; text-align: center;">
                    <div style="font-size: 11px; color: #64748B; text-transform: uppercase; margin-bottom: 10px; font-weight: 600;">LOWEST SCORE</div>
                    <div style="font-size: 36px; font-weight: 900; color: #EF4444;">${parseFloat(summary.lowest_score).toFixed(1)}%</div>
                </div>
                
                <div style="background: #F8FAFC; padding: 25px; border-radius: 10px; border-left: 4px solid #3B82F6; text-align: center;">
                    <div style="font-size: 11px; color: #64748B; text-transform: uppercase; margin-bottom: 10px; font-weight: 600;">COMPLETION</div>
                    <div style="font-size: 36px; font-weight: 900; color: #3B82F6;">${completionRate}%</div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 5px;">${summary.completed}/${summary.total_employees}</div>
                </div>
            </div>
            
            <!-- Performance Distribution Summary -->
            <div style="background: white; border: 2px solid #E2E8F0; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
                <h3 style="font-size: 14px; font-weight: 700; color: #475569; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px;">
                    PERFORMANCE DISTRIBUTION
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
                    ${distWithPercent.map(d => {
                        const level = getPerformanceLevel(d.level === 'Excellent' ? 90 : d.level === 'Good' ? 75 : d.level === 'Satisfactory' ? 60 : 40);
                        return `
                            <div style="text-align: center; padding: 20px; background: ${level.bg}; border-radius: 8px; border: 2px solid ${level.color};">
                                <div style="font-size: 32px; font-weight: 900; color: ${level.color}; margin-bottom: 5px;">${d.count}</div>
                                <div style="font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase;">${d.level}</div>
                                <div style="font-size: 14px; color: ${level.color}; font-weight: 700; margin-top: 5px;">${d.percentage}%</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- Overall Rating Narrative -->
            <div style="background: #F8FAFC; padding: 20px; border-radius: 10px; border-left: 4px solid #003f88;">
                <h4 style="font-size: 13px; font-weight: 700; color: #475569; margin: 0 0 12px 0; text-transform: uppercase;">
                    OVERALL ORGANIZATIONAL RATING
                </h4>
                <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.7;">
                    Based on the evaluation of <strong>${summary.total_employees} employees</strong> across the organization, 
                    the overall performance rating is <strong style="color: ${orgLevel.color};">${orgLevel.label}</strong> 
                    with an average score of <strong>${parseFloat(summary.average_score).toFixed(2)}%</strong>. ${narrative}
                </p>
            </div>
        </div>
    `;
}

/**
 * Generate Performance Distribution Visualization
 */
function generatePerformanceDistribution(distWithPercent, totalCompleted) {
    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px;">
                PERFORMANCE DISTRIBUTION VISUALIZATION
            </h2>
            
            <div style="background: white; border: 2px solid #E2E8F0; border-radius: 10px; padding: 30px;">
                ${generateDistributionBars(distWithPercent, totalCompleted)}
                <div style="text-align: center; font-size: 12px; color: #64748B; font-style: italic; margin-top: 20px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
                    Distribution based on ${totalCompleted} completed evaluations
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate Department-wise Analysis
 */
function generateDepartmentAnalysis(dept_stats) {
    if (!dept_stats || dept_stats.length === 0) {
        return '<div style="margin-bottom: 50px;"><p style="color: #64748B;">No department data available.</p></div>';
    }
    
    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">
                DEPARTMENT-WISE PERFORMANCE ANALYSIS
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background: linear-gradient(135deg, #003f88 0%, #0052b3 100%); color: white;">
                        <th style="padding: 15px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Department</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Employees</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Avg Score</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Highest</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Lowest</th>
                    </tr>
                </thead>
                <tbody>
                    ${dept_stats.map((dept, index) => {
                        const avgScore = parseFloat(dept.avg_score || 0);
                        const level = getPerformanceLevel(avgScore);
                        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                        
                        return `
                            <tr style="background: ${bgColor}; border-bottom: 1px solid #E2E8F0;">
                                <td style="padding: 15px; font-weight: 600; color: #334155;">${dept.Department_name}</td>
                                <td style="padding: 15px; text-align: center; color: #64748B;">${dept.emp_count}</td>
                                <td style="padding: 15px; text-align: center;">
                                    <span style="background: ${level.bg}; color: ${level.color}; padding: 6px 12px; border-radius: 5px; font-weight: 700;">
                                        ${avgScore.toFixed(1)}%
                                    </span>
                                </td>
                                <td style="padding: 15px; text-align: center; font-weight: 700; color: #10B981;">${parseFloat(dept.max_score || 0).toFixed(1)}%</td>
                                <td style="padding: 15px; text-align: center; font-weight: 700; color: #EF4444;">${parseFloat(dept.min_score || 0).toFixed(1)}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Generate Line Manager Completion Summary
 */
function generateLineManagerSummary(manager_stats) {
    if (!manager_stats || manager_stats.length === 0) {
        return '<div style="margin-bottom: 50px;"><p style="color: #64748B;">No line manager data available.</p></div>';
    }
    
    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">
                LINE MANAGER COMPLETION SUMMARY
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background: linear-gradient(135deg, #003f88 0%, #0052b3 100%); color: white;">
                        <th style="padding: 15px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Line Manager</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Assigned</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Completed</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Pending</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Completion %</th>
                    </tr>
                </thead>
                <tbody>
                    ${manager_stats.map((mgr, index) => {
                        const completionPct = Math.round((mgr.completed / mgr.total_assigned) * 100);
                        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                        const statusColor = completionPct === 100 ? '#10B981' : completionPct >= 50 ? '#F59E0B' : '#EF4444';
                        
                        return `
                            <tr style="background: ${bgColor}; border-bottom: 1px solid #E2E8F0;">
                                <td style="padding: 15px; font-weight: 600; color: #334155;">${mgr.manager_name}</td>
                                <td style="padding: 15px; text-align: center; color: #64748B;">${mgr.total_assigned}</td>
                                <td style="padding: 15px; text-align: center; font-weight: 700; color: #10B981;">${mgr.completed}</td>
                                <td style="padding: 15px; text-align: center; font-weight: 700; color: #EF4444;">${mgr.pending}</td>
                                <td style="padding: 15px; text-align: center;">
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        <div style="flex: 1; max-width: 100px; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
                                            <div style="width: ${completionPct}%; height: 100%; background: ${statusColor};"></div>
                                        </div>
                                        <span style="font-weight: 700; color: ${statusColor};">${completionPct}%</span>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Generate Top Performers Section
 */
function generateTopPerformers(top_performers) {
    if (!top_performers || top_performers.length === 0) {
        return '<div style="margin-bottom: 50px;"><p style="color: #64748B;">No top performers data available.</p></div>';
    }
    
    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">
                TOP PERFORMERS
            </h2>
            
            <div style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); border: 2px solid #10B981; border-radius: 10px; padding: 25px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #065F46; line-height: 1.6;">
                    <strong>Recognition:</strong> The following employees have demonstrated exceptional performance and are recognized as top contributors to organizational success.
                </p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white;">
                        <th style="padding: 15px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Rank</th>
                        <th style="padding: 15px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Employee Name</th>
                        <th style="padding: 15px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Department</th>
                        <th style="padding: 15px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Designation</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${top_performers.slice(0, 10).map((emp, index) => {
                        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                        
                        return `
                            <tr style="background: ${bgColor}; border-bottom: 1px solid #E2E8F0;">
                                <td style="padding: 15px; font-size: 18px; font-weight: 700; color: #10B981;">${medal}</td>
                                <td style="padding: 15px; font-weight: 600; color: #334155;">${emp.First_name} ${emp.Last_name}</td>
                                <td style="padding: 15px; color: #64748B;">${emp.department_name || 'N/A'}</td>
                                <td style="padding: 15px; color: #64748B;">${emp.Designation || 'N/A'}</td>
                                <td style="padding: 15px; text-align: center;">
                                    <span style="background: #D1FAE5; color: #10B981; padding: 8px 16px; border-radius: 6px; font-weight: 900; font-size: 14px;">
                                        ${parseFloat(emp.overall_score).toFixed(1)}%
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Generate Employees Requiring Improvement Section
 */
function generateImprovementNeeded(improvement_needed) {
    if (!improvement_needed || improvement_needed.length === 0) {
        return `
            <div style="margin-bottom: 50px; page-break-inside: avoid;">
                <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">
                    EMPLOYEES REQUIRING IMPROVEMENT
                </h2>
                <div style="background: #F0FDF4; border: 2px solid #10B981; border-radius: 10px; padding: 25px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #065F46; font-weight: 600;">
                        ✓ All employees are performing above the improvement threshold (70%). Excellent organizational performance!
                    </p>
                </div>
            </div>
        `;
    }
    
    const threshold = 70;
    
    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">
                EMPLOYEES REQUIRING IMPROVEMENT
            </h2>
            
            <div style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); border: 2px solid #EF4444; border-radius: 10px; padding: 25px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; color: #7F1D1D; line-height: 1.6;">
                    <strong>Action Required:</strong> The following employees have scored below the ${threshold}% threshold and require targeted development interventions and support.
                </p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: white;">
                        <th style="padding: 15px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Employee Name</th>
                        <th style="padding: 15px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Department</th>
                        <th style="padding: 15px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Designation</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Score</th>
                        <th style="padding: 15px; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Gap to Target</th>
                    </tr>
                </thead>
                <tbody>
                    ${improvement_needed.map((emp, index) => {
                        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                        const score = parseFloat(emp.overall_score);
                        const gap = threshold - score;
                        
                        return `
                            <tr style="background: ${bgColor}; border-bottom: 1px solid #E2E8F0;">
                                <td style="padding: 15px; font-weight: 600; color: #334155;">${emp.First_name} ${emp.Last_name}</td>
                                <td style="padding: 15px; color: #64748B;">${emp.department_name || 'N/A'}</td>
                                <td style="padding: 15px; color: #64748B;">${emp.Designation || 'N/A'}</td>
                                <td style="padding: 15px; text-align: center;">
                                    <span style="background: #FEE2E2; color: #EF4444; padding: 8px 16px; border-radius: 6px; font-weight: 900; font-size: 14px;">
                                        ${score.toFixed(1)}%
                                    </span>
                                </td>
                                <td style="padding: 15px; text-align: center; font-weight: 700; color: #EF4444;">
                                    +${gap.toFixed(1)}%
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; border-radius: 6px; margin-top: 20px;">
                <h4 style="font-size: 13px; font-weight: 700; color: #92400E; margin: 0 0 10px 0; text-transform: uppercase;">
                    RECOMMENDED ACTIONS
                </h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #78350F; line-height: 1.7;">
                    <li>Schedule one-on-one performance improvement discussions</li>
                    <li>Develop personalized development plans with clear milestones</li>
                    <li>Provide targeted training and mentorship opportunities</li>
                    <li>Conduct monthly progress reviews and adjust support as needed</li>
                    <li>Consider workload assessment and resource allocation</li>
                </ul>
            </div>
        </div>
    `;
}

/**
 * Generate Footer
 */
function generateFooter(organizationName) {
    return `
        <div style="border-top: 2px solid #E2E8F0; padding-top: 20px; margin-top: 40px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94A3B8;">
            <div>
                <strong style="color: #64748B;">CONFIDENTIAL</strong> • ${organizationName} • Performance Management System
            </div>
            <div>
                Powered by <strong style="color: #003f88;">Perfomix</strong>
            </div>
        </div>
    `;
}

// ==================== MAIN EXPORT FUNCTION ====================

/**
 * Main function to generate enhanced organization report
 */
export const generateEnhancedOrgReport = async (data) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    try {
        const { header, summary, top_performers, improvement_needed, distribution, dept_stats, manager_stats } = data;
        const timestamp = new Date().toLocaleString('en-US', { 
            dateStyle: 'long', 
            timeStyle: 'short' 
        });
        
        const orgLevel = getPerformanceLevel(summary.average_score);
        const totalCompleted = summary.completed || 1;
        
        // Calculate distribution percentages
        const distWithPercent = distribution.map(d => ({
            ...d,
            percentage: Math.round((d.count / totalCompleted) * 100)
        }));

        const html = `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; max-width: 900px; margin: 0 auto; background: white; padding: 60px 50px;">
                
                ${generateCoverPage(header, summary, timestamp)}
                ${generateExecutiveSummary(summary, orgLevel, distWithPercent, totalCompleted)}
                ${generatePerformanceDistribution(distWithPercent, totalCompleted)}
                ${generateDepartmentAnalysis(dept_stats)}
                ${generateLineManagerSummary(manager_stats)}
                ${generateTopPerformers(top_performers)}
                ${generateImprovementNeeded(improvement_needed)}
                ${generateFooter(header.organization_name)}
                
            </div>
        `;

        container.innerHTML = html;

        // Generate PDF
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1200
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const fileName = `Perfomix_Organization_Report_${header.cycle_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    } finally {
        document.body.removeChild(container);
    }
};
