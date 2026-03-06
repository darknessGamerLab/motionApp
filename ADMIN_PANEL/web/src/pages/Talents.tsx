import api from '../lib/api';
import { Plus, Search, Tag, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';



export default function Talents() {
    const [talents, setTalents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', category: '', icon: '' });

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/talents`);
            setTalents(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!form.name.trim()) return;
        const { data } = await api.post(`/api/talents`, form);
        setTalents(prev => [data, ...prev]);
        setShowForm(false);
        setForm({ name: '', category: '', icon: '' });
    };

    const del = async (id: string) => {
        setTalents(prev => prev.filter(t => t.id !== id));
        try { await api.delete(`/api/talents/${id}`); } catch { load(); }
    };

    const filtered = useMemo(() =>
        talents.filter(t => !search ||
            t.name?.toLowerCase().includes(search.toLowerCase()) ||
            t.category?.toLowerCase().includes(search.toLowerCase())
        ), [talents, search]);

    const categories = useMemo(() => [...new Set(talents.map(t => t.category).filter(Boolean))], [talents]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="page-title">Talents</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                        {talents.length} talents · {categories.length} categories · Shown at registration
                    </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                    <Plus size={13} /> Add Talent
                </button>
            </div>

            <div className="search-box" style={{ maxWidth: '360px' }}>
                <Search size={14} style={{ color: 'var(--color-text-3)' }} />
                <input placeholder="Search talents or categories..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Category groups */}
            {loading ? (
                <div className="empty-state"><Tag size={32} /><p>Loading...</p></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state"><Tag size={32} /><p>No talents found</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {[...categories, null].map(cat => {
                        const group = filtered.filter(t => cat === null ? !t.category : t.category === cat);
                        if (group.length === 0) return null;
                        return (
                            <div key={cat || 'uncategorized'}>
                                <p style={{
                                    fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: '0.1em', color: 'var(--color-text-3)', marginBottom: '0.75rem'
                                }}>
                                    {cat || 'Uncategorized'} ({group.length})
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {group.map(t => (
                                        <div key={t.id} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                            padding: '0.375rem 0.75rem', borderRadius: '999px',
                                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                            fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)',
                                        }}>
                                            {t.icon && <span>{t.icon}</span>}
                                            {t.name}
                                            <button
                                                onClick={() => del(t.id)}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: 'var(--color-text-3)', padding: 0, marginLeft: '0.125rem',
                                                    display: 'flex', alignItems: 'center',
                                                }}
                                                title="Delete"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showForm && (
                <div className="modal-backdrop" onClick={() => setShowForm(false)}>
                    <div className="modal" style={{ maxWidth: '28rem' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <p style={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', fontSize: '1.125rem' }}>Add New Talent</p>
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary btn-sm btn-icon"><X size={14} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <div>
                                <label className="form-label">Talent Name *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Futbol, Müzik, Yazılım" />
                            </div>
                            <div>
                                <label className="form-label">Category</label>
                                <input className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Spor, Sanat, Teknoloji" list="categories" />
                                <datalist id="categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
                            </div>
                            <div>
                                <label className="form-label">Emoji Icon</label>
                                <input className="form-input" value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="⚽" style={{ fontSize: '1.25rem' }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={create} disabled={!form.name.trim()}>
                                <Plus size={13} /> Add Talent
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
