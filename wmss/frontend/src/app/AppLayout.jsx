import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Header } from '../components/layout/Header.jsx';
import { appRoutes } from './routes.jsx';

import { CommandPalette } from '../components/CommandPalette.jsx';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <CommandPalette />
      <Sidebar routes={appRoutes} collapsed={collapsed} />
      <div className="flex flex-1 flex-col">
        <Header onSearch={setSearchTerm} />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-7xl">
            <Outlet context={{ searchTerm, toggleSidebar: () => setCollapsed((prev) => !prev) }} />
          </div>
        </main>
      </div>
    </div>
  );
}
