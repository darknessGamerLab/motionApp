import api from '../lib/api';
import {
    Ban, Briefcase,
    Clock,
    Search,
    Trash2, UserCheck, Users, Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';



const fmtNum = (n: any) => {
    if (!n && n !== 0) return '—';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/users`);
            setUsers(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const toggleBan = async (id: string, isBanned: boolean) => {
        setActionLoading(id + '_ban');
        // State-first update
        setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: !isBanned } : u));
        try {
            await api.put(`/api/users/${id}/ban`, { is_banned: !isBanned });
        } catch {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: isBanned } : u));
        } finally { setActionLoading(null); }
    };

    const toggleType = async (id: string, type: string) => {
        const next = type === 'corporate' ? 'individual' : 'corporate';
        setActionLoading(id + '_type');
        setUsers(prev => prev.map(u => u.id === id ? { ...u, user_type: next } : u));
        try {
            await api.put(`/api/users/${id}/type`, { user_type: next });
        } catch {
            setUsers(prev => prev.map(u => u.id === id ? { ...u, user_type: type } : u));
        } finally { setActionLoading(null); }
    };

    const deleteUser = async (id: string) => {
        setUsers(prev => prev.filter(u => u.id !== id));
        setConfirmDelete(null);
        try {
            await api.delete(`/api/users/${id}`);
        } catch { load(); }
    };

    const filtered = useMemo(() => {
        return users.filter(u => {
            const q = search.toLowerCase();
            const matchSearch = !q ||
                u.username?.toLowerCase().includes(q) ||
                u.full_name?.toLowerCase().includes(q) ||
                u.id?.toLowerCase().includes(q) ||
                u.tax_number?.toLowerCase()?.includes(q);
            const matchType = filterType === 'all' || u.user_type === filterType;
            const matchStatus = filterStatus === 'all' || (filterStatus === 'banned' ? u.is_banned : !u.is_banned);
            return matchSearch && matchType && matchStatus;
        });
    }, [users, search, filterType, filterStatus]);

    const stats = useMemo(() => ({
        total: users.length,
        individual: users.filter(u => u.user_type === 'individual').length,
        corporate: users.filter(u => u.user_type === 'corporate').length,
        banned: users.filter(u => u.is_banned).length,
    }), [users]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="page-title">User Management</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                        Full CRUD control over all platform members
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[
                        { label: 'Total', value: stats.total, color: 'var(--color-primary)' },
                        { label: 'Individual', value: stats.individual, color: '#8b5cf6' },
                        { label: 'Corporate', value: stats.corporate, color: '#10b981' },
                        { label: 'Banned', value: stats.banned, color: '#ef4444' },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)', padding: '0.375rem 0.875rem', textAlign: 'center',
                        }}>
                            <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: s.color, fontFamily: 'Outfit, sans-serif' }}>{s.value}</p>
                            <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)' }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
                    <Search size={14} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                    <input
                        placeholder="Search by username, name, ID, tax number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="filter-tabs">
                    {['all', 'individual', 'corporate'].map(t => (
                        <button key={t} className={`filter-tab ${filterType === t ? 'active' : ''}`}
                            onClick={() => setFilterType(t)}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="filter-tabs">
                    {['all', 'active', 'banned'].map(t => (
                        <button key={t} className={`filter-tab ${filterStatus === t ? 'active' : ''}`}
                            onClick={() => setFilterStatus(t)}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', fontWeight: 500 }}>
                    {filtered.length} of {users.length}
                </span>
            </div>

            {/* Table */}
            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Type</th>
                            <th>Joined</th>
                            <th style={{ textAlign: 'center' }}>Videos</th>
                            <th style={{ textAlign: 'center' }}>Likes</th>
                            <th style={{ textAlign: 'center' }}>Comments</th>
                            <th style={{ textAlign: 'center' }}>Radar</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9}>
                                    <div className="empty-state">
                                        <div style={{ width: 24, height: 24, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        <p>Loading users...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={9}>
                                    <div className="empty-state">
                                        <Users size={32} />
                                        <p>No users found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map(u => (
                            <tr key={u.id}>
                                {/* User Identity */}
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <img
                                                src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=0f172a&color=fff&size=32`}
                                                className="avatar avatar-md"
                                                alt=""
                                            />
                                            <span
                                                className="status-dot"
                                                style={{
                                                    position: 'absolute', bottom: -1, right: -1,
                                                    width: '0.5rem', height: '0.5rem',
                                                    border: '1.5px solid white',
                                                    background: u.is_banned ? 'var(--color-danger)' : 'var(--color-success)',
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                                                @{u.username}
                                            </p>
                                            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>{u.full_name}</p>
                                        </div>
                                    </div>
                                </td>

                                {/* Type */}
                                <td>
                                    <button
                                        onClick={() => toggleType(u.id, u.user_type)}
                                        disabled={actionLoading === u.id + '_type'}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                            padding: '0.2rem 0.6rem', borderRadius: '999px',
                                            fontSize: '0.6875rem', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                            cursor: 'pointer', border: 'none',
                                            background: u.user_type === 'corporate' ? 'var(--color-primary-light)' : '#f5f3ff',
                                            color: u.user_type === 'corporate' ? 'var(--color-primary)' : '#8b5cf6',
                                            transition: 'all 0.15s',
                                        }}
                                        title="Click to toggle type"
                                    >
                                        {u.user_type === 'corporate' ? <Briefcase size={10} /> : <Zap size={10} />}
                                        {u.user_type}
                                    </button>
                                </td>

                                {/* Joined */}
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <Clock size={11} style={{ color: 'var(--color-text-3)' }} />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-2)' }}>{fmtDate(u.created_at)}</span>
                                    </div>
                                </td>

                                {/* Metrics */}
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }}>
                                        {fmtNum(u.metrics?.videos)}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', color: '#ef4444' }}>
                                        {fmtNum(u.metrics?.likes)}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', color: '#f59e0b' }}>
                                        {fmtNum(u.metrics?.comments)}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-3)' }}>
                                            ↓{u.metrics?.radar_in || 0} · ↑{u.metrics?.radar_out || 0}
                                        </span>
                                    </div>
                                </td>

                                {/* Status */}
                                <td>
                                    {u.is_banned ? (
                                        <span className="badge badge-danger">Banned</span>
                                    ) : (
                                        <span className="badge badge-success">Active</span>
                                    )}
                                </td>

                                {/* Actions */}
                                <td>
                                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => toggleBan(u.id, u.is_banned)}
                                            disabled={actionLoading === u.id + '_ban'}
                                            className="btn btn-sm btn-icon"
                                            style={{
                                                background: u.is_banned ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                                                color: u.is_banned ? 'var(--color-success)' : 'var(--color-danger)',
                                                border: `1px solid ${u.is_banned ? '#bbf7d0' : '#fecaca'}`,
                                            }}
                                            title={u.is_banned ? 'Unban user' : 'Ban user'}
                                        >
                                            {u.is_banned ? <UserCheck size={13} /> : <Ban size={13} />}
                                        </button>

                                        <button
                                            onClick={() => setConfirmDelete(u.id)}
                                            className="btn btn-sm btn-icon"
                                            style={{
                                                background: 'var(--color-danger-light)',
                                                color: 'var(--color-danger)',
                                                border: '1px solid #fecaca',
                                            }}
                                            title="Delete user permanently"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirm Modal */}
            {confirmDelete && (
                <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
                    <div className="modal" style={{ maxWidth: '24rem' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <p style={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', fontSize: '1rem', color: 'var(--color-danger)' }}>
                                    Delete User
                                </p>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.375rem' }}>
                                    This action is permanent and cannot be undone. All user data will be removed.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => deleteUser(confirmDelete)}>
                                <Trash2 size={13} /> Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
