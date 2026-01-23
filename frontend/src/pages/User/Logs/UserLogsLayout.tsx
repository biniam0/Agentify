import React from 'react';
import { Outlet } from 'react-router-dom';
import { BarrierXHeader } from './components/BarrierXHeader';

const UserLogsLayout: React.FC = () => {
  const navigationItems = [
    { label: 'Meetings', path: '/meetings' },
    { label: 'Logs', path: '/logs' },
    { label: 'Calls', path: '/calls' },
    { label: 'Analytics', path: '/calls/analytics' },
  ];

  return (
    <div className="min-h-screen bg-page dark:bg-background">
      <BarrierXHeader items={navigationItems} />
      <main className="page-container py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default UserLogsLayout;
