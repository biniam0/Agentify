import { Outlet } from 'react-router-dom';
import TopNav from './components/TopNav';

const V2Layout = () => {
  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <main className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default V2Layout;
