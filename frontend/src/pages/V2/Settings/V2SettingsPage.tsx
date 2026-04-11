import { useLocation, useNavigate, Outlet } from 'react-router-dom';

const tabs = [
  { name: 'General', path: '/app/v2/settings' },
  { name: 'Users', path: '/app/v2/settings/users' },
];

const V2SettingsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = tabs.find((t) => t.path === location.pathname) ?? tabs[0];

  return (
    <div className="w-full py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex w-full border-b">
          {tabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab.path === tab.path
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default V2SettingsPage;
