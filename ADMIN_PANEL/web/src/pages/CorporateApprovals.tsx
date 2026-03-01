import axios from 'axios';
import { AlertCircle, CheckCircle, FileText, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CorporateProfile {
    id: string;
    username: string;
    full_name: string;
    corporate_status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export default function CorporateApprovals() {
    const [pendingUsers, setPendingUsers] = useState<CorporateProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState('');

    const fetchPending = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/users/corporate/pending');
            setPendingUsers(res.data);
            setError('');
        } catch (err: any) {
            console.error(err);
            setError('Veriler yüklenirken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (id: string) => {
        try {
            const msg = prompt('Özel onay mesajı girin (Boş bırakılırsa standart mesaj gönderilir):');
            await axios.put(`http://localhost:5000/api/users/corporate/${id}/approve`, {
                admin_message: msg || undefined
            });
            setActionMessage('Kullanıcı başarıyla onaylandı.');
            setPendingUsers(prev => prev.filter(u => u.id !== id));
            setTimeout(() => setActionMessage(''), 3000);
        } catch (err) {
            alert('Onay işlemi başarısız!');
        }
    };

    const handleReject = async (id: string) => {
        try {
            const msg = prompt('Özel red sebebi girin (Boş bırakılırsa standart mesaj gönderilir):');
            await axios.put(`http://localhost:5000/api/users/corporate/${id}/reject`, {
                admin_message: msg || undefined
            });
            setActionMessage('Kullanıcı başvurusu reddedildi.');
            setPendingUsers(prev => prev.filter(u => u.id !== id));
            setTimeout(() => setActionMessage(''), 3000);
        } catch (err) {
            alert('Red işlemi başarısız!');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Kurumsal Hesap Onayları</h2>
                    <p className="text-slate-500">Gelen kurumsal üyelik taleplerini buradan inceleyebilir, onaylayıp reddedebilirsiniz.</p>
                </div>
            </div>

            {actionMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                    <span className="block sm:inline">{actionMessage}</span>
                </div>
            )}

            {error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle />
                    <span>{error}</span>
                    <button onClick={fetchPending} className="ml-auto underline text-sm">Tekrar Dene</button>
                </div>
            ) : loading ? (
                <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : pendingUsers.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-1">Bekleyen Talep Yok</h3>
                    <p className="text-slate-500">Şu anda incelenmeyi bekleyen kurumsal hesap isteği bulunmuyor.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                                <th className="p-4 font-medium">Kullanıcı Adı</th>
                                <th className="p-4 font-medium">Ad / Soyad (Firma)</th>
                                <th className="p-4 font-medium">Başvuru Tarihi</th>
                                <th className="p-4 font-medium text-right">Aksiyonlar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingUsers.map(user => (
                                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-800">@{user.username}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600">{user.full_name}</td>
                                    <td className="p-4 text-slate-500 text-sm">
                                        {new Date(user.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                disabled={loading}
                                                onClick={() => handleApprove(user.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
                                            >
                                                <CheckCircle size={16} />
                                                <span>Onayla</span>
                                            </button>
                                            <button
                                                disabled={loading}
                                                onClick={() => handleReject(user.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-md text-sm transition-colors"
                                            >
                                                <XCircle size={16} />
                                                <span>Reddet</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
