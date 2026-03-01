import axios from 'axios';
import { ExternalLink, Image as ImageIcon, MonitorPlay, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Banner {
    id: string;
    title: string;
    brand: string;
    image_url: string;
    target_url: string | null;
    slider_pos: number;
    is_active: boolean;
    clicks: number;
    views: number;
}

export default function Banners() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBanner, setNewBanner] = useState({
        title: '',
        brand: '',
        image_url: '',
        target_url: '',
        slider_pos: 1
    });

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/banners');
            setBanners(res.data);
        } catch (err) {
            console.error('Bannerlar çekilemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleAddBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/banners', newBanner);
            setShowAddModal(false);
            setNewBanner({ title: '', brand: '', image_url: '', target_url: '', slider_pos: 1 });
            fetchBanners();
        } catch (err) {
            alert('Banner eklenemedi!');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu reklamı silmek istediğinize emin misiniz?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/banners/${id}`);
            setBanners(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            alert('Silme işlemi başarısız!');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Banner & Reklam Yönetimi</h2>
                    <p className="text-slate-500">Uygulama içindeki 3 farklı slider alanını yönetin.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md shadow-primary/20"
                >
                    <Plus size={20} />
                    Yeni Reklam Ekle
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>)}
                </div>
            ) : banners.length === 0 ? (
                <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                    <ImageIcon className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">Henüz Reklam Yok</h3>
                    <p className="text-slate-500">İlk reklam kampanyanızı oluşturmak için yukarıdaki butonu kullanın.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.map(banner => (
                        <div key={banner.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                            <div className="relative h-40 bg-slate-100">
                                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md">
                                    Slider {banner.slider_pos}
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{banner.brand}</span>
                                        <h3 className="font-semibold text-slate-800 line-clamp-1">{banner.title}</h3>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(banner.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 border-t pt-4">
                                    <div className="flex items-center gap-1">
                                        <MonitorPlay size={14} />
                                        <span>{banner.views} Gösterim</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <ExternalLink size={14} />
                                        <span>{banner.clicks} Tıklama</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Yeni Reklam Kampanyası</h3>
                        <form onSubmit={handleAddBanner} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Marka Adı</label>
                                <input
                                    type="text" required
                                    placeholder="Örn: Nike, Redbull"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={newBanner.brand}
                                    onChange={e => setNewBanner({ ...newBanner, brand: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reklam Başlığı</label>
                                <input
                                    type="text" required
                                    placeholder="Örn: Sınırlarını Zorla"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={newBanner.title}
                                    onChange={e => setNewBanner({ ...newBanner, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Görsel / Video URL</label>
                                <input
                                    type="url" required
                                    placeholder="https://..."
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={newBanner.image_url}
                                    onChange={e => setNewBanner({ ...newBanner, image_url: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Hedef Link (Opsiyonel)</label>
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={newBanner.target_url}
                                    onChange={e => setNewBanner({ ...newBanner, target_url: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Yayınlanacak Alan</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    value={newBanner.slider_pos}
                                    onChange={e => setNewBanner({ ...newBanner, slider_pos: parseInt(e.target.value) })}
                                >
                                    <option value={1}>1. Ana Banner (Giriş)</option>
                                    <option value={2}>2. Orta Banner (25'li)</option>
                                    <option value={13}>3. Alt Banner (100'lü)</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 shadow-lg shadow-primary/20 transition-all font-semibold"
                                >
                                    Kampanyayı Başlat
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
