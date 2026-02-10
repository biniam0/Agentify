/**
 * Shared User Layout
 * Contains the BarrierXHeader that persists across all user-facing routes
 * This prevents the header from re-rendering when navigating between tabs
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { BarrierXHeader } from '../pages/User/Logs/components/BarrierXHeader';

const UserLayout: React.FC = () => {
  // Navigation items for the header - shared across all user pages
  const navigationItems = [
    { label: 'Meetings', path: '/meetings' },
    { label: 'Logs', path: '/logs' },
    { label: 'Calls', path: '/calls' },
    { label: 'Analytics', path: '/calls/analytics' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-background">
      {/* Shared Header - stays mounted across all child routes */}
      <BarrierXHeader items={navigationItems} />
      
      {/* Child route content renders here */}
      <Outlet />
    </div>
  );
};

export default UserLayout;
