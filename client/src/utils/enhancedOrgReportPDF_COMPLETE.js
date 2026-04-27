/**
 * Enhanced Organization Performance Report Generator
 * Creates professional, management-ready PDF reports
 * 
 * @author Perfomix Team
 * @version 2.0 - COMPLETE
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getPerformanceRatings } from '../services/performanceRatingService';

// ==================== HELPER FUNCTIONS ====================

/**
 * Get performance level classification from database ratings
 */
const getPerformanceLevel = async (score, ratings) => {
    if (!ratings || ratings.length === 0) {
        // Fallback to default if ratings not available
        const numScore = parseFloat(score) || 0;
        if (numScore >= 85) return { label: 'Excellent', color: '#10B981', bg: '#D1FAE5', icon: '★' };
        if (numScore >= 70) return { label: 'Good', color: '#3B82F6', bg: '#DBEAFE', icon: '●' };
        if (numScore >= 50) return { label: 'Satisfactory', color: '#F59E0B', bg: '#FEF3C7', icon: '▲' };
        return { label: 'Needs Improvement', color: '#EF4444', bg: '#FEE2E2', icon: '!' };
    }
    
    const numScore = parseFloat(score) || 0;
    const rating = ratings.find(r => numScore >= r.min_score && numScore <= r.max_score);
    
    if (rating) {
        return {
            label: rating.name,
            color: rating.color,
            bg: rating.bg_color || rating.color,
            icon: '★'
        };
    }
    
    return { label: 'Not Rated', color: '#9E9E9E', bg: '#F5F5F5', icon: '?' };
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
 * Generate Performance Distribution Cards (standalone section)
 */
function generateDistributionCards(distWithPercent, totalCompleted) {
    const LEVELS = [
        { key: 'Excellent',         color: '#10B981', bg: '#D1FAE5' },
        { key: 'Average',           color: '#3B82F6', bg: '#DBEAFE' },
        { key: 'Needs Improvement', color: '#EF4444', bg: '#FEE2E2' },
    ];

    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">
                PERFORMANCE DISTRIBUTION
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                ${LEVELS.map(lvl => {
                    const found = distWithPercent.find(d => d.level === lvl.key);
                    const count = found ? found.count : 0;
                    const pct   = found ? found.percentage : 0;
                    return `
                        <div style="text-align: center; padding: 24px 16px; background: ${lvl.bg}; border-radius: 10px; border: 2px solid ${lvl.color};">
                            <div style="font-size: 40px; font-weight: 900; color: ${lvl.color}; margin-bottom: 6px;">${count}</div>
                            <div style="font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">${lvl.key}</div>
                            <div style="font-size: 16px; color: ${lvl.color}; font-weight: 800; margin-top: 6px;">${pct}%</div>
                        </div>
                    `;
                }).join('')}
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
 * Generate Department Performance Comparison (redesigned)
 */
function generateDepartmentAnalysis(dept_stats) {
    if (!dept_stats || dept_stats.length === 0) {
        return '<div style="margin-bottom: 50px;"><p style="color: #64748B;">No department data available.</p></div>';
    }

    const sorted = [...dept_stats].sort((a, b) => parseFloat(b.avg_score||0) - parseFloat(a.avg_score||0));
    const top = sorted[0];
    const low = sorted[sorted.length - 1];
    const totalOrg = sorted.reduce((s, d) => s + (d.emp_count || 0), 0);

    // SVG horizontal bar chart
    const chartW = 760;
    const rowH = 36;
    const labelW = 160;
    const barAreaW = chartW - labelW - 60;
    const chartH = sorted.length * rowH + 20;

    const bars = sorted.map((d, i) => {
        const score = parseFloat(d.avg_score || 0);
        const isTop = d.Department_name === top.Department_name;
        const isLow = d.Department_name === low.Department_name;
        const color = isTop ? '#10B981' : isLow ? '#EF4444' : '#3B82F6';
        const barW = Math.round((score / 100) * barAreaW);
        const y = i * rowH + 10;
        const name = d.Department_name.length > 20 ? d.Department_name.substring(0, 19) + '…' : d.Department_name;
        return `
            <text x="${labelW - 8}" y="${y + 14}" text-anchor="end" font-size="11" fill="#334155" font-weight="600">${name}</text>
            <rect x="${labelW}" y="${y}" width="${barW}" height="22" rx="4" fill="${color}" opacity="0.85"/>
            <text x="${labelW + barW + 6}" y="${y + 14}" font-size="11" fill="${color}" font-weight="800">${score.toFixed(1)}%</text>
        `;
    }).join('');

    // Auto insights
    const insights = [
        `${top.Department_name} is the top-performing department with an average score of ${parseFloat(top.avg_score).toFixed(1)}%.`,
        `${low.Department_name} requires attention with the lowest average score of ${parseFloat(low.avg_score).toFixed(1)}%.`,
    ];
    if (sorted.length >= 3) {
        const highCompletion = [...sorted].sort((a,b) => (b.emp_count||0) - (a.emp_count||0))[0];
        insights.push(`${highCompletion.Department_name} has the highest employee count (${highCompletion.emp_count}) in this cycle.`);
    }

    const lowScore = parseFloat(low.avg_score || 0);
    const lowNeedsAttention = lowScore < 70;

    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
                DEPARTMENT PERFORMANCE COMPARISON
            </h2>

            <!-- Highlight badges -->
            <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                <div style="flex:1; background: #D1FAE5; border: 2px solid #10B981; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">🟢</span>
                    <div>
                        <div style="font-size: 11px; color: #065F46; font-weight: 700; text-transform: uppercase;">Best Department</div>
                        <div style="font-size: 16px; font-weight: 900; color: #065F46;">${top.Department_name}</div>
                        <div style="font-size: 13px; color: #10B981; font-weight: 700;">${parseFloat(top.avg_score).toFixed(1)}%</div>
                    </div>
                </div>
                ${lowNeedsAttention ? `
                <div style="flex:1; background: #FEE2E2; border: 2px solid #EF4444; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">🔴</span>
                    <div>
                        <div style="font-size: 11px; color: #7F1D1D; font-weight: 700; text-transform: uppercase;">Needs Attention</div>
                        <div style="font-size: 16px; font-weight: 900; color: #7F1D1D;">${low.Department_name}</div>
                        <div style="font-size: 13px; color: #EF4444; font-weight: 700;">${lowScore.toFixed(1)}%</div>
                    </div>
                </div>
                ` : `
                <div style="flex:1; background: #F0FDF4; border: 2px solid #10B981; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">✅</span>
                    <div>
                        <div style="font-size: 11px; color: #065F46; font-weight: 700; text-transform: uppercase;">All Departments</div>
                        <div style="font-size: 15px; font-weight: 700; color: #065F46;">Performing Well</div>
                        <div style="font-size: 12px; color: #10B981;">All departments above 70%</div>
                    </div>
                </div>
                `}
            </div>

            <!-- Horizontal bar chart -->
            <div style="background: white; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Average Performance Score by Department</div>
                <svg width="${chartW}" height="${chartH}" xmlns="http://www.w3.org/2000/svg">
                    <!-- X-axis ticks -->
                    ${[0,25,50,75,100].map(tick => {
                        const x = labelW + Math.round((tick/100) * barAreaW);
                        return `<line x1="${x}" y1="0" x2="${x}" y2="${chartH}" stroke="#F1F5F9" stroke-width="1"/>
                                <text x="${x}" y="${chartH}" text-anchor="middle" font-size="9" fill="#94A3B8">${tick}%</text>`;
                    }).join('')}
                    ${bars}
                </svg>
            </div>

            <!-- Compact summary table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                        <th style="padding: 10px 12px; text-align: left; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px;">Department</th>
                        <th style="padding: 10px 12px; text-align: center; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px;">Avg Score</th>
                        <th style="padding: 10px 12px; text-align: center; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px;">Employees</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map((d, i) => {
                        const score = parseFloat(d.avg_score || 0);
                        const isTop = d.Department_name === top.Department_name;
                        const isLow = d.Department_name === low.Department_name;
                        const scoreColor = isTop ? '#10B981' : (isLow && score < 70) ? '#EF4444' : '#334155';
                        return `
                            <tr style="border-bottom: 1px solid #F1F5F9; background: ${i % 2 === 0 ? '#fff' : '#F8FAFC'};">
                                <td style="padding: 9px 12px; font-weight: 600; color: #334155;">
                                    ${isTop ? '🟢 ' : (isLow && score < 70) ? '🔴 ' : ''}${d.Department_name}
                                </td>
                                <td style="padding: 9px 12px; text-align: center; font-weight: 800; color: ${scoreColor};">${score.toFixed(1)}%</td>
                                <td style="padding: 9px 12px; text-align: center; color: #64748B;">${d.emp_count || 0}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <!-- Insights -->
            <div style="background: #F8FAFC; border-left: 4px solid #003f88; border-radius: 6px; padding: 16px 20px;">
                <div style="font-size: 12px; font-weight: 700; color: #003f88; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Key Insights</div>
                ${insights.map(ins => `
                    <div style="display: flex; gap: 8px; margin-bottom: 6px; font-size: 12px; color: #334155; line-height: 1.5;">
                        <span style="color: #003f88; font-weight: 700; flex-shrink: 0;">→</span>${ins}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Generate Team Performance Insights
 */
function generateTeamInsights(teamData) {
    if (!teamData || teamData.length === 0) {
        return '<div style="margin-bottom: 50px;"><p style="color: #64748B;">No team data available.</p></div>';
    }

    const sorted = [...teamData].sort((a, b) => parseFloat(b.avg_score||0) - parseFloat(a.avg_score||0));
    const total = sorted.length;
    const splitAt = Math.min(3, Math.floor(total / 2));
    const top = sorted.slice(0, splitAt);
    const bottomRaw = total > splitAt ? sorted.slice(-splitAt) : [];
    // Remove duplicates (if total < 6)
    const topIds = new Set(top.map(t => t.team_name));
    const bottom = bottomRaw.filter(t => !topIds.has(t.team_name));

    const allAbove80 = bottom.every(t => parseFloat(t.avg_score||0) >= 80);

    const getTopLabel = (score) => {
        if (score >= 80) return { text: 'Top Performing Team', color: '#065F46', bg: '#D1FAE5' };
        if (score >= 70) return { text: 'Best Performing (Average Level)', color: '#92400E', bg: '#FEF3C7' };
        return { text: 'Highest Among Low Performers', color: '#7F1D1D', bg: '#FEE2E2' };
    };

    const getBottomLabel = (score) => {
        if (score < 70) return { text: 'Needs Attention', color: '#7F1D1D', bg: '#FEE2E2' };
        if (score < 80) return { text: 'Improvement Opportunity', color: '#92400E', bg: '#FEF3C7' };
        return null;
    };

    const teamCard = (t, label, borderColor) => {
        const score = parseFloat(t.avg_score || 0);
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1.5px solid ${borderColor}; border-radius: 8px; margin-bottom: 10px; background: white;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; font-weight: 700; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.team_name}</div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${t.department_name || 'N/A'}</div>
                    ${label ? `<span style="display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; background: ${label.bg}; color: ${label.color};">${label.text}</span>` : ''}
                </div>
                <div style="font-size: 22px; font-weight: 900; color: ${borderColor}; margin-left: 16px; flex-shrink: 0;">${score.toFixed(1)}%</div>
            </div>
        `;
    };

    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
                TEAM PERFORMANCE INSIGHTS
            </h2>

            <div style="display: flex; gap: 20px;">
                <!-- Top Teams -->
                <div style="flex: 1;">
                    <div style="font-size: 12px; font-weight: 700; color: #065F46; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; padding: 6px 12px; background: #D1FAE5; border-radius: 6px; display: inline-block;">
                        🏆 Top ${top.length} Teams
                    </div>
                    ${top.map(t => {
                        const score = parseFloat(t.avg_score || 0);
                        const label = getTopLabel(score);
                        return teamCard(t, label, '#10B981');
                    }).join('')}
                </div>

                <!-- Bottom Teams -->
                <div style="flex: 1;">
                    ${allAbove80 ? `
                        <div style="font-size: 12px; font-weight: 700; color: #065F46; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; padding: 6px 12px; background: #D1FAE5; border-radius: 6px; display: inline-block;">
                            ✅ All Teams Performing Well
                        </div>
                        <div style="background: #F0FDF4; border: 2px solid #10B981; border-radius: 10px; padding: 20px; text-align: center; color: #065F46; font-size: 13px; font-weight: 600;">
                            All teams are scoring 80% or above. No teams require attention at this time.
                        </div>
                    ` : `
                        <div style="font-size: 12px; font-weight: 700; color: #7F1D1D; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; padding: 6px 12px; background: #FEE2E2; border-radius: 6px; display: inline-block;">
                            ⚠️ Bottom ${bottom.length} Teams
                        </div>
                        ${bottom.map(t => {
                            const score = parseFloat(t.avg_score || 0);
                            const label = getBottomLabel(score);
                            const borderColor = score < 70 ? '#EF4444' : '#F59E0B';
                            return teamCard(t, label, borderColor);
                        }).join('')}
                    `}
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate Performance Benchmarking Section
 */
function generateBenchmarking(benchData) {
    if (!benchData) {
        return '<div style="margin-bottom: 50px;"><p style="color: #64748B;">No benchmarking data available.</p></div>';
    }

    const orgAvg    = parseFloat(benchData.orgAvg    || 0);
    const top25Avg  = parseFloat(benchData.top25Avg  || 0);
    const bot25Avg  = parseFloat(benchData.bottom25Avg || 0);
    const topGap    = parseFloat((top25Avg  - orgAvg).toFixed(1));
    const botGap    = parseFloat((orgAvg    - bot25Avg).toFixed(1));
    const totalGap  = parseFloat((top25Avg  - bot25Avg).toFixed(1));

    // Not enough data guard
    if (orgAvg === 0 && top25Avg === 0) {
        return `
            <div style="margin-bottom: 50px; page-break-inside: avoid;">
                <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
                    PERFORMANCE BENCHMARKING
                </h2>
                <div style="background: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 10px; padding: 30px; text-align: center; color: #94A3B8; font-size: 14px;">
                    Not enough data for benchmarking analysis.
                </div>
            </div>`;
    }

    // Smart interpretation
    let interpretation = '';
    let interpColor = '#334155';
    let interpBg = '#F8FAFC';
    if (totalGap < 10) {
        interpretation = 'Performance across employees is relatively balanced — the gap between top and bottom performers is minimal.';
        interpColor = '#065F46'; interpBg = '#F0FDF4';
    } else if (totalGap > 20) {
        interpretation = `Significant performance gap exists between top and low performers (${totalGap}% spread). Targeted development plans are recommended.`;
        interpColor = '#7F1D1D'; interpBg = '#FEF2F2';
    } else {
        interpretation = `Moderate performance spread of ${totalGap}% between top and bottom quartiles. Continued coaching can help close this gap.`;
        interpColor = '#92400E'; interpBg = '#FFFBEB';
    }

    // SVG horizontal bar chart
    const chartW = 700;
    const barH = 28;
    const labelW = 160;
    const barAreaW = chartW - labelW - 80;
    const maxVal = Math.max(top25Avg, orgAvg, bot25Avg, 1);

    const bars = [
        { label: 'Top 25% Avg',   value: top25Avg, color: '#10B981' },
        { label: 'Org Average',   value: orgAvg,   color: '#3B82F6' },
        { label: 'Bottom 25% Avg',value: bot25Avg, color: '#EF4444' },
    ];

    const svgBars = bars.map((b, i) => {
        const bw = Math.round((b.value / 100) * barAreaW);
        const y = i * (barH + 16) + 10;
        return `
            <text x="${labelW - 8}" y="${y + 18}" text-anchor="end" font-size="12" fill="#334155" font-weight="600">${b.label}</text>
            <rect x="${labelW}" y="${y}" width="${bw}" height="${barH}" rx="5" fill="${b.color}" opacity="0.85"/>
            <text x="${labelW + bw + 8}" y="${y + 18}" font-size="12" fill="${b.color}" font-weight="800">${b.value.toFixed(1)}%</text>
        `;
    }).join('');

    const chartH = bars.length * (barH + 16) + 20;

    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
                PERFORMANCE BENCHMARKING
            </h2>

            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div style="background: #EFF6FF; border: 2px solid #3B82F6; border-radius: 10px; padding: 18px; text-align: center;">
                    <div style="font-size: 11px; color: #1E40AF; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Org Average</div>
                    <div style="font-size: 34px; font-weight: 900; color: #1D4ED8;">${orgAvg.toFixed(1)}%</div>
                </div>
                <div style="background: #F0FDF4; border: 2px solid #10B981; border-radius: 10px; padding: 18px; text-align: center;">
                    <div style="font-size: 11px; color: #065F46; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Top 25% Avg</div>
                    <div style="font-size: 34px; font-weight: 900; color: #10B981;">${top25Avg.toFixed(1)}%</div>
                    <div style="font-size: 12px; color: #10B981; font-weight: 600; margin-top: 4px;">+${topGap}% above avg</div>
                </div>
                <div style="background: #FEF2F2; border: 2px solid #EF4444; border-radius: 10px; padding: 18px; text-align: center;">
                    <div style="font-size: 11px; color: #7F1D1D; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Bottom 25% Avg</div>
                    <div style="font-size: 34px; font-weight: 900; color: #EF4444;">${bot25Avg.toFixed(1)}%</div>
                    <div style="font-size: 12px; color: #EF4444; font-weight: 600; margin-top: 4px;">-${botGap}% below avg</div>
                </div>
            </div>

            <!-- Bar Chart -->
            <div style="background: white; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">Performance Spread Comparison</div>
                <svg width="${chartW}" height="${chartH}" xmlns="http://www.w3.org/2000/svg">
                    ${[0,25,50,75,100].map(tick => {
                        const x = labelW + Math.round((tick/100) * barAreaW);
                        return `<line x1="${x}" y1="0" x2="${x}" y2="${chartH - 10}" stroke="#F1F5F9" stroke-width="1"/>
                                <text x="${x}" y="${chartH}" text-anchor="middle" font-size="9" fill="#94A3B8">${tick}%</text>`;
                    }).join('')}
                    ${svgBars}
                </svg>
            </div>

            <!-- Gap Analysis -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                <div style="background: #F0FDF4; border-left: 4px solid #10B981; border-radius: 6px; padding: 14px 16px;">
                    <div style="font-size: 11px; color: #065F46; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Top Performer Gap</div>
                    <div style="font-size: 16px; font-weight: 800; color: #10B981;">+${topGap}%</div>
                    <div style="font-size: 12px; color: #334155; margin-top: 4px;">Top performers exceed organizational average by +${topGap}%</div>
                </div>
                <div style="background: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 6px; padding: 14px 16px;">
                    <div style="font-size: 11px; color: #7F1D1D; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Bottom Performer Gap</div>
                    <div style="font-size: 16px; font-weight: 800; color: #EF4444;">-${botGap}%</div>
                    <div style="font-size: 12px; color: #334155; margin-top: 4px;">Bottom performers are below average by -${botGap}%</div>
                </div>
            </div>

            <!-- Smart Interpretation -->
            <div style="background: ${interpBg}; border-left: 4px solid ${interpColor}; border-radius: 6px; padding: 14px 18px;">
                <div style="font-size: 11px; font-weight: 700; color: ${interpColor}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Interpretation</div>
                <div style="font-size: 13px; color: #334155; line-height: 1.6;">${interpretation}</div>
            </div>
        </div>
    `;
}

/**
 * Generate Evaluation Completion Analysis Section
 */
function generateCompletionAnalysis(summary, dept_stats) {
    const completed = parseInt(summary?.completed || 0);
    const total     = parseInt(summary?.total_employees || 0);
    const pending   = total - completed;
    const compPct   = total > 0 ? Math.round((completed / total) * 100) : 0;
    const pendPct   = 100 - compPct;

    // SVG donut chart (simple arc approximation via two arcs)
    const cx = 80, cy = 80, r = 60, stroke = 22;
    const circ = 2 * Math.PI * r;
    const compDash = (compPct / 100) * circ;
    const pendDash = circ - compDash;

    // Department breakdown bars
    const deptRows = (dept_stats || []).map((d, i) => {
        const dComp  = parseInt(d.emp_count   || 0);
        const dTotal = parseInt(d.total_count || dComp || 1);
        const pct    = dTotal > 0 ? Math.round((dComp / dTotal) * 100) : 0;
        return `
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
                    <span style="font-weight: 600; color: #334155;">${d.Department_name}</span>
                    <span style="color: #64748B;">${dComp}/${dTotal} completed (${pct}%)</span>
                </div>
                <div style="height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${pct}%; height: 100%; background: ${pct >= 80 ? '#10B981' : pct >= 50 ? '#3B82F6' : '#F59E0B'}; border-radius: 4px;"></div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
                EVALUATION COMPLETION ANALYSIS
            </h2>

            <div style="display: flex; gap: 24px; align-items: flex-start;">

                <!-- Donut chart + legend -->
                <div style="background: white; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 20px; min-width: 220px; text-align: center;">
                    <svg width="160" height="160" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
                        <!-- Background circle -->
                        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="${stroke}"/>
                        <!-- Completed arc -->
                        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#10B981" stroke-width="${stroke}"
                            stroke-dasharray="${compDash.toFixed(1)} ${pendDash.toFixed(1)}"
                            stroke-dashoffset="${(circ * 0.25).toFixed(1)}"
                            transform="rotate(-90 ${cx} ${cy})"/>
                        <!-- Pending arc -->
                        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F59E0B" stroke-width="${stroke}"
                            stroke-dasharray="${pendDash.toFixed(1)} ${compDash.toFixed(1)}"
                            stroke-dashoffset="${(circ * 0.25 - compDash).toFixed(1)}"
                            transform="rotate(-90 ${cx} ${cy})"/>
                        <!-- Center text -->
                        <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="22" font-weight="900" fill="#1E293B">${compPct}%</text>
                        <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" fill="#64748B">Completed</text>
                    </svg>
                    <!-- Legend -->
                    <div style="display: flex; justify-content: center; gap: 16px; margin-top: 8px; font-size: 12px;">
                        <span><span style="display:inline-block;width:10px;height:10px;background:#10B981;border-radius:2px;margin-right:4px;"></span>Completed (${completed})</span>
                        <span><span style="display:inline-block;width:10px;height:10px;background:#F59E0B;border-radius:2px;margin-right:4px;"></span>Pending (${pending})</span>
                    </div>
                </div>

                <!-- Department breakdown -->
                <div style="flex: 1; background: white; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 20px;">
                    <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">Completion by Department</div>
                    ${deptRows || '<div style="color:#94A3B8;font-size:13px;">No department data available.</div>'}
                    <div style="display: flex; gap: 12px; margin-top: 12px; font-size: 11px; color: #64748B;">
                        <span><span style="display:inline-block;width:8px;height:8px;background:#10B981;border-radius:2px;margin-right:3px;"></span>≥80%</span>
                        <span><span style="display:inline-block;width:8px;height:8px;background:#3B82F6;border-radius:2px;margin-right:3px;"></span>50–79%</span>
                        <span><span style="display:inline-block;width:8px;height:8px;background:#F59E0B;border-radius:2px;margin-right:3px;"></span>&lt;50%</span>
                    </div>
                </div>
            </div>
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
    // Filter strictly > 80, sort descending, cap at 5
    const filtered = (top_performers || [])
        .filter(e => parseFloat(e.overall_score) > 80)
        .sort((a, b) => parseFloat(b.overall_score) - parseFloat(a.overall_score))
        .slice(0, 5);

    if (filtered.length === 0) {
        return `
            <div style="margin-bottom: 50px; page-break-inside: avoid;">
                <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
                    TOP PERFORMERS
                </h2>
                <div style="background: #FFFBEB; border: 2px solid #F59E0B; border-radius: 10px; padding: 28px; text-align: center;">
                    <div style="font-size: 28px; margin-bottom: 10px;">⚠️</div>
                    <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: 600;">
                        No high-performing employees in this cycle. (Threshold: score &gt; 80%)
                    </p>
                </div>
            </div>
        `;
    }

    // Insights
    const deptCount = {};
    filtered.forEach(e => {
        const d = e.department_name || 'Unknown';
        deptCount[d] = (deptCount[d] || 0) + 1;
    });
    const topDept = Object.entries(deptCount).sort((a, b) => b[1] - a[1])[0];
    const highest = parseFloat(filtered[0].overall_score).toFixed(1);

    const getLabel = (score) => {
        if (score >= 90) return { text: 'Exceptional', bg: '#D1FAE5', color: '#065F46' };
        return { text: 'High Performer', bg: '#ECFDF5', color: '#10B981' };
    };

    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
                TOP PERFORMERS
            </h2>

            <!-- Insights -->
            <div style="background: #F0FDF4; border-left: 4px solid #10B981; border-radius: 6px; padding: 14px 18px; margin-bottom: 18px;">
                <div style="font-size: 11px; font-weight: 700; color: #065F46; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Key Insights</div>
                <div style="font-size: 13px; color: #334155; margin-bottom: 4px;">→ Highest score achieved this cycle: <strong>${highest}%</strong></div>
                ${topDept ? `<div style="font-size: 13px; color: #334155;">→ Top performers are concentrated in <strong>${topDept[0]}</strong> department.</div>` : ''}
            </div>

            <!-- Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #F0FDF4; border-bottom: 2px solid #BBF7D0;">
                        <th style="padding: 11px 12px; text-align: left; font-weight: 700; color: #065F46; text-transform: uppercase; font-size: 11px;">#</th>
                        <th style="padding: 11px 12px; text-align: left; font-weight: 700; color: #065F46; text-transform: uppercase; font-size: 11px;">Employee Name</th>
                        <th style="padding: 11px 12px; text-align: left; font-weight: 700; color: #065F46; text-transform: uppercase; font-size: 11px;">Department</th>
                        <th style="padding: 11px 12px; text-align: center; font-weight: 700; color: #065F46; text-transform: uppercase; font-size: 11px;">Score</th>
                        <th style="padding: 11px 12px; text-align: center; font-weight: 700; color: #065F46; text-transform: uppercase; font-size: 11px;">Badge</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map((emp, i) => {
                        const score = parseFloat(emp.overall_score);
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                        const lbl = getLabel(score);
                        return `
                            <tr style="border-bottom: 1px solid #F1F5F9; background: ${i % 2 === 0 ? '#fff' : '#F9FFF9'};">
                                <td style="padding: 10px 12px; font-size: 16px;">${medal}</td>
                                <td style="padding: 10px 12px; font-weight: 600; color: #1E293B;">${emp.First_name} ${emp.Last_name}</td>
                                <td style="padding: 10px 12px; color: #64748B;">${emp.department_name || 'N/A'}</td>
                                <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #10B981;">${score.toFixed(1)}%</td>
                                <td style="padding: 10px 12px; text-align: center;">
                                    <span style="background: ${lbl.bg}; color: ${lbl.color}; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;">🟢 ${lbl.text}</span>
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
 * Generate Employees Needing Attention Section
 */
function generateImprovementNeeded(improvement_needed) {
    // Filter strictly < 70, sort ascending, cap at 10
    const filtered = (improvement_needed || [])
        .filter(e => parseFloat(e.overall_score) < 70)
        .sort((a, b) => parseFloat(a.overall_score) - parseFloat(b.overall_score))
        .slice(0, 10);

    if (filtered.length === 0) {
        return `
            <div style="margin-bottom: 50px; page-break-inside: avoid;">
                <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
                    EMPLOYEES NEEDING ATTENTION
                </h2>
                <div style="background: #F0FDF4; border: 2px solid #10B981; border-radius: 10px; padding: 28px; text-align: center;">
                    <div style="font-size: 28px; margin-bottom: 10px;">✅</div>
                    <p style="margin: 0; font-size: 14px; color: #065F46; font-weight: 600;">
                        No employees require attention. Overall performance is satisfactory.
                    </p>
                </div>
            </div>
        `;
    }

    // Insights
    const deptCount = {};
    filtered.forEach(e => {
        const d = e.department_name || 'Unknown';
        deptCount[d] = (deptCount[d] || 0) + 1;
    });
    const topDept = Object.entries(deptCount).sort((a, b) => b[1] - a[1])[0];
    const criticalCount = filtered.filter(e => parseFloat(e.overall_score) < 50).length;

    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
                EMPLOYEES NEEDING ATTENTION
            </h2>

            <!-- Insights -->
            <div style="background: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 6px; padding: 14px 18px; margin-bottom: 18px;">
                <div style="font-size: 11px; font-weight: 700; color: #7F1D1D; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Key Insights</div>
                <div style="font-size: 13px; color: #334155; margin-bottom: 4px;">→ ${filtered.length} employee${filtered.length > 1 ? 's' : ''} fall below the acceptable performance threshold (70%).</div>
                ${topDept ? `<div style="font-size: 13px; color: #334155;">→ Majority of low performers belong to <strong>${topDept[0]}</strong> department (${topDept[1]} employee${topDept[1] > 1 ? 's' : ''}).</div>` : ''}
            </div>

            <!-- Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                    <tr style="background: #FEF2F2; border-bottom: 2px solid #FECACA;">
                        <th style="padding: 11px 12px; text-align: left; font-weight: 700; color: #991B1B; text-transform: uppercase; font-size: 11px;">Employee Name</th>
                        <th style="padding: 11px 12px; text-align: left; font-weight: 700; color: #991B1B; text-transform: uppercase; font-size: 11px;">Department</th>
                        <th style="padding: 11px 12px; text-align: center; font-weight: 700; color: #991B1B; text-transform: uppercase; font-size: 11px;">Score</th>
                        <th style="padding: 11px 12px; text-align: center; font-weight: 700; color: #991B1B; text-transform: uppercase; font-size: 11px;">Flag</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map((emp, i) => {
                        const score = parseFloat(emp.overall_score);
                        const isCritical = score < 50;
                        const flagBg    = isCritical ? '#FEE2E2' : '#FEF3C7';
                        const flagColor = isCritical ? '#DC2626' : '#D97706';
                        const flagText  = isCritical ? '🔴 Critical' : '🟡 Moderate';
                        return `
                            <tr style="border-bottom: 1px solid #F1F5F9; background: ${i % 2 === 0 ? '#fff' : '#FFF9F9'};">
                                <td style="padding: 10px 12px; font-weight: 600; color: #1E293B;">${emp.First_name} ${emp.Last_name}</td>
                                <td style="padding: 10px 12px; color: #64748B;">${emp.department_name || 'N/A'}</td>
                                <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: ${isCritical ? '#DC2626' : '#D97706'};">${score.toFixed(1)}%</td>
                                <td style="padding: 10px 12px; text-align: center;">
                                    <span style="background: ${flagBg}; color: ${flagColor}; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;">${flagText}</span>
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
 * Generate Footer
 */
function generateFooter(organizationName) {
    const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
    return `
        <div style="margin-top: 50px; border-top: 3px solid #003f88; padding-top: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <div style="font-size: 16px; font-weight: 800; color: #003f88;">Perfomix</div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Performance Management System</div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #94A3B8;">
                    <div>Generated: ${timestamp}</div>
                    <div style="margin-top: 2px;">${organizationName}</div>
                </div>
            </div>
            <div style="margin-top: 14px; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 11px; color: #94A3B8; text-align: center;">
                Generated by Perfomix · ${timestamp}
            </div>
        </div>
    `;
}

/**
 * Generate Organization Performance Trend Section
 */
function generateOrgTrend(trendData) {
    if (!trendData || trendData.length < 2) {
        return `
            <div style="margin-bottom: 50px; page-break-inside: avoid;">
                <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">
                    ORGANIZATION PERFORMANCE TREND
                </h2>
                <div style="background: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 10px; padding: 30px; text-align: center; color: #94A3B8; font-size: 14px;">
                    Not enough cycles to display trend data.
                </div>
            </div>
        `;
    }

    const scores = trendData.map(t => parseFloat(t.avg_score || 0));
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const lastScore = scores[scores.length - 1];
    const prevScore = scores[scores.length - 2];
    const trend = lastScore >= prevScore ? 'improving' : 'declining';
    const trendColor = trend === 'improving' ? '#10B981' : '#EF4444';
    const trendIcon = trend === 'improving' ? '↑' : '↓';
    const chartWidth = 760;
    const chartHeight = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerW = chartWidth - padding.left - padding.right;
    const innerH = chartHeight - padding.top - padding.bottom;
    const yMin = Math.max(0, Math.floor(minScore - 10));
    const yMax = Math.min(100, Math.ceil(maxScore + 10));
    const xStep = innerW / (trendData.length - 1);

    const points = trendData.map((t, i) => {
        const x = padding.left + i * xStep;
        const y = padding.top + innerH - ((parseFloat(t.avg_score || 0) - yMin) / (yMax - yMin)) * innerH;
        return { x, y, score: parseFloat(t.avg_score || 0), cycle: t.cycle_name };
    });

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaPath = `M ${points[0].x},${padding.top + innerH} ` +
        points.map(p => `L ${p.x},${p.y}`).join(' ') +
        ` L ${points[points.length-1].x},${padding.top + innerH} Z`;

    const yTicks = [yMin, Math.round((yMin+yMax)/2), yMax];

    return `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
            <h2 style="font-size: 22px; font-weight: 800; color: #0F172A; border-bottom: 3px solid #003f88; padding-bottom: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">
                ORGANIZATION PERFORMANCE TREND
            </h2>

            <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                <div style="flex:1; background: #F8FAFC; border-left: 4px solid ${trendColor}; border-radius: 8px; padding: 16px;">
                    <div style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 600;">Trend</div>
                    <div style="font-size: 22px; font-weight: 900; color: ${trendColor};">${trendIcon} ${trend.charAt(0).toUpperCase() + trend.slice(1)}</div>
                    <div style="font-size: 11px; color: #94A3B8;">${Math.abs(lastScore - prevScore).toFixed(1)}% vs last cycle</div>
                </div>
                <div style="flex:1; background: #F8FAFC; border-left: 4px solid #10B981; border-radius: 8px; padding: 16px;">
                    <div style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 600;">Best Cycle</div>
                    <div style="font-size: 18px; font-weight: 800; color: #10B981;">${trendData[scores.indexOf(maxScore)]?.cycle_name}</div>
                    <div style="font-size: 13px; color: #10B981; font-weight: 700;">${maxScore.toFixed(1)}%</div>
                </div>
                <div style="flex:1; background: #F8FAFC; border-left: 4px solid #EF4444; border-radius: 8px; padding: 16px;">
                    <div style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 600;">Worst Cycle</div>
                    <div style="font-size: 18px; font-weight: 800; color: #EF4444;">${trendData[scores.indexOf(minScore)]?.cycle_name}</div>
                    <div style="font-size: 13px; color: #EF4444; font-weight: 700;">${minScore.toFixed(1)}%</div>
                </div>
            </div>

            <div style="background: white; border: 2px solid #E2E8F0; border-radius: 10px; padding: 20px;">
                <svg width="${chartWidth}" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
                    <!-- Grid lines -->
                    ${yTicks.map(tick => {
                        const y = padding.top + innerH - ((tick - yMin) / (yMax - yMin)) * innerH;
                        return `<line x1="${padding.left}" y1="${y}" x2="${padding.left + innerW}" y2="${y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4"/>
                                <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#94A3B8">${tick}%</text>`;
                    }).join('')}
                    <!-- Area fill -->
                    <path d="${areaPath}" fill="#003f8820" />
                    <!-- Line -->
                    <polyline points="${polyline}" fill="none" stroke="#003f88" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
                    <!-- Data points -->
                    ${points.map((p, i) => {
                        const isBest = p.score === maxScore;
                        const isWorst = p.score === minScore;
                        const dotColor = isBest ? '#10B981' : isWorst ? '#EF4444' : '#003f88';
                        return `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${dotColor}" stroke="white" stroke-width="2"/>
                                <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="10" font-weight="700" fill="${dotColor}">${p.score.toFixed(1)}%</text>
                                <text x="${p.x}" y="${padding.top + innerH + 20}" text-anchor="middle" font-size="9" fill="#64748B">${p.cycle.length > 12 ? p.cycle.substring(0,12)+'…' : p.cycle}</text>`;
                    }).join('')}
                </svg>
            </div>
        </div>
    `;
}



/**
 * Main function to generate enhanced organization report
 */
export const generateEnhancedOrgReport = async (data) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1000px';
    document.body.appendChild(container);

    try {
        const ratings = await getPerformanceRatings();

        // Fetch trend data
        let trendData = [];
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/reports/admin/org-trend', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            trendData = json.trend || [];
        } catch (e) { /* trend optional */ }

        // Fetch team insights
        let teamData = [];
        try {
            const token = localStorage.getItem('token');
            // Use _cycleId passed directly, or fall back to data.header.cycle_id
            const cycleId = data._cycleId || data.header?.cycle_id;
            console.log('[PDF] Fetching team insights for cycle_id:', cycleId);

            if (cycleId) {
                const res = await fetch(`http://localhost:5000/api/reports/admin/team-insights?cycle_id=${cycleId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                console.log('[PDF] Team insights response:', json);
                const seen = new Set();
                for (const t of [...(json.top3||[]), ...(json.bottom3||[])]) {
                    if (!seen.has(t.team_name)) { seen.add(t.team_name); teamData.push(t); }
                }
            }
        } catch (e) { console.warn('Team insights fetch failed:', e); }

        // Fetch benchmarking data
        let benchData = null;
        try {
            const token = localStorage.getItem('token');
            const cycleId = data._cycleId || data.header?.cycle_id;
            if (cycleId) {
                const res = await fetch(`http://localhost:5000/api/reports/admin/benchmarking?cycle_id=${cycleId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                if (json.success) benchData = json;
            }
        } catch (e) { console.warn('Benchmarking fetch failed:', e); }

        const { header, summary, top_performers, improvement_needed, distribution, dept_stats, manager_stats } = data;
        const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

        const orgLevel = await getPerformanceLevel(summary.average_score, ratings);
        const totalCompleted = summary.completed || 1;

        const distWithPercent = await Promise.all(distribution.map(async d => {
            const score = d.level === 'Excellent' ? 85 : d.level === 'Average' ? 75 : 40;
            const level = await getPerformanceLevel(score, ratings);
            return { ...d, percentage: Math.round((d.count / totalCompleted) * 100), levelData: level };
        }));

        // Sort: Excellent → Average → Needs Improvement
        const DIST_ORDER = ['Excellent', 'Average', 'Needs Improvement'];
        distWithPercent.sort((a, b) => {
            const ai = DIST_ORDER.indexOf(a.level);
            const bi = DIST_ORDER.indexOf(b.level);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        const wrapSection = (content) => `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; max-width: 900px; margin: 0 auto; background: white; padding: 60px 50px;">
                ${content}
            </div>`;

        const part1Html = wrapSection(`
            ${generateCoverPage(header, summary, timestamp)}
            ${generateExecutiveSummary(summary, orgLevel, distWithPercent, totalCompleted)}
        `);

        const part1bHtml = wrapSection(`
            ${generateOrgTrend(trendData)}
            ${generateDistributionCards(distWithPercent, totalCompleted)}
            ${generatePerformanceDistribution(distWithPercent, totalCompleted)}
        `);

        const part1cHtml = wrapSection(`
            ${generateDepartmentAnalysis(dept_stats)}
        `);

        const part2Html = wrapSection(`
            ${generateTeamInsights(teamData)}
            ${generateBenchmarking(benchData)}
        `);

        const part3Html = wrapSection(`
            ${generateTopPerformers(top_performers)}
            ${generateImprovementNeeded(improvement_needed)}
            ${generateCompletionAnalysis(summary, dept_stats)}
            ${generateFooter(header.organization_name)}
        `);

        const renderPart = async (html) => {
            const div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.left = '-9999px';
            div.style.top = '0';
            div.style.width = '1000px';
            div.innerHTML = html;
            document.body.appendChild(div);
            const canvas = await html2canvas(div, {
                scale: 2, useCORS: true, logging: false,
                backgroundColor: '#ffffff', windowWidth: 1200,
                height: div.scrollHeight, windowHeight: div.scrollHeight
            });
            document.body.removeChild(div);
            return canvas;
        };

        const [canvas1, canvas1b, canvas1c, canvas2, canvas3] = await Promise.all([
            renderPart(part1Html), renderPart(part1bHtml), renderPart(part1cHtml),
            renderPart(part2Html), renderPart(part3Html)
        ]);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 295;

        const addCanvasToPdf = (canvas, isFirst) => {
            const imgData = canvas.toDataURL('image/png');
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            if (!isFirst) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
        };

        addCanvasToPdf(canvas1, true);
        addCanvasToPdf(canvas1b, false);
        addCanvasToPdf(canvas1c, false);
        addCanvasToPdf(canvas2, false);
        addCanvasToPdf(canvas3, false);

        const fileName = `Perfomix_Organization_Report_${header.cycle_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);

    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    } finally {
        document.body.removeChild(container);
    }
};
