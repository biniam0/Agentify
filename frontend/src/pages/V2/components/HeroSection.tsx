interface HeroSectionProps {
  dealCount?: number;
  userName?: string;
}

const HeroSection = ({ dealCount = 5, userName = 'John' }: HeroSectionProps) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
        You have{' '}
        <span className="text-emerald-600">{dealCount} deals</span>{' '}
        that need attention today
      </h1>
      <p className="text-gray-500 mt-1 text-sm">
        Hi {userName} — here's your pipeline overview for today.
      </p>
    </div>
  );
};

export default HeroSection;
