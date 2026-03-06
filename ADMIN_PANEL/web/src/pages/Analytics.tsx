import { BarChart2, Heart, MessageSquare, TrendingUp, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Area, AreaChart,
    CartesianGrid, Cell,
    Line, LineChart, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import api from '../lib/api';


const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
const fmtNum = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n ?? 0);

export default function Analytics() {
    const [growth, setGrowth] = useState<any[]>([]);
    const [content, setContent] = useState<any>(null);
    const [retention, setRetention] = useState<any[]>([]);
    const [topVideos, setTopVideos] = useState<any[]>([]);
    const [topUsers, setTopUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [g, c, r, v, u] = await Promise.all([
                    api.get(`/api/analytics/growth`),
                    api.get(`/api/analytics/content`),
                    api.get(`/api/analytics/retention`),
                    api.get(`/api/analytics/top-videos`),
                    api.get(`/api/analytics/top-users`),
                ]);
                setGrowth(g.data?.slice(-60) || []);
                setContent(c.data);
                setRetention(r.data || []);
                setTopVideos(v.data || []);
                setTopUsers(u.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const contentPie = content ? [
        { name: 'Likes', value: content.likes || 0 },
        { name: 'Comments', value: content.comments || 0 },
        { name: 'Views', value: content.views || 0 },
    ] : [];

    const customTooltipStyle = {
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: '0.75rem', fontSize: '0.75rem',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    };

    const Section = ({ title, subtitle, children, col }: any) => (
        <div className="chart-card" style={col ? { gridColumn: col } : {}}>
            <div style={{ marginBottom: '1.25rem' }}>
                <p className="chart-title">{title}</p>
                {subtitle && <p className="chart-subtitle">{subtitle}</p>}
            </div>
            {children}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.4s ease' }}>
            <div>
                <h2 className="page-title">Analytics</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                    Full platform intelligence — users, content, engagement, retention
                </p>
            </div>

            {loading ? (
                <div className="empty-state">
                    <BarChart2 size={40} />
                    <p>Loading analytics data...</p>
                </div>
            ) : (
                <>
                    {/* Content Totals */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        {[
                            { label: 'Total Likes', value: content?.likes, icon: Heart, color: '#ef4444', bg: '#fef2f2' },
                            { label: 'Total Comments', value: content?.comments, icon: MessageSquare, color: '#f59e0b', bg: '#fffbeb' },
                            { label: 'Total Views', value: content?.views, icon: Video, color: '#2563eb', bg: 'var(--color-primary-light)' },
                        ].map((s, i) => (
                            <div key={i} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="stat-icon" style={{ background: s.bg }}>
                                    <s.icon size={18} style={{ color: s.color }} />
                                </div>
                                <div>
                                    <p className="stat-value" style={{ fontSize: '1.5rem' }}>{fmtNum(s.value || 0)}</p>
                                    <p className="stat-label">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                        <Section title="User Registration Growth" subtitle="Cumulative new user registrations (last 60 days)">
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={growth} margin={{ left: -10, right: 0 }}>
                                    <defs>
                                        <linearGradient id="gGrowth" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tickFormatter={fmtDate} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={customTooltipStyle} formatter={(v: any) => [v, 'New Users'] as any} labelFormatter={fmtDate as any} />
                                    <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} fill="url(#gGrowth)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Section>

                        <Section title="Engagement Breakdown">
                            {contentPie.some(d => d.value > 0) ? (
                                <>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <PieChart>
                                            <Pie data={contentPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                                {contentPie.map((_, idx) => (
                                                    <Cell key={idx} fill={COLORS[idx]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={customTooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.5rem' }}>
                                        {contentPie.map((d, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx], display: 'inline-block' }} />
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-2)' }}>{d.name}</span>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{fmtNum(d.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="empty-state" style={{ padding: '2rem' }}><BarChart2 size={24} /><p>No data</p></div>
                            )}
                        </Section>
                    </div>

                    {/* DAU Retention */}
                    <Section title="Daily Active Users (Retention)" subtitle="Based on daily_active_users view in Supabase">
                        {retention.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={retention} margin={{ left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="day" tickFormatter={fmtDate} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={customTooltipStyle} labelFormatter={fmtDate as any} />
                                    <Line type="monotone" dataKey="dau" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state" style={{ padding: '2rem' }}>
                                <TrendingUp size={28} />
                                <p>No retention data. Create a `daily_active_users` materialized view in Supabase that counts unique user_id per day from the likes, comments, and videos tables.</p>
                            </div>
                        )}
                    </Section>

                    {/* Top Videos & Users */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {/* Top Videos */}
                        <div className="table-wrap">
                            <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                                <p className="section-title">Top Performing Videos</p>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Creator</th>
                                        <th>Likes</th>
                                        <th>Comments</th>
                                        <th>Views</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topVideos.length === 0 ? (
                                        <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-3)' }}>No data</td></tr>
                                    ) : topVideos.map((v, i) => (
                                        <tr key={v.id}>
                                            <td style={{ color: 'var(--color-text-3)', fontWeight: 700, fontSize: '0.75rem' }}>{i + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <img src={v.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${v.profiles?.username}`} className="avatar avatar-sm" alt="" />
                                                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>@{v.profiles?.username}</span>
                                                </div>
                                            </td>
                                            <td><span style={{ fontWeight: 700, color: '#ef4444' }}>{fmtNum(v.likes_count || 0)}</span></td>
                                            <td><span style={{ fontWeight: 700, color: '#f59e0b' }}>{fmtNum(v.comments_count || 0)}</span></td>
                                            <td><span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{fmtNum(v.views_count || 0)}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Top Users */}
                        <div className="table-wrap">
                            <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                                <p className="section-title">Most Active Users</p>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>User</th>
                                        <th>Type</th>
                                        <th>Videos</th>
                                        <th>Engagement</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topUsers.length === 0 ? (
                                        <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-3)' }}>No data</td></tr>
                                    ) : topUsers.map((u, i) => (
                                        <tr key={u.id}>
                                            <td style={{ color: 'var(--color-text-3)', fontWeight: 700, fontSize: '0.75rem' }}>{i + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`} className="avatar avatar-sm" alt="" />
                                                    <div>
                                                        <p style={{ fontWeight: 600, fontSize: '0.8125rem' }}>@{u.username}</p>
                                                        <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>{u.full_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.user_type === 'corporate' ? 'badge-primary' : 'badge-neutral'}`}>
                                                    {u.user_type}
                                                </span>
                                            </td>
                                            <td><span style={{ fontWeight: 700 }}>{u.metrics?.videos || 0}</span></td>
                                            <td><span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.75rem' }}>{fmtNum((u.metrics?.likes || 0) + (u.metrics?.comments || 0))}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
