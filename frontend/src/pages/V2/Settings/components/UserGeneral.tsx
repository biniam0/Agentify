import { Separator } from '@/components/ui/separator';

import PersonalInfo from './PersonalInfo';
import HubSpotDataSync from './HubSpotDataSync';
import SocialUrl from './SocialUrl';
import DangerZone from './DangerZone';
import { useIntegrationsStatus } from '../hooks/useIntegrationsStatus';

const UserGeneral = () => {
  const { connectedProviders, loading } = useIntegrationsStatus();

  return (
    <section className="py-3">
      <div className="mx-auto max-w-7xl">
        <PersonalInfo />
        {/* <Separator className="my-10" />
        <EmailPassword /> */}
        <Separator className="my-10" />
        <HubSpotDataSync
          hubSpotConnected={connectedProviders.has('HUBSPOT')}
          integrationsLoading={loading}
        />
        <Separator className="my-10" />
        {/* <ConnectAccount
          connectedProviders={connectedProviders}
          setConnectedProviders={setConnectedProviders}
          loading={loading}
        />
        <Separator className="my-10" /> */}
        <SocialUrl />
        <Separator className="my-10" />
        <DangerZone />
      </div>
    </section>
  );
};

export default UserGeneral;
