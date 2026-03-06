import api from '../lib/api';
import { Grid, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';


const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

export default function Categories() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', color: COLORS[0], icon: '' });

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/categories`);
            setCategories(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!form.name.trim()) return;
        const { data } = await api.post(`/api/categories`, form);
        setCategories(prev => [data, ...prev]);
        setShowForm(false);
        setForm({ name: '', color: COLORS[0], icon: '' });
    };

    const del = async (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
        try { await api.delete(`/api/categories/${id}`); } catch { load(); }
    };

    const filtered = useMemo(() =>
        categories.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()))
        , [categories, search]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="page-title">Categories</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                        {categories.length} categories · Content taxonomy
                    </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                    <Plus size={13} /> Add Category
                </button>
            </div>

            <div className="search-box" style={{ maxWidth: '360px' }}>
                <Search size={14} style={{ color: 'var(--color-text-3)' }} />
                <input placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {loading ? (
                <div className="empty-state"><Grid size={32} /><p>Loading...</p></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state"><Grid size={32} /><p>No categories</p></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                    {filtered.map(c => (
                        <div key={c.id} className="card card-padded" style={{
                            borderLeft: `3px solid ${c.color || '#2563eb'}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                {c.icon && <span style={{ fontSize: '1.25rem' }}>{c.icon}</span>}
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{c.name}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color || '#2563eb', display: 'inline-block' }} />
                                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-3)', fontFamily: 'monospace' }}>{c.color}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => del(c.id)}
                                className="btn btn-sm btn-icon"
                                style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid #fecaca', marginLeft: '0.5rem' }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="modal-backdrop" onClick={() => setShowForm(false)}>
                    <div className="modal" style={{ maxWidth: '28rem' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <p style={{ fontWeight: 800, fontFamily: 'Outfit, sans-serif', fontSize: '1.125rem' }}>Add Category</p>
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary btn-sm btn-icon"><X size={14} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <div>
                                <label className="form-label">Name *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Spor" />
                            </div>
                            <div>
                                <label className="form-label">Emoji Icon</label>
                                <input className="form-input" value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="🎯" style={{ fontSize: '1.25rem' }} />
                            </div>
                            <div>
                                <label className="form-label">Color</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                    {COLORS.map(col => (
                                        <button
                                            key={col}
                                            onClick={() => setForm(p => ({ ...p, color: col }))}
                                            style={{
                                                width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: col,
                                                border: form.color === col ? '3px solid #0f172a' : '2px solid transparent',
                                                cursor: 'pointer', transition: 'all 0.15s',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={create} disabled={!form.name.trim()}>
                                <Plus size={13} /> Add Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
