import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { useSettings } from './hooks/useSettings';
import './App.css';

export function App() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const location = useLocation();

  return (
    <div className="app-shell">
      <nav className="app-nav" aria-label="Main navigation">
        <span className="app-nav__brand">Infer</span>
        <Link to="/" aria-current={location.pathname === '/' ? 'page' : undefined}>
          Chat
        </Link>
        <Link to="/settings" aria-current={location.pathname === '/settings' ? 'page' : undefined}>
          Settings
        </Link>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<ChatPage settings={settings} />} />
          <Route
            path="/settings"
            element={
              <SettingsPage settings={settings} onChange={updateSettings} onReset={resetSettings} />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
