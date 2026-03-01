import axios from 'axios';
import {
    Activity,
    Ban,
    Eye,
    Save,
    Search,
    Trash2,
    Users as UsersIcon,
    Video as VideoIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserProfile {
    id: string;
    username: string;
    full_name: string;
    user_type: 'individual' | 'corporate';
    tax_office?: string | null;
    tax_number?: string | null;
    radars_count: number;
    created_at: string;
    updated_at: string;
    is_banned?: boolean;
    _count: {
        videos: number;
        likes: number;
        comments: number;
    };
    followers_count: number;
    following_count: number;
}

export default function Users() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'individual' | 'corporate'>('all');
    const [localTypes, setLocalTypes] = useState<Record<string, 'individual' | 'corporate'>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Kullanıcılar çekilemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleBan = async (id: string, isBanned: boolean) => {
        const action = isBanned ? 'kaldırmak' : 'atmak';
        if (!confirm(`Kullanıcıya ban ${action} istediğinize emin misiniz?`)) return;
        try {
            await axios.put(`http://localhost:5000/api/users/${id}/ban`, { is_banned: !isBanned });
            setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: !isBanned } : u));
        } catch (err) {
            alert('Ban işlemi başarısız!');
        }
    };

    const handleTypeChange = (id: string, newType: 'individual' | 'corporate') => {
        setLocalTypes(prev => ({ ...prev, [id]: newType }));
    };

    const handleSaveType = async (user: UserProfile) => {
        const newType = localTypes[user.id];
        if (!newType || newType === user.user_type) return;

        try {
            setSavingId(user.id);
            await axios.put(`http://localhost:5000/api/users/${user.id}/type`, { user_type: newType });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, user_type: newType } : u));
            setLocalTypes(prev => {
                const next = { ...prev };
                delete next[user.id];
                return next;
            });
        } catch (err) {
            alert('Kaydetme işlemi başarısız!');
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Kullanıcıyı TAMAMEN silmek üzeresiniz. Bu işlem geri alınamaz!')) return;
        try {
            await axios.delete(`http://localhost:5000/api/users/${id}`);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            alert('Silme işlemi başarısız!');
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.full_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'all' || u.user_type === filterType;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Kullanıcı Yönetimi</h2>
                    <p className="text-slate-500">Tüm kullanıcıları izleyin, inceleyin ve yetkilerini yönetin.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Ara (Username, Ad...)"
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-all text-sm font-medium"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                    >
                        <option value="all">Tümü</option>
                        <option value="individual">Bireysel</option>
                        <option value="corporate">Kurumsal</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-bold">
                                <th className="p-4">Kullanıcı & Profil</th>
                                <th className="p-4 text-center">Video</th>
                                <th className="p-4 text-center">Radar</th>
                                <th className="p-4 text-center">Takip</th>
                                <th className="p-4">Bilgiler & Vergi</th>
                                <th className="p-4">Statü</th>
                                <th className="p-4 text-right">Aksiyonlar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse border-b border-slate-100">
                                        <td colSpan={7} className="p-4"><div className="h-10 bg-slate-100 rounded-md w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-20 text-center">
                                        <UsersIcon className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                                        <p className="text-slate-500 font-medium">Kullanıcı bulunamadı.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${user.is_banned ? 'bg-red-50/30' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-200 w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 bg-gradient-to-br from-slate-100 to-slate-200 uppercase">
                                                        {user.username.charAt(0)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 leading-tight">@{user.username}</div>
                                                    <div className="text-xs text-slate-500">{user.full_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">
                                                <VideoIcon size={12} />
                                                {user._count?.videos || 0}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-1 rounded text-xs font-bold">
                                                <Activity size={12} />
                                                {user.radars_count || 0}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center text-sm font-semibold text-slate-600">
                                            {user.followers_count || 0} / {user.following_count || 0}
                                        </td>
                                        <td className="p-4">
                                            {user.user_type === 'corporate' ? (
                                                <div className="flex flex-col text-[10px]">
                                                    <span className="font-bold text-slate-700">{user.tax_office || 'VD Belirtilmemiş'}</span>
                                                    <span className="text-slate-500">{user.tax_number || 'VN Belirtilmemiş'}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 font-medium italic">Bireysel Kullanıcı</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <select
                                                className={`text-[10px] font-black uppercase ring-1 px-2 py-0.5 rounded-full outline-none bg-transparent cursor-pointer transition-all ${(localTypes[user.id] || user.user_type) === 'corporate'
                                                    ? 'text-amber-600 ring-amber-100 bg-amber-50 hover:bg-amber-100'
                                                    : 'text-blue-500 ring-blue-100 bg-blue-50 hover:bg-blue-100'
                                                    }`}
                                                value={localTypes[user.id] || user.user_type}
                                                onChange={(e) => handleTypeChange(user.id, e.target.value as any)}
                                            >
                                                <option value="individual">Bireysel</option>
                                                <option value="corporate">Kurumsal</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-1.5 transition-all">
                                                <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-md transition-all" title="İncele"><Eye size={18} /></button>
                                                {localTypes[user.id] && localTypes[user.id] !== user.user_type && (
                                                    <button
                                                        onClick={() => handleSaveType(user)}
                                                        disabled={savingId === user.id}
                                                        className={`p-1.5 rounded-md transition-all text-green-600 bg-green-50 hover:bg-green-100 animate-in zoom-in duration-200`}
                                                        title="Değişikliği Kaydet"
                                                    ><Save size={18} /></button>
                                                )}
                                                <button onClick={() => handleBan(user.id, user.is_banned || false)} className={`p-1.5 rounded-md transition-all ${user.is_banned ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'}`} title={user.is_banned ? "Banı Kaldır" : "Banla"}><Ban size={18} /></button>
                                                <button onClick={() => handleDelete(user.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-md transition-all" title="Kullanıcıyı Sil"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && filteredUsers.length > 0 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-medium uppercase tracking-widest flex justify-between">
                        <span>Toplam {filteredUsers.length} Kullanıcı Listeleniyor</span>
                        <span>MotionAdmin v2.1.0 Sync</span>
                    </div>
                )}
            </div>
        </div>
    );
}
