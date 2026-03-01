import axios from 'axios';
import { Play, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Video {
    id: string;
    video_url: string;
    thumbnail_url: string;
    description: string;
    topic: string | null;
    likes_count: number;
    views_count: number;
    created_at: string;
    profiles: {
        username: string;
        avatar_url: string | null;
    };
}

export default function Videos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchVideos = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/videos');
            setVideos(res.data);
        } catch (err) {
            console.error('Videolar çekilemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Bu videoyu silmek istediğinize emin misiniz?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/videos/${id}`);
            setVideos(prev => prev.filter(v => v.id !== id));
        } catch (err) {
            alert('Silme işlemi başarısız!');
        }
    };

    const filteredVideos = videos.filter(v =>
        v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.profiles.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">İçerik Yönetimi</h2>
                    <p className="text-slate-500">Paylaşılan videoları denetleyin ve etkileşimleri izleyin.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Video veya kullanıcı ara..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="animate-pulse bg-slate-200 aspect-[9/16] rounded-xl"></div>
                    ))}
                </div>
            ) : filteredVideos.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-slate-500 font-medium">Video bulunamadı.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredVideos.map(video => (
                        <div key={video.id} className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100">
                            <div className="aspect-[9/16] relative bg-slate-900">
                                <img
                                    src={video.thumbnail_url || 'https://picsum.photos/400/711'}
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                    alt={video.description}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity"></div>

                                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                                    <button
                                        onClick={() => handleDelete(video.id)}
                                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                                        title="Videoyu Sil"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="absolute bottom-3 left-3 right-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 border border-white/20 overflow-hidden">
                                            {video.profiles.avatar_url && <img src={video.profiles.avatar_url} className="w-full h-full object-cover" />}
                                        </div>
                                        <span className="text-xs font-bold text-white shadow-sm">@{video.profiles.username}</span>
                                    </div>
                                    <p className="text-[10px] text-white/90 line-clamp-2 leading-relaxed">
                                        {video.description}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="flex items-center gap-1 text-[10px] text-white font-bold">
                                            <Play size={10} fill="currentColor" />
                                            {video.views_count}
                                        </div>
                                        <div className="text-[10px] text-white/70 font-medium">
                                            {new Date(video.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
