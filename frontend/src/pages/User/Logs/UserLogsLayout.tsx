import React from 'react';
import { Outlet } from 'react-router-dom';
import { BarrierXHeader } from './components/BarrierXHeader';

const UserLogsLayout: React.FC = () => {
  const navigationItems = [
    { label: 'Calls', path: '/calls' },
    { label: 'Call Analytics', path: '/calls/analytics' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <BarrierXHeader items={navigationItems} />
      <main className="container mx-auto px-[10%] py-8 max-w-[1920px]">
        <Outlet />
      </main>
    </div>
  );
};

export default UserLogsLayout;
