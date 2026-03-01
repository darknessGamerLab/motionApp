import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { Bell, Layout, MessageSquare, Radar as RadarIcon, ShieldCheck, TrendingUp, Users, Video } from 'lucide-react';
import { useEffect, useState } from 'react';

const supabase = createClient('https://mhgxrzejobmkuwylyelx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZ3hyemVqb2Jta3V3eWx5ZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODY0NDksImV4cCI6MjA4MzE2MjQ0OX0.8IDCg303cgOsglyydOPm_-GBQaEJNKBFEZk8NrtSK24');

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        pendingCorporate: 0,
        totalVideos: 0,
        totalBanners: 0,
        totalComments: 0,
        totalRadar: 0
    });
    const [loading, setLoading] = useState(true);
    const [notif, setNotif] = useState({ title: '', content: '' });
    const [sending, setSending] = useState(false);
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/dashboard/summary');
            setStats(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchStats();

        // Realtime Subscriptions
        const channels = [
            'radars', 'comments', 'likes', 'profiles', 'videos'
        ].map(table =>
            supabase.channel(`any-${table}`)
                .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
                    console.log(`Change detected in ${table}, refreshing stats...`);
                    fetchStats();
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') setRealtimeConnected(true);
                })
        );

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, []);

    const sendGlobalNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!notif.title || !notif.content) return;
        try {
            setSending(true);
            await axios.post('http://localhost:5000/api/notifications/send-global', notif);
            alert('Bildirim tüm kullanıcılara başarıyla gönderildi!');
            setNotif({ title: '', content: '' });
        } catch (err) {
            alert('Bildirim gönderilemedi!');
        } finally {
            setSending(false);
        }
    };

    const cards = [
        { label: 'Toplam Kullanıcı', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Bekleyen Onaylar', value: stats.pendingCorporate, icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Toplam Video', value: stats.totalVideos, icon: Video, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Aktif Banner', value: stats.totalBanners, icon: Layout, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Toplam Yorum', value: stats.totalComments, icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-50' },
        { label: 'Radar İçeriği', value: stats.totalRadar, icon: RadarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
                        {realtimeConnected && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-[10px] font-bold text-green-600 border border-green-100 animate-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                LIVE SYNC
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500">Uygulama genelindeki aktiviteleri anlık olarak izleyin.</p>
                </div>
                <div className="flex gap-2">
                    <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Canlı Veri Akışı
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 group-hover:text-primary transition-colors">{card.label}</p>
                                <h3 className="text-3xl font-bold text-slate-800 mt-1">{loading ? '...' : card.value}</h3>
                            </div>
                            <div className={`p-4 rounded-2xl ${card.bg} ${card.color} shadow-sm group-hover:scale-110 transition-transform`}>
                                <card.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Trend Chart Area (Unified UI Style) */}
                <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                <TrendingUp size={22} className="text-primary" />
                                Etkileşim Trendi
                            </h3>
                            <p className="text-sm text-slate-400">Son 10 günün karşılaştırmalı analizi</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="px-3 py-1 bg-slate-50 rounded-lg text-xs font-bold text-slate-500">HAFTALIK</div>
                            <div className="px-3 py-1 bg-primary/10 rounded-lg text-xs font-bold text-primary">AYLIK</div>
                        </div>
                    </div>

                    <div className="h-[280px] flex items-end justify-between gap-3 px-2">
                        {[40, 70, 45, 90, 65, 80, 50, 40, 85, 95].map((h, i) => (
                            <div key={i} className="flex-1 bg-slate-50 rounded-2xl relative group h-full">
                                <div
                                    style={{ height: `${h}%` }}
                                    className="absolute bottom-0 left-0 right-0 bg-primary group-hover:bg-primary/80 transition-all rounded-2xl opacity-80"
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        %{h}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-6 text-[10px] text-slate-300 font-extrabold tracking-widest uppercase">
                        <span>PZT</span><span>SAL</span><span>ÇAR</span><span>PER</span><span>CUM</span><span>CMT</span><span>PAZ</span>
                    </div>
                </div>

                {/* Send Notification Card */}
                <div className="lg:col-span-4 bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-primary/20 text-primary rounded-2xl">
                            <Bell size={24} />
                        </div>
                        <h3 className="text-xl font-bold">Anlık Duyuru</h3>
                    </div>
                    <form onSubmit={sendGlobalNotification} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bildirim Başlığı</label>
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-primary transition-colors placeholder:text-slate-600"
                                placeholder="Örn: Hafta Sonu Turnuvası!"
                                value={notif.title}
                                onChange={e => setNotif({ ...notif, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detaylı Mesaj</label>
                            <textarea
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-primary transition-colors resize-none h-36 placeholder:text-slate-600"
                                placeholder="Tüm kullanıcılara gidecek mesaj..."
                                value={notif.content}
                                onChange={e => setNotif({ ...notif, content: e.target.value })}
                            />
                        </div>
                        <button
                            disabled={sending}
                            className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 active:scale-95"
                        >
                            {sending ? 'Gönderiliyor...' : 'Şimdi Yayınla'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="max-w-xl">
                        <h3 className="text-2xl font-bold mb-4">Veri Modeli Güvenliği</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Admin paneli veritabanı ile tam senkronize çalışmaktadır.
                            Yapılan tüm değişiklikler anında mobil uygulama üzerinde etkisini gösterir.
                            UUID doğrulama sistemi aktif durumdadır.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center bg-white/5 p-4 py-6 rounded-3xl backdrop-blur-md border border-white/10 w-32">
                            <div className="text-primary font-bold text-2xl">API</div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">v2.4 Online</div>
                        </div>
                        <div className="text-center bg-white/5 p-4 py-6 rounded-3xl backdrop-blur-md border border-white/10 w-32">
                            <div className="text-emerald-400 font-bold text-2xl">RLS</div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Active</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
