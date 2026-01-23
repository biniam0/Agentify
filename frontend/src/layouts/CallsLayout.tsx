/**
 * Calls Layout
 * Simple wrapper that provides page container for standalone /calls routes
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

const CallsLayout: React.FC = () => {
  return (
    <div className="page-container py-8">
      <div className="content-container">
        <Outlet />
      </div>
    </div>
  );
};

export default CallsLayout;
