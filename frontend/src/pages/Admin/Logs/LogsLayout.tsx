/**
 * Logs Layout - Simple passthrough for nested log routes
 * Navigation is now handled by AdminSidebar
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

const LogsLayout: React.FC = () => {
  return <Outlet />;
};

export default LogsLayout;
