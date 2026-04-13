import { Separator } from '@/components/ui/separator';

import PersonalInfo from './PersonalInfo';
import EmailPassword from './EmailPassword';
import ConnectAccount from './ConnectAccount';
import SocialUrl from './SocialUrl';
import DangerZone from './DangerZone';

const UserGeneral = () => {
  return (
    <section className="py-3">
      <div className="mx-auto max-w-7xl">
        <PersonalInfo />
        <Separator className="my-10" />
        <EmailPassword />
        <Separator className="my-10" />
        <ConnectAccount />
        <Separator className="my-10" />
        <SocialUrl />
        <Separator className="my-10" />
        <DangerZone />
      </div>
    </section>
  );
};

export default UserGeneral;
