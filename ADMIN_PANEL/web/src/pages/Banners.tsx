import api from '../lib/api';
import { BarChart2, Eye, Image as ImageIcon, MousePointer, PauseCircle, PlayCircle, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';


const fmtNum = (n: any) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n ?? 0);
const pct = (a: number, b: number) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';

const EMPTY_BANNER = {
    title: '', brand_name: '', image_url: '', link_url: '',
    is_active: true, slider_pos: 1, index_visible: true,
};

export default function Banners() {
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_BANNER);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<any>(null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/banners`);
            setBanners(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const save = async () => {
        if (editingId) {
            // State-first update
            setBanners(prev => prev.map(b => b.id === editingId ? { ...b, ...form } : b));
            try { await api.put(`/api/banners/${editingId}`, form); }
            catch { load(); }
        } else {
            const { data } = await api.post(`/api/banners`, form);
            setBanners(prev => [data, ...prev]);
        }
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_BANNER);
    };

    const toggleActive = async (id: string, isActive: boolean) => {
        setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !isActive } : b));
        try { await api.put(`/api/banners/${id}`, { is_active: !isActive }); }
        catch { load(); }
    };

    const del = async (id: string) => {
        setBanners(prev => prev.filter(b => b.id !== id));
        setConfirmDelete(null);
        try { await api.delete(`/api/banners/${id}`); } catch { load(); }
    };

    const startEdit = (b: any) => {
        setForm({
            title: b.title || '',
            brand_name: b.brand_name || '',
            image_url: b.image_url || '',
            link_url: b.link_url || '',
            is_active: b.is_active ?? true,
            slider_pos: b.slider_pos || 1,
            index_visible: b.index_visible ?? true,
        });
        setEditingId(b.id);
        setShowForm(true);
    };

    const totalCtrl = useMemo(() => ({
        impressions: banners.reduce((a, b) => a + (b.views || 0), 0),
        clicks: banners.reduce((a, b) => a + (b.clicks || 0), 0),
        idx_views: banners.reduce((a, b) => a + (b.index_views || 0), 0),
    }), [banners]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="page-title">Sponsorships</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                        {banners.length} campaigns · {banners.filter(b => b.is_active).length} active
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_BANNER); }}>
                        <Plus size={13} /> New Campaign
                    </button>
                </div>
            </div>

            {/* Platform totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                    { label: 'Banner Impressions', value: fmtNum(totalCtrl.impressions), icon: Eye, color: '#2563eb', bg: 'var(--color-primary-light)' },
                    { label: 'Index Views', value: fmtNum(totalCtrl.idx_views), icon: BarChart2, color: '#8b5cf6', bg: '#f5f3ff' },
                    { label: 'Total Clicks', value: fmtNum(totalCtrl.clicks), icon: MousePointer, color: '#10b981', bg: '#f0fdf4' },
                ].map((s, i) => (
                    <div key={i} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="stat-icon" style={{ background: s.bg }}>
                            <s.icon size={18} style={{ color: s.color }} />
                        </div>
                        <div>
                            <p className="stat-value" style={{ fontSize: '1.25rem' }}>{s.value}</p>
                            <p className="stat-label">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Banner Grid */}
            {loading ? (
                <div className="empty-state"><ImageIcon size={32} /><p>Loading campaigns...</p></div>
            ) : banners.length === 0 ? (
                <div className="empty-state"><ImageIcon size={40} /><p>No campaigns yet. Create your first one.</p></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                    {banners.map(b => {
                        const ctr = pct(b.clicks || 0, b.views || 0);
                        const idxCtr = pct(b.clicks || 0, b.index_views || 0);
                        return (
                            <div key={b.id} className="card" style={{ overflow: 'hidden', transition: 'all 0.2s' }}>
                                {/* Image */}
                                <div style={{ height: '8rem', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
                                    {b.image_url ? (
                                        <img src={b.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: b.is_active ? 1 : 0.4 }} />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <ImageIcon size={32} style={{ color: '#334155' }} />
                                        </div>
                                    )}
                                    <div style={{
                                        position: 'absolute', top: '0.5rem', left: '0.5rem',
                                        background: b.is_active ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
                                        color: 'white', fontSize: '0.625rem', fontWeight: 800,
                                        padding: '0.2rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em',
                                    }}>
                                        {b.is_active ? 'LIVE' : 'PAUSED'}
                                    </div>
                                    <div style={{
                                        position: 'absolute', top: '0.5rem', right: '0.5rem',
                                        background: 'rgba(15,23,42,0.7)', color: 'white',
                                        fontSize: '0.625rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                                        borderRadius: '999px',
                                    }}>
                                        #{b.slider_pos}
                                    </div>
                                </div>

                                {/* Info */}
                                <div style={{ padding: '1rem' }}>
                                    <p style={{ fontWeight: 700, fontFamily: 'Outfit, sans-serif', fontSize: '0.9375rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {b.title || '(no title)'}
                                    </p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>{b.brand_name || '—'}</p>

                                    {/* Metrics */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.875rem' }}>
                                        {[
                                            { label: 'Views', value: fmtNum(b.views || 0) },
                                            { label: 'Idx Views', value: fmtNum(b.index_views || 0) },
                                            { label: 'Clicks', value: fmtNum(b.clicks || 0) },
                                        ].map((m, i) => (
                                            <div key={i} style={{ textAlign: 'center', padding: '0.375rem', background: 'var(--color-surface-2)', borderRadius: '0.5rem' }}>
                                                <p style={{ fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.875rem' }}>{m.value}</p>
                                                <p style={{ fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-3)', fontWeight: 700, marginTop: '0.125rem' }}>{m.label}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTR Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.625rem', padding: '0.375rem 0', borderTop: '1px solid var(--color-border-2)' }}>
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>Banner CTR: <strong style={{ color: 'var(--color-text)' }}>{ctr}</strong></span>
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>Index CTR: <strong style={{ color: 'var(--color-text)' }}>{idxCtr}</strong></span>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                        <button
                                            onClick={() => toggleActive(b.id, b.is_active)}
                                            className="btn btn-sm"
                                            style={{
                                                flex: 1,
                                                background: b.is_active ? 'var(--color-warning-light)' : 'var(--color-success-light)',
                                                color: b.is_active ? 'var(--color-warning)' : 'var(--color-success)',
                                                border: `1px solid ${b.is_active ? '#fde68a' : '#bbf7d0'}`,
                                            }}
                                        >
                                            {b.is_active ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
                                            {b.is_active ? 'Pause' : 'Activate'}
                                        </button>
                                        <button onClick={() => startEdit(b)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(b)}
                                            className="btn btn-sm btn-icon"
                                            style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid #fecaca' }}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="modal-backdrop" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <p style={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', fontSize: '1.125rem' }}>
                                {editingId ? 'Edit Campaign' : 'New Campaign'}
                            </p>
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary btn-sm btn-icon">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { key: 'title', label: 'Campaign Title' },
                                { key: 'brand_name', label: 'Brand Name' },
                                { key: 'image_url', label: 'Image URL' },
                                { key: 'link_url', label: 'Destination URL' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="form-label">{f.label}</label>
                                    <input
                                        className="form-input"
                                        value={(form as any)[f.key]}
                                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                    />
                                </div>
                            ))}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="form-label">Slider Position</label>
                                    <input type="number" className="form-input" min={1} value={form.slider_pos}
                                        onChange={e => setForm(prev => ({ ...prev, slider_pos: parseInt(e.target.value) }))} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label className="form-label">Visibility</label>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={form.is_active} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))} />
                                            Active
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={form.index_visible} onChange={e => setForm(prev => ({ ...prev, index_visible: e.target.checked }))} />
                                            Index
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={save}>
                                {editingId ? 'Save Changes' : 'Create Campaign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {confirmDelete && (
                <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
                    <div className="modal" style={{ maxWidth: '24rem' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-danger)', fontFamily: 'Outfit, sans-serif' }}>Delete Campaign</p>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.375rem' }}>
                                    "{confirmDelete.title}" will be permanently removed.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => del(confirmDelete.id)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
