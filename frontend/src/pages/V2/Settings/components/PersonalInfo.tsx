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

const countries = [
  { value: 'india', label: 'India', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/india.png' },
  { value: 'china', label: 'China', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/china.png' },
  { value: 'monaco', label: 'Monaco', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/monaco.png' },
  { value: 'serbia', label: 'Serbia', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/serbia.png' },
  { value: 'romania', label: 'Romania', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/romania.png' },
  { value: 'mayotte', label: 'Mayotte', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/mayotte.png' },
  { value: 'iraq', label: 'Iraq', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/iraq.png' },
  { value: 'syria', label: 'Syria', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/syria.png' },
  { value: 'korea', label: 'Korea', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/korea.png' },
  { value: 'zimbabwe', label: 'Zimbabwe', flag: 'https://cdn.shadcnstudio.com/ss-assets/flags/zimbabwe.png' },
];

const PersonalInfo = () => {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Personal Information</h3>
        <p className="text-muted-foreground text-sm">Manage your personal information and role.</p>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <form className="mx-auto">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="personal-info-first-name">First Name</Label>
              <Input id="personal-info-first-name" placeholder="John" />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="personal-info-last-name">Last Name</Label>
              <Input id="personal-info-last-name" placeholder="Doe" />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="personal-info-mobile">Mobile</Label>
              <Input id="personal-info-mobile" type="tel" placeholder="+1 (555) 123-4567" />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="country">Country</Label>
              <Select>
                <SelectTrigger
                  id="country"
                  className="[&>span_svg]:text-muted-foreground/80 w-full [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_svg]:shrink-0"
                >
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="[&_*[role=option]>span>svg]:text-muted-foreground/80 max-h-[400px] [&_*[role=option]]:pr-8 [&_*[role=option]]:pl-2 [&_*[role=option]>span]:right-2 [&_*[role=option]>span]:left-auto [&_*[role=option]>span]:flex [&_*[role=option]>span]:items-center [&_*[role=option]>span]:gap-2 [&_*[role=option]>span>svg]:shrink-0">
                  {countries.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      <img src={country.flag} alt={`${country.label} flag`} className="h-4 w-5" />{' '}
                      <span className="truncate">{country.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select>
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Select a gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
        <div className="flex justify-end">
          <Button type="submit" variant="gradientEmerald" className="max-sm:w-full">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfo;
