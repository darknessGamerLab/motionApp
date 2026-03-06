import { MessageSquare, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';


const fmtDate = (d: string) => new Date(d).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Comments() {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/comments?limit=200`);
            setComments(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const del = async (id: string) => {
        setComments(prev => prev.filter(c => c.id !== id));
        try { await api.delete(`/api/comments/${id}`); } catch { load(); }
    };

    const getCommentText = (c: any) => c.content || c.text || '—';

    const filtered = useMemo(() =>
        comments.filter(c => !search ||
            getCommentText(c).toLowerCase().includes(search.toLowerCase()) ||
            c.user?.username?.toLowerCase().includes(search.toLowerCase())
        ), [comments, search]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
            <div>
                <h2 className="page-title">Comments</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                    {filtered.length} comments · Moderate platform discussion
                </p>
            </div>

            <div className="search-box" style={{ maxWidth: '400px' }}>
                <Search size={14} style={{ color: 'var(--color-text-3)' }} />
                <input placeholder="Search by content or username..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Author</th>
                            <th>Comment</th>
                            <th>Posted</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4}><div className="empty-state"><MessageSquare size={32} /><p>Loading...</p></div></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={4}><div className="empty-state"><MessageSquare size={32} /><p>No comments found</p></div></td></tr>
                        ) : filtered.map(c => (
                            <tr key={c.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <img
                                            src={c.user?.avatar_url || `https://ui-avatars.com/api/?name=${c.user?.username}&size=28`}
                                            className="avatar avatar-sm" alt=""
                                        />
                                        <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>@{c.user?.username || '—'}</span>
                                    </div>
                                </td>
                                <td style={{ maxWidth: '480px' }}>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '460px' }}>
                                        {getCommentText(c)}
                                    </p>
                                </td>
                                <td style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
                                    {fmtDate(c.created_at)}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        className="btn btn-sm btn-icon"
                                        style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid #fecaca' }}
                                        onClick={() => del(c.id)}
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
