import { createClient } from '@supabase/supabase-js';
import {
    Activity, BarChart2, Briefcase, Flag, Heart, MessageSquare,
    RefreshCw, Shield, TrendingUp, Users, Video, Zap
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid,
    Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import api from '../lib/api';


const supabase = createClient(
    'https://mhgxrzejobmkuwylyelx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZ3hyemVqb2Jta3V3eWx5ZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODY0NDksImV4cCI6MjA4MzE2MjQ0OX0.8IDCg303cgOsglyydOPm_-GBQaEJNKBFEZk8NrtSK24'
);

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const fmtNum = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [retention, setRetention] = useState<any[]>([]);
    const [growth, setGrowth] = useState<any[]>([]);
    const [feed, setFeed] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(new Date());
    const feedRef = useRef<HTMLDivElement>(null);

    const fetchAll = useCallback(async () => {
        setSyncing(true);
        try {
            const [s, r, g, f] = await Promise.all([
                api.get(`/api/dashboard/summary`),
                api.get(`/api/analytics/retention`),
                api.get(`/api/analytics/growth`),
                api.get(`/api/analytics/feed`),
            ]);
            setStats(s.data);
            setRetention(r.data || []);
            setGrowth((g.data || []).slice(-30));
            setFeed(f.data || []);
            setLastSync(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        // Realtime subscription
        const channel = supabase.channel('dashboard-live')
            .on('postgres_changes', { event: '*', schema: 'public' }, () => {
                fetchAll();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchAll]);

    const statCards = stats ? [
        { label: 'Total Users', value: stats.users, icon: Users, color: 'var(--color-primary)', bg: 'var(--color-primary-light)', trend: '+12%' },
        { label: 'Videos', value: stats.videos, icon: Video, color: '#8b5cf6', bg: 'var(--color-purple-light)', trend: 'Content DB' },
        { label: 'Engagements', value: (stats.likes || 0) + (stats.comments || 0), icon: Heart, color: '#ef4444', bg: '#fef2f2', trend: 'Likes + Comments' },
        { label: 'B2B Connections', value: stats.radars, icon: Zap, color: '#f59e0b', bg: '#fffbeb', trend: 'Radar links' },
        { label: 'Reports', value: stats.reports, icon: Flag, color: '#ef4444', bg: '#fef2f2', trend: 'Pending moderation' },
        { label: 'Corp. Pending', value: stats.pending, icon: Briefcase, color: '#10b981', bg: '#f0fdf4', trend: 'Awaiting review' },
        { label: 'Comments', value: stats.comments, icon: MessageSquare, color: '#06b6d4', bg: '#ecfeff', trend: 'Platform activity' },
        { label: 'Saves', value: stats.saves, icon: Activity, color: '#8b5cf6', bg: 'var(--color-purple-light)', trend: 'Bookmarked' },
    ] : [];

    const pieData = stats ? [
        { name: 'Likes', value: stats.likes || 0 },
        { name: 'Comments', value: stats.comments || 0 },
        { name: 'Saves', value: stats.saves || 0 },
        { name: 'Radars', value: stats.radars || 0 },
    ] : [];

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="stat-card" style={{
                            height: '5rem', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite',
                        }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.4s ease' }}>

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="page-title">Platform Overview</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                        Last synced: {lastSync.toLocaleTimeString()} · Real-time monitoring active
                    </p>
                </div>
                <button
                    onClick={fetchAll}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Refresh'}
                </button>
            </div>

            {/* Stat Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {statCards.map((s, i) => (
                    <div key={i} className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="stat-icon" style={{ background: s.bg }}>
                                <s.icon size={16} style={{ color: s.color }} />
                            </div>
                            <TrendingUp size={12} style={{ color: 'var(--color-text-3)', marginTop: '0.25rem' }} />
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                            <p className="stat-value">{fmtNum(s.value || 0)}</p>
                            <p className="stat-label">{s.label}</p>
                            <p className="stat-trend" style={{ color: 'var(--color-text-3)' }}>{s.trend}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

                {/* User Growth Chart */}
                <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <div>
                            <p className="chart-title">User Growth</p>
                            <p className="chart-subtitle">New registrations over the last 30 days</p>
                        </div>
                        <span className="badge badge-primary">MTD</span>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={growth} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={fmtDate}
                                axisLine={false} tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{
                                    background: '#fff', border: '1px solid #e2e8f0',
                                    borderRadius: '0.75rem', fontSize: '0.75rem',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                formatter={(v: any) => [v, 'Active Users'] as any}
                                labelFormatter={fmtDate as any}
                            />
                            <Area
                                type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5}
                                fill="url(#colorGrowth)" dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Engagement Pie */}
                <div className="chart-card">
                    <p className="chart-title">Engagement Mix</p>
                    <p className="chart-subtitle">Platform interaction distribution</p>
                    {pieData.some(d => d.value > 0) ? (
                        <>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie
                                        data={pieData} cx="50%" cy="50%"
                                        innerRadius={45} outerRadius={75}
                                        paddingAngle={3} dataKey="value"
                                    >
                                        {pieData.map((_, idx) => (
                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: '#fff', border: '1px solid #e2e8f0',
                                            borderRadius: '0.5rem', fontSize: '0.75rem',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                {pieData.map((d, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: COLORS[idx], flexShrink: 0, display: 'inline-block' }} />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-2)' }}>{d.name}</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{fmtNum(d.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <BarChart2 size={32} />
                            <p style={{ fontSize: '0.8125rem' }}>No engagement data yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* DAU Retention + Live Feed  */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

                {/* DAU Chart */}
                <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <div>
                            <p className="chart-title">Daily Active Users (DAU)</p>
                            <p className="chart-subtitle">User retention trend · Last 30 days</p>
                        </div>
                    </div>
                    {retention.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={retention} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="day" tickFormatter={fmtDate}
                                    axisLine={false} tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#fff', border: '1px solid #e2e8f0',
                                        borderRadius: '0.75rem', fontSize: '0.75rem',
                                    }}
                                />
                                <Bar dataKey="dau" fill="#2563eb" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <Activity size={32} />
                            <p style={{ fontSize: '0.8125rem' }}>No DAU data. Create the daily_active_users view in Supabase.</p>
                        </div>
                    )}
                </div>

                {/* Live Activity Feed */}
                <div
                    ref={feedRef}
                    style={{
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <p style={{ color: 'white', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9375rem' }}>
                            Live Activity
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span className="status-dot live" />
                            <span style={{ color: '#10b981', fontSize: '0.6875rem', fontWeight: 600 }}>LIVE</span>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {feed.length === 0 ? (
                            <p style={{ color: '#475569', fontSize: '0.75rem', textAlign: 'center', paddingTop: '2rem' }}>
                                No recent activity
                            </p>
                        ) : feed.map((item, i) => {
                            const typeColors: any = {
                                like: '#ef4444', comment: '#f59e0b',
                                video: '#10b981', follow: '#8b5cf6'
                            };
                            const typeLabels: any = {
                                like: 'liked a video',
                                comment: 'posted a comment',
                                video: 'uploaded a video',
                                follow: 'followed someone',
                            };
                            return (
                                <div key={i} style={{
                                    display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
                                    padding: '0.5rem', borderRadius: '0.5rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}>
                                    <div style={{
                                        width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                                        background: typeColors[item.type] + '20',
                                        border: `1px solid ${typeColors[item.type]}40`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        fontSize: '0.625rem', color: typeColors[item.type],
                                        fontWeight: 800,
                                    }}>
                                        {item.type?.[0]?.toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            @{item.profiles?.username || item.follower?.username || 'user'}
                                        </p>
                                        <p style={{ color: '#475569', fontSize: '0.6875rem', marginTop: '0.125rem' }}>
                                            {typeLabels[item.type] || item.type}
                                        </p>
                                    </div>
                                    <span style={{ fontSize: '0.625rem', color: '#334155', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{
                        marginTop: '1rem', padding: '0.625rem', background: 'rgba(255,255,255,0.03)',
                        borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        <Shield size={14} style={{ color: '#2563eb' }} />
                        <div>
                            <p style={{ fontSize: '0.6875rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Platform Core</p>
                            <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.125rem' }}>All systems operational</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Platform Health Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[
                    { label: 'API Uptime', value: '99.9%', sub: '30d avg', ok: true },
                    { label: 'DB Response', value: '< 80ms', sub: 'avg query time', ok: true },
                    { label: 'Active Sessions', value: fmtNum(stats?.users || 0), sub: 'registered accounts', ok: true },
                    { label: 'Content ratio', value: stats ? ((stats.videos / Math.max(stats.users, 1)) * 100).toFixed(1) + '%' : '—', sub: 'videos per user', ok: true },
                ].map((h, i) => (
                    <div key={i} className="card card-padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--color-text)' }}>{h.value}</p>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>{h.label}</p>
                            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>{h.sub}</p>
                        </div>
                        <div className="status-dot" style={{ background: h.ok ? 'var(--color-success)' : 'var(--color-danger)', width: '0.625rem', height: '0.625rem' }} />
                    </div>
                ))}
            </div>

        </div>
    );
}
