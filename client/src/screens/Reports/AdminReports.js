import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { toast } from 'react-toastify';
import { generateEnhancedOrgReport } from '../../utils/enhancedOrgReportPDF_COMPLETE';
import './reports.css';

const PRIMARY = '#002F6C';
const ACCENT  = '#2d6cdf';
const DIST_COLORS = { 'Excellent': '#10b981', 'Good': '#3b82f6', 'Satisfactory': '#f59e0b', 'Needs Improvement': '#ef4444' };

const KPICard = ({ label, value, sub, color = PRIMARY }) => (
    <div style={{ background: '#fff', border: '1.5px solid #e1e8f0', borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 160, boxShadow: '0 2px 8px rgba(45,108,223,0.07)' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color }}>{value ?? '—'}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
);

const SectionTitle = ({ n, title, color = PRIMARY }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 16px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{n}</div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e3a5f' }}>{title}</h2>
    </div>
);

const Card = ({ children, style = {} }) => (
    <div style={{ background: '#fff', border: '1.5px solid #e1e8f0', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(45,108,223,0.07)', ...style }}>{children}</div>
);

const AdminReports = () => {
    const [cycleId, setCycleId]         = useState('');
    const [cycles, setCycles]           = useState([]);
    const [summary, setSummary]         = useState(null);
    const [trend, setTrend]             = useState([]);
    const [teamInsights, setTeamInsights] = useState({ top3: [], bottom3: [] });
    const [benchmark, setBenchmark]     = useState(null);
    const [employees, setEmployees]     = useState([]);
    const [loading, setLoading]         = useState(false);

    const cfg = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    useEffect(() => {
        axios.get('http://localhost:5000/api/cycles', cfg()).then(r => {
            const active = (r.data || []).filter(c => c.status !== 'draft');
            setCycles(active);
            if (active.length) setCycleId(active[0].id);
        }).catch(() => toast.error('Failed to load cycles'));

        axios.get('http://localhost:5000/api/reports/admin/org-trend', cfg())
            .then(r => setTrend(r.data.trend || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!cycleId) return;
        setLoading(true);
        Promise.all([
            axios.get(`http://localhost:5000/api/reports/admin/org-summary?cycle_id=${cycleId}`, cfg()),
            axios.get(`http://localhost:5000/api/reports/admin/employee-list?cycle_id=${cycleId}`, cfg()),
            axios.get(`http://localhost:5000/api/reports/admin/team-insights?cycle_id=${cycleId}`, cfg()),
            axios.get(`http://localhost:5000/api/reports/admin/benchmarking?cycle_id=${cycleId}`, cfg()),
        ]).then(([s, e, t, b]) => {
            setSummary(s.data);
            setEmployees(e.data.employees || []);
            setTeamInsights(t.data);
            setBenchmark(b.data);
        }).catch(() => toast.error('Failed to load report data'))
          .finally(() => setLoading(false));
    }, [cycleId]);

    const exportPDF = async () => {
        if (!summary) return toast.error('No data');
        toast.info('Generating report...');
        try { await generateEnhancedOrgReport({ ...summary, _cycleId: cycleId }); toast.success('Downloaded!'); }
        catch { toast.error('PDF failed'); }
    };

    const completionRate = summary ? Math.round((summary.summary.completed / (summary.summary.total_employees || 1)) * 100) : 0;
    const avgScore       = summary ? parseFloat(summary.summary.average_score || 0) : 0;
    const topDept        = summary?.dept_stats?.length ? [...summary.dept_stats].sort((a,b) => b.avg_score - a.avg_score)[0] : null;
    const lowDept        = summary?.dept_stats?.length ? [...summary.dept_stats].sort((a,b) => a.avg_score - b.avg_score)[0] : null;
    const aboveAvg       = employees.filter(e => parseFloat(e.total_score||0) >= avgScore).length;
    const aboveAvgPct    = employees.length ? Math.round((aboveAvg / employees.length) * 100) : 0;

    const perfLevel = avgScore >= 85 ? { label: 'Excellent', color: '#10b981' }
                    : avgScore >= 70 ? { label: 'Good', color: '#3b82f6' }
                    : avgScore >= 50 ? { label: 'Satisfactory', color: '#f59e0b' }
                    : { label: 'Needs Improvement', color: '#ef4444' };

    const insights = [];
    if (topDept) insights.push(`${topDept.Department_name} is the top-performing department with an avg score of ${parseFloat(topDept.avg_score).toFixed(1)}.`);
    if (lowDept && lowDept.Department_name !== topDept?.Department_name) insights.push(`${lowDept.Department_name} requires attention with an avg score of ${parseFloat(lowDept.avg_score).toFixed(1)}.`);
    if (completionRate < 80) insights.push(`Evaluation completion rate is ${completionRate}% — follow up on pending evaluations.`);
    if (trend.length >= 2) {
        const last = parseFloat(trend[trend.length-1]?.avg_score||0);
        const prev = parseFloat(trend[trend.length-2]?.avg_score||0);
        insights.push(last >= prev ? `Performance improved by ${(last-prev).toFixed(1)} points vs last cycle.` : `Performance declined by ${(prev-last).toFixed(1)} points vs last cycle.`);
    }

    const bottomEmployees = [...employees].sort((a,b) => parseFloat(a.total_score||0) - parseFloat(b.total_score||0)).slice(0,10);
    const topEmployees    = [...employees].filter(e => parseFloat(e.total_score||0) >= 85).sort((a,b) => parseFloat(b.total_score||0) - parseFloat(a.total_score||0)).slice(0,5);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', color: '#1e3a5f', maxWidth: 1200, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: PRIMARY }}>Organization Performance Report</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Perfomix · {summary?.header?.organization_name}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <select value={cycleId} onChange={e => setCycleId(e.target.value)}
                        style={{ padding: '9px 14px', border: '2px solid #e1e8f0', borderRadius: 10, fontSize: 14, color: '#334155', outline: 'none', cursor: 'pointer' }}>
                        {cycles.map(c => <option key={c.id} value={c.id}>{c.cycle_name || c.name}</option>)}
                    </select>
                    <button onClick={exportPDF} disabled={!summary}
                        style={{ padding: '9px 20px', background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        ↓ Export PDF
                    </button>
                </div>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading report data...</div>}

            {!loading && summary && (<>

            {/* 1. Cover / Report Info */}
            <Card style={{ background: 'linear-gradient(135deg, #002F6C 0%, #1a4fa0 100%)', color: '#fff', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7, textTransform: 'uppercase', marginBottom: 6 }}>Official Performance Report</div>
                        <div style={{ fontSize: 26, fontWeight: 900 }}>{summary.header.organization_name}</div>
                        <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>Cycle: {summary.header.cycle_name}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13, opacity: 0.8 }}>
                        <div>Generated: {new Date(summary.header.generation_date).toLocaleDateString()}</div>
                        <div>{new Date(summary.header.start_date).toLocaleDateString()} – {new Date(summary.header.end_date).toLocaleDateString()}</div>
                    </div>
                </div>
            </Card>

            {/* 2. Executive Summary */}
            <SectionTitle n="2" title="Executive Summary" color="#1d4ed8" />
            <Card>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 48, fontWeight: 900, color: perfLevel.color }}>{avgScore.toFixed(1)}%</div>
                        <div style={{ fontSize: 14, color: '#64748b' }}>Overall Organization Score</div>
                        <span style={{ display: 'inline-block', marginTop: 8, padding: '3px 14px', borderRadius: 20, background: perfLevel.color + '22', color: perfLevel.color, fontWeight: 700, fontSize: 13 }}>{perfLevel.label}</span>
                    </div>
                    <div style={{ flex: 2, minWidth: 280 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#1e3a5f' }}>Key Insights</div>
                        {insights.length ? insights.map((ins, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13, color: '#334155' }}>
                                <span style={{ color: ACCENT, fontWeight: 700, flexShrink: 0 }}>→</span>{ins}
                            </div>
                        )) : <div style={{ color: '#94a3b8', fontSize: 13 }}>No insights available yet.</div>}
                    </div>
                </div>
            </Card>

            {/* 3. KPI Cards */}
            <SectionTitle n="3" title="Key Performance Indicators" color="#0f766e" />
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                <KPICard label="Avg Organization Score" value={`${avgScore.toFixed(1)}%`} color={ACCENT} />
                <KPICard label="Highest Dept Score" value={topDept ? `${parseFloat(topDept.avg_score).toFixed(1)}%` : '—'} sub={topDept?.Department_name} color="#10b981" />
                <KPICard label="Lowest Dept Score"  value={lowDept ? `${parseFloat(lowDept.avg_score).toFixed(1)}%` : '—'} sub={lowDept?.Department_name} color="#ef4444" />
                <KPICard label="Completion Rate" value={`${completionRate}%`} sub={`${summary.summary.completed} / ${summary.summary.total_employees}`} color="#f59e0b" />
                <KPICard label="Above Average" value={`${aboveAvgPct}%`} sub={`${aboveAvg} employees`} color="#8b5cf6" />
            </div>

            {/* 4. Org Performance Trend */}
            <SectionTitle n="4" title="Organization Performance Trend" color="#1d4ed8" />
            <Card>
                {trend.length < 2 ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 40 }}>Not enough cycles to show trend.</div> : (
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={trend.map(t => ({ ...t, avg_score: parseFloat(t.avg_score||0).toFixed(1) }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="cycle_name" tick={{ fontSize: 12 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="avg_score" stroke={ACCENT} strokeWidth={3} dot={{ r: 5, fill: ACCENT }} activeDot={{ r: 7 }} name="Avg Score" />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </Card>

            {/* 5. Score Distribution */}
            <SectionTitle n="5" title="Score Distribution" color="#c2410c" />
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <Card style={{ flex: 1, minWidth: 280 }}>
                    <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                            <Pie data={summary.distribution} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={90} label={({ level, percent }) => `${level} ${(percent*100).toFixed(0)}%`}>
                                {summary.distribution.map((d, i) => <Cell key={i} fill={DIST_COLORS[d.level] || '#64748b'} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
                <Card style={{ flex: 1, minWidth: 280 }}>
                    {summary.distribution.map((d, i) => {
                        const pct = Math.round((d.count / (summary.summary.completed || 1)) * 100);
                        const col = DIST_COLORS[d.level] || '#64748b';
                        return (
                            <div key={i} style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600 }}>{d.level}</span>
                                    <span style={{ color: '#64748b' }}>{d.count} ({pct}%)</span>
                                </div>
                                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 6 }} />
                                </div>
                            </div>
                        );
                    })}
                </Card>
            </div>

            {/* 6. Department Performance */}
            <SectionTitle n="6" title="Department Performance Comparison" color="#0f766e" />
            <Card>
                <ResponsiveContainer width="100%" height={Math.max(200, summary.dept_stats.length * 44)}>
                    <BarChart data={summary.dept_stats.map(d => ({ ...d, avg_score: parseFloat(d.avg_score||0).toFixed(1) }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0,100]} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="Department_name" width={160} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="avg_score" radius={[0,6,6,0]} barSize={22} name="Avg Score">
                            {summary.dept_stats.map((d, i) => {
                                const s = parseFloat(d.avg_score||0);
                                const isTop = d.Department_name === topDept?.Department_name;
                                const isLow = d.Department_name === lowDept?.Department_name;
                                return <Cell key={i} fill={isTop ? '#10b981' : isLow ? '#ef4444' : ACCENT} />;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 Top: {topDept?.Department_name}</span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>🔴 Lowest: {lowDept?.Department_name}</span>
                </div>
            </Card>

            {/* 7. Team Insights */}
            <SectionTitle n="7" title="Team Performance Insights" color="#7c3aed" />
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <Card style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 12 }}>🏆 Top 3 Teams</div>
                    {teamInsights.top3.length ? teamInsights.top3.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f4fa', fontSize: 13 }}>
                            <div><div style={{ fontWeight: 600 }}>{t.team_name}</div><div style={{ color: '#94a3b8', fontSize: 11 }}>{t.department_name}</div></div>
                            <div style={{ fontWeight: 800, color: '#10b981' }}>{parseFloat(t.avg_score||0).toFixed(1)}%</div>
                        </div>
                    )) : <div style={{ color: '#94a3b8', fontSize: 13 }}>No data</div>}
                </Card>
                <Card style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>⚠️ Bottom 3 Teams</div>
                    {teamInsights.bottom3.length ? teamInsights.bottom3.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f4fa', fontSize: 13 }}>
                            <div><div style={{ fontWeight: 600 }}>{t.team_name}</div><div style={{ color: '#94a3b8', fontSize: 11 }}>{t.department_name}</div></div>
                            <div style={{ fontWeight: 800, color: '#ef4444' }}>{parseFloat(t.avg_score||0).toFixed(1)}%</div>
                        </div>
                    )) : <div style={{ color: '#94a3b8', fontSize: 13 }}>No data</div>}
                </Card>
            </div>

            {/* 8. Benchmarking */}
            <SectionTitle n="8" title="Benchmarking" color="#b45309" />
            <Card>
                {benchmark ? (
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                        {[
                            { label: 'Org Average', value: `${benchmark.orgAvg}%`, color: ACCENT },
                            { label: 'Top 25% Avg', value: `${benchmark.top25Avg}%`, color: '#10b981' },
                            { label: 'Bottom 25% Avg', value: `${benchmark.bottom25Avg}%`, color: '#ef4444' },
                        ].map((b, i) => <KPICard key={i} label={b.label} value={b.value} color={b.color} />)}
                        <div style={{ flex: 2, minWidth: 200, padding: '12px 20px', background: '#fef9c3', borderRadius: 10, fontSize: 13, color: '#92400e', fontWeight: 600 }}>
                            💡 Top performers outperform the org average by <strong>+{benchmark.gap}%</strong>
                        </div>
                    </div>
                ) : <div style={{ color: '#94a3b8', fontSize: 13 }}>No benchmarking data.</div>}
            </Card>

            {/* 9. Employees Needing Attention */}
            <SectionTitle n="9" title="Employees Needing Attention" color="#dc2626" />
            <Card>
                {bottomEmployees.length ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#fef2f2', borderBottom: '2px solid #fecaca' }}>
                                {['Name','Department','Team','Score','Flag'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#991b1b' }}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {bottomEmployees.map((e, i) => {
                                const s = parseFloat(e.total_score||0);
                                const flag = s < 50 ? { label: 'Critical', color: '#ef4444' } : { label: 'Moderate', color: '#f59e0b' };
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f0f4fa' }}>
                                        <td style={{ padding: '9px 12px', fontWeight: 600 }}>{e.name}</td>
                                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{e.department}</td>
                                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{e.team || 'N/A'}</td>
                                        <td style={{ padding: '9px 12px', fontWeight: 800, color: '#dc2626' }}>{s.toFixed(1)}</td>
                                        <td style={{ padding: '9px 12px' }}><span style={{ background: flag.color+'22', color: flag.color, padding: '2px 10px', borderRadius: 20, fontWeight: 700, fontSize: 11 }}>{flag.label}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24 }}>All employees performing within acceptable range.</div>}
            </Card>

            {/* 10. Top Performers */}
            <SectionTitle n="10" title="Top Performers" color="#065f46" />
            <Card>
                {topEmployees.length ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #bbf7d0' }}>
                                {['#','Name','Department','Score'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#065f46' }}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {topEmployees.map((e, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f0f4fa' }}>
                                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#10b981' }}>{i+1}</td>
                                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>{e.name}</td>
                                    <td style={{ padding: '9px 12px', color: '#64748b' }}>{e.department}</td>
                                    <td style={{ padding: '9px 12px', fontWeight: 800, color: '#10b981' }}>{parseFloat(e.total_score||0).toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <div style={{ padding: 24, textAlign: 'center', color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>⚠️ No high-performing employees in this cycle (threshold: 85%)</div>}
            </Card>

            {/* 11. Completion Analysis */}
            <SectionTitle n="11" title="Evaluation Completion Analysis" color="#0e7490" />
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 32 }}>
                <Card style={{ flex: 1, minWidth: 240 }}>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={[{ name: 'Completed', value: summary.summary.completed }, { name: 'Pending', value: summary.summary.pending }]}
                                dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} label>
                                <Cell fill="#10b981" /><Cell fill="#f59e0b" />
                            </Pie>
                            <Tooltip /><Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
                <Card style={{ flex: 2, minWidth: 300 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>By Department</div>
                    {summary.dept_stats.map((d, i) => {
                        const pct = Math.round((d.emp_count / (summary.summary.total_employees || 1)) * 100);
                        return (
                            <div key={i} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                                    <span style={{ fontWeight: 600 }}>{d.Department_name}</span>
                                    <span style={{ color: '#64748b' }}>{d.emp_count} evaluated</span>
                                </div>
                                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, borderRadius: 4 }} />
                                </div>
                            </div>
                        );
                    })}
                </Card>
            </div>

            </>)}
        </div>
    );
};

export default AdminReports;
