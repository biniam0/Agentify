import { Outlet } from 'react-router-dom';
import TopNav from './components/TopNav';
import { TenantProvider } from '@/contexts/TenantContext';

const V2Layout = () => {
  return (
    <TenantProvider>
      <div className="min-h-screen bg-white">
        <TopNav />
        <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
          <Outlet />
        </main>
      </div>
    </TenantProvider>
  );
};

export default V2Layout;
