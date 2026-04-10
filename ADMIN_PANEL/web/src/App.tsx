import {
  Activity, BarChart2, Bell, Briefcase,
  Flag, Image as ImageIcon,
  LayoutDashboard, List, LogOut, MessageSquare, Radio, Settings, Shield,
  Users, Video, Zap
} from 'lucide-react';
import { NavLink, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import { useEffect, useState } from 'react';
import Analytics from './pages/Analytics';
import Banners from './pages/Banners';
import Categories from './pages/Categories';
import Comments from './pages/Comments';
import CorporateApprovals from './pages/CorporateApprovals';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Radar from './pages/Radar';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import Talents from './pages/Talents';
import UsersPage from './pages/Users';
import Videos from './pages/Videos';

const navGroups = [
  {
    label: 'Platform',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { path: '/analytics', label: 'Analytics', icon: BarChart2 },
      { path: '/users', label: 'Users', icon: Users },
      { path: '/corporate', label: 'Corporate', icon: Briefcase },
    ],
  },
  {
    label: 'Content',
    items: [
      { path: '/videos', label: 'Videos', icon: Video },
      { path: '/comments', label: 'Comments', icon: MessageSquare },
      { path: '/reports', label: 'Reports', icon: Flag },
    ],
  },
  {
    label: 'Monetization',
    items: [
      { path: '/banners', label: 'Sponsorships', icon: ImageIcon },
      { path: '/radar', label: 'Radar / B2B', icon: Radio },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { path: '/talents', label: 'Talents', icon: Zap },
      { path: '/categories', label: 'Categories', icon: List },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Activity size={16} />
        </div>
        <span className="sidebar-brand-name">MotionOS</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="sidebar-section-label">{group.label}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <item.icon size={15} className="icon" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-card-avatar">
            <img
              src="https://ui-avatars.com/api/?name=Admin&background=2563eb&color=fff&size=32"
              alt="admin"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div className="user-card-info">
            <p className="user-card-name">System Admin</p>
            <p className="user-card-role">Root Access</p>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-3)', padding: '0.25rem',
              borderRadius: 'var(--radius-sm)', transition: 'color 0.15s',
            }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={14} style={{ color: 'var(--color-primary)' }} />
        <span style={{
          fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--color-text-3)',
        }}>
          MotionApp Admin
        </span>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 700, background: 'var(--color-primary-light)',
          color: 'var(--color-primary)', padding: '0.125rem 0.5rem',
          borderRadius: '999px', marginLeft: '0.25rem',
        }}>
          v5.0.3
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Live Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span className="status-dot live" />
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-success)' }}>
            Live
          </span>
        </div>

        <div style={{ width: '1px', height: '1rem', background: 'var(--color-border)' }} />

        <button className="btn btn-secondary btn-sm btn-icon" title="Notifications">
          <Bell size={14} />
        </button>
      </div>
    </header>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));

  useEffect(() => {
    const handleAuthError = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('unauthorized', handleAuthError);
    return () => window.removeEventListener('unauthorized', handleAuthError);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router>
      <div className="app-shell">
        <Sidebar onLogout={handleLogout} />
        <div className="main-content">
          <Header />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/corporate" element={<CorporateApprovals />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/comments" element={<Comments />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/banners" element={<Banners />} />
              <Route path="/radar" element={<Radar />} />
              <Route path="/talents" element={<Talents />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
          <footer style={{
            borderTop: '1px solid var(--color-border)',
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)', fontWeight: 500 }}>
              Motion Infrastructure © 2026 · All rights reserved
            </span>
          </footer>
        </div>
      </div>
    </Router>
  );
}
