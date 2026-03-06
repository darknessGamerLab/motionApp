import api from '../lib/api';
import { Briefcase, Radio, Search, Trash2, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';


const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Radar() {
    const [radars, setRadars] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/radars`);
            setRadars(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const del = async (id: string) => {
        setRadars(prev => prev.filter(r => r.id !== id));
        try { await api.delete(`/api/radars/${id}`); } catch { load(); }
    };

    const filtered = useMemo(() =>
        radars.filter(r => !search ||
            r.corporate?.username?.toLowerCase().includes(search.toLowerCase()) ||
            r.individual?.username?.toLowerCase().includes(search.toLowerCase())
        ), [radars, search]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
            <div>
                <h2 className="page-title">Radar / B2B</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                    {filtered.length} corporate ↔ individual connections
                </p>
            </div>

            <div className="search-box" style={{ maxWidth: '360px' }}>
                <Search size={14} style={{ color: 'var(--color-text-3)' }} />
                <input placeholder="Search by corporate or individual name..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Corporate</th>
                            <th style={{ textAlign: 'center' }}>→</th>
                            <th>Individual</th>
                            <th>Connected</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5}><div className="empty-state"><Radio size={32} /><p>Loading...</p></div></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5}><div className="empty-state"><Radio size={32} /><p>No radar connections</p></div></td></tr>
                        ) : filtered.map(r => (
                            <tr key={r.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '2rem', height: '2rem', borderRadius: '50%',
                                            background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            <Briefcase size={13} style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '0.8125rem' }}>@{r.corporate?.username || '—'}</p>
                                            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>{r.corporate?.full_name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <Zap size={14} style={{ color: '#f59e0b' }} />
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <img
                                            src={r.individual?.avatar_url || `https://ui-avatars.com/api/?name=${r.individual?.username}&size=28`}
                                            className="avatar avatar-sm" alt=""
                                        />
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '0.8125rem' }}>@{r.individual?.username || '—'}</p>
                                            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>{r.individual?.full_name}</p>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{fmtDate(r.created_at)}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        className="btn btn-sm btn-icon"
                                        style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid #fecaca' }}
                                        onClick={() => del(r.id)}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
