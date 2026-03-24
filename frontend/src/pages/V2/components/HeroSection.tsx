interface HeroSectionProps {
  userName?: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const HeroSection = ({ userName = 'there' }: HeroSectionProps) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
        Manage your <span className="text-brand">AgentX</span> clients
      </h1>
      <p className="text-gray-500 mt-1 text-sm">
        {getGreeting()}, {userName} — here's your AgentX command center.
      </p>
    </div>
  );
};

export default HeroSection;
