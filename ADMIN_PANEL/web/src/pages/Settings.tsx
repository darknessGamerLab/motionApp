import { AlertCircle, Bell, Check, RefreshCw, Save, Send, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../lib/api';



const CONFIG_FIELDS = [
    { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'boolean', description: 'Puts the app in maintenance mode for users.' },
    { key: 'allow_registrations', label: 'Allow Registrations', type: 'boolean', description: 'Toggle new user sign-ups.' },
    { key: 'max_video_duration', label: 'Max Video Duration (seconds)', type: 'number', description: 'Maximum video length allowed on upload.' },
    { key: 'max_video_size_mb', label: 'Max Video Size (MB)', type: 'number', description: 'Maximum file size for video uploads.' },
    { key: 'featured_banner_count', label: 'Featured Banner Count', type: 'number', description: 'Number of banners shown in the feed.' },
    { key: 'platform_name', label: 'Platform Name', type: 'string', description: 'The display name of the platform.' },
    { key: 'support_email', label: 'Support Email', type: 'string', description: 'Contact email shown to users.' },
];

export default function SettingsPage() {
    const [config, setConfig] = useState<Record<string, any>>({});
    const [original, setOriginal] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [globalNotif, setGlobalNotif] = useState({ title: '', content: '' });
    const [sendingNotif, setSendingNotif] = useState(false);
    const [notifSuccess, setNotifSuccess] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/config`);
            setConfig(data);
            setOriginal(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const saveField = async (key: string) => {
        setSaving(key);
        try {
            await api.put(`/api/config/${key}`, { value: config[key] });
            setOriginal(prev => ({ ...prev, [key]: config[key] }));
        } catch (e) { console.error(e); } finally { setSaving(null); }
    };

    const sendGlobalNotif = async () => {
        if (!globalNotif.content.trim()) return;
        setSendingNotif(true);
        try {
            await api.post(`/api/notifications/send-global`, globalNotif);
            setNotifSuccess(true);
            setGlobalNotif({ title: '', content: '' });
            setTimeout(() => setNotifSuccess(false), 3000);
        } catch (e) { console.error(e); } finally { setSendingNotif(false); }
    };

    const isDirty = (key: string) => config[key] !== original[key];

    if (loading) return <div>Loading settings...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="page-title">System Settings</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
                        Platform-wide configuration and administration tools
                    </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /> Reload</button>
            </div>

            {/* System Config */}
            <div className="card">
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <Settings size={16} style={{ color: 'var(--color-primary)' }} />
                    <p className="section-title">Platform Configuration</p>
                </div>
                <div style={{ padding: '0.5rem 0' }}>
                    {CONFIG_FIELDS.map(field => {
                        const val = config[field.key];
                        const dirty = isDirty(field.key);
                        return (
                            <div key={field.key} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border-2)',
                                gap: '1.5rem',
                            }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{field.label}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '0.125rem' }}>{field.description}</p>
                                    <p style={{ fontSize: '0.625rem', color: 'var(--color-text-3)', fontFamily: 'monospace', marginTop: '0.25rem' }}>key: <span style={{ color: 'var(--color-primary)' }}>{field.key}</span></p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                    {field.type === 'boolean' ? (
                                        <button
                                            onClick={() => setConfig(prev => ({ ...prev, [field.key]: !val }))}
                                            style={{
                                                width: '3rem', height: '1.5rem', borderRadius: '999px',
                                                background: val ? 'var(--color-primary)' : '#e2e8f0',
                                                border: 'none', cursor: 'pointer', position: 'relative',
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            <span style={{
                                                position: 'absolute', top: '0.125rem',
                                                left: val ? 'calc(100% - 1.25rem)' : '0.125rem',
                                                width: '1.25rem', height: '1.25rem',
                                                background: 'white', borderRadius: '50%',
                                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                            }} />
                                        </button>
                                    ) : field.type === 'number' ? (
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={val ?? ''}
                                            onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            style={{ width: '120px', textAlign: 'right' }}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={val ?? ''}
                                            onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            style={{ width: '220px' }}
                                        />
                                    )}
                                    <button
                                        className={`btn btn-sm ${dirty ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => saveField(field.key)}
                                        disabled={!dirty || saving === field.key}
                                        style={{ minWidth: '4.5rem' }}
                                    >
                                        {saving === field.key ? '...' : dirty ? <><Save size={11} /> Save</> : <Check size={11} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Global Notification Broadcast */}
            <div className="card">
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <Bell size={16} style={{ color: 'var(--color-primary)' }} />
                    <p className="section-title">Broadcast Notification</p>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
                        Send a system notification to ALL registered users on the platform.
                    </p>
                    <div>
                        <label className="form-label">Title (optional)</label>
                        <input
                            className="form-input"
                            placeholder="e.g. Platform Update"
                            value={globalNotif.title}
                            onChange={e => setGlobalNotif(p => ({ ...p, title: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="form-label">Message *</label>
                        <textarea
                            className="form-input"
                            placeholder="Enter your message..."
                            rows={4}
                            value={globalNotif.content}
                            onChange={e => setGlobalNotif(p => ({ ...p, content: e.target.value }))}
                            style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {notifSuccess && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-success)', fontSize: '0.8125rem', fontWeight: 600 }}>
                                <Check size={14} /> Sent to all users!
                            </div>
                        )}
                        <button
                            className="btn btn-primary"
                            onClick={sendGlobalNotif}
                            disabled={sendingNotif || !globalNotif.content.trim()}
                        >
                            <Send size={13} />
                            {sendingNotif ? 'Sending...' : 'Broadcast to All Users'}
                        </button>
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem',
                        background: 'var(--color-warning-light)', borderRadius: 'var(--radius-md)',
                        border: '1px solid #fde68a',
                    }}>
                        <AlertCircle size={15} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '0.125rem' }} />
                        <p style={{ fontSize: '0.75rem', color: '#92400e', lineHeight: 1.5 }}>
                            This will send a push notification to every user on the platform. Use sparingly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
