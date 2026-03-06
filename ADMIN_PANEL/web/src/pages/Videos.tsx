import api from '../lib/api';
import { Eye, Heart, MessageSquare, Play, RefreshCw, Search, Trash2, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';


const fmtNum = (n: any) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n ?? 0);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });

export default function Videos() {
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [confirmDelete, setConfirmDelete] = useState<any>(null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/videos?sort=${sortBy}&limit=200`);
            setVideos(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [sortBy]);

    const deleteVideo = async (id: string) => {
        setVideos(prev => prev.filter(v => v.id !== id));
        setConfirmDelete(null);
        try { await api.delete(`/api/videos/${id}`); } catch { load(); }
    };

    const filtered = useMemo(() =>
        videos.filter(v => !search ||
            v.description?.toLowerCase().includes(search.toLowerCase()) ||
            v.profiles?.username?.toLowerCase().includes(search.toLowerCase())
        ), [videos, search]);

    const totalLikes = filtered.reduce((a, v) => a + (v.likes_count || 0), 0);
    const totalViews = filtered.reduce((a, v) => a + (v.views_count || 0), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="page-title">Content Library</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                        {filtered.length} videos · {fmtNum(totalViews)} total views · {fmtNum(totalLikes)} total likes
                    </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={load}>
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
                    <Search size={14} style={{ color: 'var(--color-text-3)' }} />
                    <input placeholder="Search videos or creators..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="filter-tabs">
                    {[
                        { key: 'created_at', label: 'Newest' },
                        { key: 'likes_count', label: 'Most Liked' },
                        { key: 'comments_count', label: 'Most Commented' },
                        { key: 'views_count', label: 'Most Viewed' },
                    ].map(opt => (
                        <button key={opt.key} className={`filter-tab ${sortBy === opt.key ? 'active' : ''}`}
                            onClick={() => setSortBy(opt.key)}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="table-wrap">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Content</th>
                            <th>Creator</th>
                            <th>Published</th>
                            <th style={{ textAlign: 'center' }}>Views</th>
                            <th style={{ textAlign: 'center' }}>Likes</th>
                            <th style={{ textAlign: 'center' }}>Comments</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7}><div className="empty-state"><Video size={32} /><p>Loading...</p></div></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7}><div className="empty-state"><Video size={32} /><p>No videos found</p></div></td></tr>
                        ) : filtered.map(v => (
                            <tr key={v.id}>
                                <td style={{ maxWidth: '300px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '3rem', height: '4rem', background: '#0f172a',
                                            borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            position: 'relative',
                                        }}>
                                            {v.thumbnail_url ? (
                                                <img src={v.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Play size={14} style={{ color: '#475569' }} />
                                            )}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{
                                                fontWeight: 600, fontSize: '0.8125rem', overflow: 'hidden',
                                                textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px',
                                            }}>{v.description || '(no description)'}</p>
                                            {v.topic && (
                                                <span className="badge badge-neutral" style={{ marginTop: '0.25rem' }}>{v.topic}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <img
                                            src={v.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${v.profiles?.username}&size=28`}
                                            className="avatar avatar-sm" alt=""
                                        />
                                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>@{v.profiles?.username || '—'}</span>
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.75rem', color: 'var(--color-text-3)' }}>{fmtDate(v.created_at)}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                                        <Eye size={12} style={{ color: 'var(--color-text-3)' }} />
                                        <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }}>
                                            {fmtNum(v.views_count || 0)}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                                        <Heart size={12} style={{ color: '#ef4444' }} />
                                        <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', color: '#ef4444' }}>
                                            {fmtNum(v.likes_count || 0)}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}>
                                        <MessageSquare size={12} style={{ color: '#f59e0b' }} />
                                        <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem', color: '#f59e0b' }}>
                                            {fmtNum(v.comments_count || 0)}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        className="btn btn-sm btn-icon"
                                        style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid #fecaca' }}
                                        onClick={() => setConfirmDelete(v)}
                                        title="Delete video"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete Modal */}
            {confirmDelete && (
                <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
                    <div className="modal" style={{ maxWidth: '26rem' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <p style={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', fontSize: '1rem', color: 'var(--color-danger)' }}>Delete Video</p>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.375rem' }}>
                                    "{confirmDelete.description?.slice(0, 60)}" — This cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => deleteVideo(confirmDelete.id)}>
                                <Trash2 size={13} /> Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
