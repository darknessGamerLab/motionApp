import api from '../lib/api';
import { Briefcase, CheckCircle, Clock, Search, X, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';


const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

export default function CorporateApprovals() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/corporate-applications`);
            setApplications(data);
        } catch (e) {
            // Fallback to pending endpoint
            try {
                const { data } = await api.get(`/api/users/corporate/pending`);
                setApplications(data.map((d: any) => ({ ...d, status: 'pending' })));
            } catch { }
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id: string, status: string) => {
        setActionLoading(id + '_' + status);
        // State-first
        setApplications(prev => prev.map(a => a.id === id ? { ...a, corporate_status: status, status } : a));
        try {
            await api.put(`/api/corporate-applications/${id}/status`, { status });
        } catch { load(); } finally { setActionLoading(null); }
    };

    const filtered = useMemo(() => applications.filter(a => {
        const statusVal = a.corporate_status || a.status || 'pending';
        const matchStatus = filterStatus === 'all' || statusVal === filterStatus;
        const q = search.toLowerCase();
        const matchSearch = !q ||
            a.username?.toLowerCase().includes(q) ||
            a.full_name?.toLowerCase().includes(q) ||
            a.tax_number?.toLowerCase().includes(q);
        return matchStatus && matchSearch;
    }), [applications, search, filterStatus]);

    const counts = useMemo(() => ({
        pending: applications.filter(a => (a.corporate_status || a.status) === 'pending').length,
        approved: applications.filter(a => (a.corporate_status || a.status) === 'approved').length,
        rejected: applications.filter(a => (a.corporate_status || a.status) === 'rejected').length,
    }), [applications]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="page-title">Corporate Applications</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                        {counts.pending} awaiting review
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                        { key: 'pending', label: 'Pending', val: counts.pending, color: '#f59e0b' },
                        { key: 'approved', label: 'Approved', val: counts.approved, color: '#10b981' },
                        { key: 'rejected', label: 'Rejected', val: counts.rejected, color: '#ef4444' },
                    ].map(s => (
                        <div key={s.key} style={{
                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)', padding: '0.375rem 0.75rem', textAlign: 'center',
                            cursor: 'pointer',
                        }} onClick={() => setFilterStatus(s.key)}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 800, color: s.color, fontFamily: 'Outfit, sans-serif' }}>{s.val}</p>
                            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)' }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="search-box" style={{ flex: 1, maxWidth: '360px' }}>
                    <Search size={14} style={{ color: 'var(--color-text-3)' }} />
                    <input placeholder="Search by username or tax number..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="filter-tabs">
                    {['all', 'pending', 'approved', 'rejected'].map(s => (
                        <button key={s} className={`filter-tab ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Applicant</th>
                            <th>Tax Office</th>
                            <th>Tax Number</th>
                            <th>Applied</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6}><div className="empty-state"><Briefcase size={32} /><p>Loading...</p></div></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6}><div className="empty-state"><Briefcase size={32} /><p>No applications found</p></div></td></tr>
                        ) : filtered.map(a => {
                            const statusVal = a.corporate_status || a.status || 'pending';
                            return (
                                <tr key={a.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                            <img
                                                src={a.avatar_url || `https://ui-avatars.com/api/?name=${a.username}&background=0f172a&color=fff&size=32`}
                                                className="avatar avatar-md" alt=""
                                            />
                                            <div>
                                                <p style={{ fontWeight: 700, fontSize: '0.8125rem' }}>@{a.username}</p>
                                                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>{a.full_name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.8125rem' }}>{a.tax_office || '—'}</td>
                                    <td>
                                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', fontWeight: 600 }}>
                                            {a.tax_number || '—'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{fmtDate(a.created_at)}</td>
                                    <td>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 700,
                                            background: statusVal === 'approved' ? '#f0fdf4' : statusVal === 'rejected' ? '#fef2f2' : '#fffbeb',
                                            color: statusVal === 'approved' ? '#10b981' : statusVal === 'rejected' ? '#ef4444' : '#f59e0b',
                                        }}>
                                            {statusVal === 'approved' ? <CheckCircle size={10} /> : statusVal === 'rejected' ? <XCircle size={10} /> : <Clock size={10} />}
                                            {statusVal.charAt(0).toUpperCase() + statusVal.slice(1)}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {statusVal === 'pending' ? (
                                            <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: '#f0fdf4', color: '#10b981', border: '1px solid #bbf7d0' }}
                                                    onClick={() => updateStatus(a.id, 'approved')}
                                                    disabled={!!actionLoading}
                                                >
                                                    <CheckCircle size={12} /> Approve
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}
                                                    onClick={() => updateStatus(a.id, 'rejected')}
                                                    disabled={!!actionLoading}
                                                >
                                                    <X size={12} /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>Processed</span>
                                        )}
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
