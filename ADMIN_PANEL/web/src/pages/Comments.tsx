import axios from 'axios';
import { MessageSquare, Search, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Comment {
    id: string;
    content: string;
    created_at: string;
    video_id: string;
    user: {
        username: string;
        avatar_url: string;
    };
}

export default function Comments() {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchComments = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/comments');
            setComments(res.data);
        } catch (err) {
            console.error('Yorumlar alınamadı:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/comments/${id}`);
            setComments(comments.filter(c => c.id !== id));
        } catch (err) {
            alert('Silme işlemi başarısız!');
        }
    };

    const filteredComments = comments.filter(c =>
        c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Yorum Moderasyonu</h2>
                    <p className="text-slate-500">Platformdaki tüm yorumları izleyin ve uygunsuz içerikleri kaldırın.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Yorum veya kullanıcı ara..."
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary w-full md:w-64"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Kullanıcı</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Yorum</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Video ID</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tarih</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Aksiyon</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-6 py-6 h-16 bg-slate-50/30"></td>
                                </tr>
                            ))
                        ) : filteredComments.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                                    <MessageSquare size={48} className="mx-auto mb-4 opacity-10" />
                                    Yorum bulunamadı.
                                </td>
                            </tr>
                        ) : (
                            filteredComments.map(comment => (
                                <tr key={comment.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                                                {comment.user.avatar_url ? (
                                                    <img src={comment.user.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <User size={14} />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-medium text-slate-700">@{comment.user.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 min-w-[300px]">
                                        <p className="text-slate-600 text-sm">{comment.content}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                            {comment.video_id.substring(0, 8)}...
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(comment.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
