import axios from 'axios';
import { AlertTriangle, CheckCircle, Flag, MoreVertical, ShieldAlert, User, Video } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Report {
    id: string;
    reporter_id: string;
    target_type: 'account' | 'content';
    target_id: string;
    reason: string;
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    created_at: string;
    reporter: {
        username: string;
        avatar_url: string;
    };
    targetData: any;
}

export default function Reports() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'account' | 'content'>('account');

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/reports');
            setReports(res.data);
        } catch (err) {
            console.error('Raporlar çekilemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await axios.put(`http://localhost:5000/api/reports/${id}/status`, { status: newStatus });
            setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any } : r));
        } catch (err) {
            alert('Durum güncellenemedi!');
        }
    };

    const filteredReports = reports.filter(r => r.target_type === activeTab);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Şikayet & Rapor Yönetimi</h2>
                    <p className="text-slate-500">Topluluk güvenliğini sağlamak için gelen bildirimleri inceleyin.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('account')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'account' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <User size={18} />
                    Hesap Şikayetleri
                </button>
                <button
                    onClick={() => setActiveTab('content')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'content' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Video size={18} />
                    İçerik Şikayetleri
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl"></div>)}
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <Flag className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500">Bu kategoride bekleyen rapor bulunmuyor.</p>
                    </div>
                ) : (
                    filteredReports.map(report => (
                        <div key={report.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-primary/30 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${report.status === 'pending' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800">
                                            {report.target_type === 'account' ? `@${report.targetData?.username || 'Bilinmeyen'}` : 'Video İçeriği'}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${report.status === 'pending' ? 'bg-red-100 text-red-600' :
                                                report.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {report.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                        <span className="font-bold text-slate-700">@{report.reporter?.username || 'Anonim'}</span> tarafından bildirildi. Sebeb: {report.reason}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right hidden md:block">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {new Date(report.created_at).toLocaleDateString('tr-TR')}
                                    </p>
                                    <p className="text-sm text-slate-600 truncate max-w-[200px]">
                                        {report.target_type === 'content' ? report.targetData?.description : report.targetData?.full_name}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleStatusUpdate(report.id, 'resolved')}
                                        className="p-2 text-slate-400 hover:bg-green-50 hover:text-green-500 rounded-lg transition-colors border border-transparent hover:border-green-200"
                                    >
                                        <CheckCircle size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(report.id, 'dismissed')}
                                        className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                    >
                                        <ShieldAlert size={20} />
                                    </button>
                                    <button className="p-2 text-slate-300">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
