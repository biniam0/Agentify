import { useEffect, useState, type FormEvent } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CountrySelect } from '@/components/ui/country-select';

import api from '@/services/api';

type GenderValue = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

interface ProfileResponse {
  success: boolean;
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    country: string;
    gender: GenderValue | null;
    avatarUrl: string | null;
  };
}

const PersonalInfo = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState<GenderValue | ''>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await api.get<ProfileResponse>('/user/profile');
        if (cancelled || !data?.success) return;
        const p = data.profile;
        setFirstName(p.firstName ?? '');
        setLastName(p.lastName ?? '');
        setPhone(p.phone ?? '');
        setCountry(p.country ?? '');
        setGender(p.gender ?? '');
      } catch (err) {
        console.error('Failed to load profile:', err);
        toast.error('Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const { data } = await api.patch<ProfileResponse>('/user/profile', {
        firstName,
        lastName,
        phone,
        country,
        gender: gender || null,
      });
      if (data?.success) {
        toast.success('Profile updated');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Personal Information</h3>
        <p className="text-muted-foreground text-sm">Manage your personal information and role.</p>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <form className="mx-auto" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="personal-info-first-name">First Name</Label>
              <Input
                id="personal-info-first-name"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="personal-info-last-name">Last Name</Label>
              <Input
                id="personal-info-last-name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="personal-info-mobile">Mobile</Label>
              <Input
                id="personal-info-mobile"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="country">Country</Label>
              <CountrySelect
                id="country"
                value={country}
                onChange={setCountry}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={gender}
                onValueChange={(value) => setGender(value as GenderValue)}
                disabled={loading}
              >
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Select a gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                    <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              variant="gradientEmerald"
              className="max-sm:w-full"
              disabled={loading || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalInfo;
