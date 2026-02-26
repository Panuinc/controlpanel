import IPFilter from '@/components/settings/ip-filter';
import TwoFactorSetup from '@/components/auth/two-factor-setup';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <TwoFactorSetup />
      <IPFilter />
    </div>
  );
}
