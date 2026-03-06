import api from '../lib/api';
import { CheckCircle, Clock, Flag, Search, Trash2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';


const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb', icon: Clock },
    reviewed: { label: 'Reviewed', color: '#2563eb', bg: 'var(--color-primary-light)', icon: CheckCircle },
    resolved: { label: 'Resolved', color: '#10b981', bg: '#f0fdf4', icon: CheckCircle },
    dismissed: { label: 'Dismissed', color: '#94a3b8', bg: '#f8fafc', icon: XCircle },
};

export default function Reports() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/reports`);
            setReports(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id: string, status: string) => {
        setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        try { await api.put(`/api/reports/${id}/status`, { status }); }
        catch { load(); }
    };

    const del = async (id: string) => {
        setReports(prev => prev.filter(r => r.id !== id));
        try { await api.delete(`/api/reports/${id}`); } catch { load(); }
    };

    const filtered = useMemo(() => reports.filter(r => {
        const matchStatus = filterStatus === 'all' || r.status === filterStatus;
        const q = search.toLowerCase();
        const matchSearch = !q ||
            r.reason?.toLowerCase().includes(q) ||
            r.reporter?.username?.toLowerCase().includes(q);
        return matchStatus && matchSearch;
    }), [reports, search, filterStatus]);

    const counts = useMemo(() => ({
        pending: reports.filter(r => r.status === 'pending').length,
        reviewed: reports.filter(r => r.status === 'reviewed').length,
        resolved: reports.filter(r => r.status === 'resolved').length,
        dismissed: reports.filter(r => r.status === 'dismissed').length,
    }), [reports]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="page-title">Reports</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                        {counts.pending} pending review
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {Object.entries(counts).map(([key, val]) => {
                        const map = STATUS_MAP[key];
                        return (
                            <div key={key} style={{
                                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)', padding: '0.375rem 0.75rem', textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 800, color: map?.color, fontFamily: 'Outfit, sans-serif' }}>{val}</p>
                                <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)' }}>{key}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
                    <Search size={14} style={{ color: 'var(--color-text-3)' }} />
                    <input placeholder="Search by reason or reporter..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="filter-tabs">
                    {['all', 'pending', 'reviewed', 'resolved', 'dismissed'].map(s => (
                        <button key={s} className={`filter-tab ${filterStatus === s ? 'active' : ''}`}
                            onClick={() => setFilterStatus(s)}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Reporter</th>
                            <th>Target Type</th>
                            <th>Reason</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6}><div className="empty-state"><Flag size={32} /><p>Loading...</p></div></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6}><div className="empty-state"><Flag size={32} /><p>No reports found</p></div></td></tr>
                        ) : filtered.map(r => {
                            const statusInfo = STATUS_MAP[r.status] || STATUS_MAP.pending;
                            const StatusIcon = statusInfo.icon;
                            return (
                                <tr key={r.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <img
                                                src={r.reporter?.avatar_url || `https://ui-avatars.com/api/?name=${r.reporter?.username}&size=28`}
                                                className="avatar avatar-sm" alt=""
                                            />
                                            <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>@{r.reporter?.username || '—'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${r.target_type === 'content' ? 'badge-purple' : 'badge-primary'}`}>
                                            {r.target_type}
                                        </span>
                                    </td>
                                    <td style={{ maxWidth: '240px' }}>
                                        <p style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                                            {r.reason}
                                        </p>
                                    </td>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                                    <td>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                            padding: '0.2rem 0.6rem', borderRadius: '999px',
                                            background: statusInfo.bg, color: statusInfo.color,
                                            fontSize: '0.6875rem', fontWeight: 700,
                                        }}>
                                            <StatusIcon size={10} />
                                            {statusInfo.label}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                                            {r.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: '#f0fdf4', color: '#10b981', border: '1px solid #bbf7d0', fontSize: '0.6875rem' }}
                                                        onClick={() => updateStatus(r.id, 'resolved')}
                                                    >
                                                        Resolve
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', fontSize: '0.6875rem' }}
                                                        onClick={() => updateStatus(r.id, 'dismissed')}
                                                    >
                                                        Dismiss
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                className="btn btn-sm btn-icon"
                                                style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid #fecaca' }}
                                                onClick={() => del(r.id)}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
