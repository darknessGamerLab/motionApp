import { Briefcase, Flag, Image as ImageIcon, LayoutDashboard, MessageSquare, Settings, TrendingUp, Users as UsersIcon, Video } from 'lucide-react';
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import Banners from './pages/Banners';
import Comments from './pages/Comments';
import CorporateApprovals from './pages/CorporateApprovals';
import Dashboard from './pages/Dashboard';
import Radar from './pages/Radar';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import UsersPage from './pages/Users';
import Videos from './pages/Videos';


function Sidebar() {
  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col p-4">
      <h1 className="text-xl font-bold mb-8 text-primary">MotionAdmin</h1>
      <nav className="flex flex-col gap-2">
        <Link to="/" className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-800 transition-colors">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link to="/users" className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-800 transition-colors">
          <UsersIcon size={20} />
          <span>Kullanıcılar</span>
        </Link>
        <Link to="/corporate-approvals" className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-800 transition-colors">
          <Briefcase size={20} />
          <span>Kurumsal Başvurular</span>
        </Link>
        <Link to="/videos" className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-800 transition-colors">
          <Video size={18} />
          <span>Videolar</span>
        </Link>
        <Link to="/banners" className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-800 transition-colors">
          <ImageIcon size={18} />
          <span>Sponsor Afişleri</span>
        </Link>
        <Link to="/reports" className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-800 transition-colors">
          <Flag size={18} />
          <span>Şikayet & Raporlar</span>
        </Link>
        <Link to="/radar" className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-800 transition-colors">
          <TrendingUp size={18} />
          <span>Radar (Keşfet)</span>
        </Link>
        <Link to="/comments" className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-800 transition-colors">
          <MessageSquare size={18} />
          <span>Yorum Moderasyonu</span>
        </Link>
        <div className="mt-4 pt-4 border-t border-slate-800">
          <Link to="/settings" className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-800 transition-colors">
            <Settings size={18} />
            <span>Ayarlar</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="flex bg-slate-50 min-h-screen font-sans text-slate-900">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          <header className="bg-white p-4 shadow-sm rounded-lg mb-6 flex justify-between items-center border border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Admin Paneli</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">MotionApp v2.0.3 Kontrol Merkezi</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">Admin Burhan</div>
                <div className="text-[10px] text-green-500 font-bold">Çevrimiçi</div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-tr from-primary to-rose-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold">
                B
              </div>
            </div>
          </header>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[calc(100vh-200px)]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/corporate-approvals" element={<CorporateApprovals />} />
              <Route path="/banners" element={<Banners />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/radar" element={<Radar />} />
              <Route path="/comments" element={<Comments />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
