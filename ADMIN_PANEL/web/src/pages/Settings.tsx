import axios from 'axios';
import { Bell, HardDrive, Lock, Palette, Shield, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');
    const [configs, setConfigs] = useState<any>({});
    const [loading, setLoading] = useState(true);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/config');
            setConfigs(res.data);
        } catch (err) {
            console.error('Config alınamadı:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const handleConfigUpdate = async (key: string, value: any) => {
        try {
            await axios.put(`http://localhost:5000/api/config/${key}`, { value });
            setConfigs({ ...configs, [key]: value });
        } catch (err) {
            alert('Ayar güncellenemedi!');
        }
    };

    const sections = [
        { id: 'general', label: 'Genel Ayarlar', icon: SettingsIcon },
        { id: 'security', label: 'Güvenlik & Erişim', icon: Shield },
        { id: 'appearance', label: 'Görünüm', icon: Palette },
        { id: 'notifications', label: 'Bildirim Yönetimi', icon: Bell },
        { id: 'storage', label: 'Depolama & Yedek', icon: HardDrive },
        { id: 'mobile', label: 'Mobil Uygulama', icon: Smartphone },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Sistem Ayarları</h2>
                <p className="text-slate-500">Platformun çalışma şeklini ve güvenlik kriterlerini yapılandırın.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-64 flex flex-col gap-1">
                    {sections.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveTab(s.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === s.id
                                ? 'bg-primary/10 text-primary border-l-4 border-primary'
                                : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <s.icon size={18} />
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6">
                    {loading ? (
                        <div className="space-y-6 animate-pulse">
                            <div className="h-10 bg-slate-50 rounded-lg"></div>
                            <div className="h-px bg-slate-100"></div>
                            <div className="h-10 bg-slate-50 rounded-lg"></div>
                        </div>
                    ) : activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-800">Uygulama Adı</h4>
                                    <p className="text-sm text-slate-500">Platformun görünen ismi.</p>
                                </div>
                                <input
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-primary outline-none"
                                    defaultValue="MotionApp"
                                />
                            </div>
                            <div className="h-px bg-slate-100"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-800">Bakım Modu</h4>
                                    <p className="text-sm text-slate-500">Platformu geçici olarak bakıma al.</p>
                                </div>
                                <div
                                    onClick={() => handleConfigUpdate('maintenance_mode', !configs.maintenance_mode)}
                                    className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${configs.maintenance_mode ? 'bg-red-500 flex justify-end' : 'bg-slate-200'}`}
                                >
                                    <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>
                            <div className="h-px bg-slate-100"></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-800">Kurumsal Otomatik Onay</h4>
                                    <p className="text-sm text-slate-500">Yeni başvuruları incelemeden onayla.</p>
                                </div>
                                <div
                                    onClick={() => handleConfigUpdate('auto_approve_corporate', !configs.auto_approve_corporate)}
                                    className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${configs.auto_approve_corporate ? 'bg-green-500 flex justify-end' : 'bg-slate-200'}`}
                                >
                                    <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-700">
                                <Lock size={20} className="shrink-0" />
                                <p className="text-sm">Bazı ayarlar yüksek yetkili admin girişi gerektirir.</p>
                            </div>
                            <div className="space-y-4">
                                <button className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold hover:bg-black transition-colors">
                                    Admin Şifresini Değiştir
                                </button>
                                <button className="w-full border border-slate-200 text-slate-700 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors">
                                    Tüm Oturumları Kapat
                                </button>
                            </div>
                        </div>
                    )}

                    {(activeTab !== 'general' && activeTab !== 'security') && (
                        <div className="text-center py-20 opacity-40">
                            <p>Bu bölüm geliştirme aşamasındadır.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SettingsIcon(props: any) {
    return <Smartphone {...props} />;
}
