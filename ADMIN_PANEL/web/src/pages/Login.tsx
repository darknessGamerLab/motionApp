import { Lock } from 'lucide-react';
import React, { useState } from 'react';
import api from '../lib/api';

interface LoginProps {
    onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // We hit the root or summary endpoint temporarily setting the header
            const res = await api.get('/api/dashboard/summary', {
                headers: {
                    'X-Admin-Key': password
                }
            });

            if (res.status === 200) {
                localStorage.setItem('adminToken', password);
                onLogin();
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Geçersiz yönetici şifresi');
            } else {
                setError('Bağlantı hatası veya sunucu yanıt vermiyor');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: 'var(--color-bg)', padding: '1rem'
        }}>
            <div style={{
                background: 'var(--color-surface)', padding: '2.5rem',
                borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: 'var(--color-primary-light)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)'
                    }}>
                        <Lock size={24} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                        MotionApp Admin
                    </h1>
                    <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
                        Panele erişmek için yönetici şifrenizi girin
                    </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-2)' }}>Yönetici Şifresi</label>
                        <input
                            type="password"
                            className="form-input"
                            style={{
                                width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)', outline: 'none', fontSize: '0.875rem'
                            }}
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: 'var(--color-danger-light)', color: 'var(--color-danger)',
                            padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 500,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                            width: '100%', marginTop: '0.5rem', height: '44px',
                            background: 'var(--color-primary)', color: '#fff', border: 'none',
                            borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer'
                        }}
                        disabled={loading || !password}
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>
            </div>
        </div>
    );
}
