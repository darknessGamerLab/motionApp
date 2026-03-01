import axios from 'axios';
import { Image as ImageIcon, Plus, Trash2, Video } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RadarItem {
    id: string;
    title: string;
    description: string;
    video_url: string;
    image_url: string;
    created_at: string;
}

export default function Radar() {
    const [items, setItems] = useState<RadarItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItem, setNewItem] = useState({ title: '', description: '', video_url: '', image_url: '' });

    const fetchRadar = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/radar');
            setItems(res.data);
        } catch (err) {
            console.error('Radar verileri alınamadı:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRadar();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/radar', newItem);
            setItems([res.data, ...items]);
            setShowAddModal(false);
            setNewItem({ title: '', description: '', video_url: '', image_url: '' });
        } catch (err) {
            alert('Ekleme yapılamadı!');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu içeriği kaldırmak istediğinize emin misiniz?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/radar/${id}`);
            setItems(items.filter(i => i.id !== id));
        } catch (err) {
            alert('Silme işlemi başarısız!');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Radara Yakalananlar (Keşfet)</h2>
                    <p className="text-slate-500">Ana sayfada öne çıkan içerikleri ve duyuruları yönetin.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={20} />
                    Yeni İçerik Ekle
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-2xl"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(item => (
                        <div key={item.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
                            <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                {item.image_url ? (
                                    <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                {item.video_url && (
                                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md p-1.5 rounded-lg text-white">
                                        <Video size={16} />
                                    </div>
                                )}
                            </div>
                            <div className="p-5">
                                <h4 className="font-bold text-slate-800 text-lg">{item.title}</h4>
                                <p className="text-slate-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
                                    <span>{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold">Yeni Radar İçeriği</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAdd} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Başlık</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary"
                                    value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Açıklama</label>
                                <textarea
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary resize-none h-24"
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Görsel URL</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary"
                                        value={newItem.image_url}
                                        onChange={e => setNewItem({ ...newItem, image_url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Video URL (Opsiyonel)</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary"
                                        value={newItem.video_url}
                                        onChange={e => setNewItem({ ...newItem, video_url: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button className="w-full bg-primary text-white py-3 rounded-xl font-bold mt-4">Yayınla</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
