import { useAuth } from "../lib/auth";
import { Card } from "../components/ui";

export default function Settings() {
  const { user, org } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card><div className="text-xs text-teal-400/70">Account</div><div className="mt-1">{user?.name} · {user?.email}</div></Card>
      <Card><div className="text-xs text-teal-400/70">Organization</div><div className="mt-1">{org?.name} · {org?.plan} plan</div></Card>
      <Card>
        <div className="font-semibold mb-2">Data retention</div>
        <p className="text-sm text-teal-300/80">This local MVP does not run an automatic retention purge. Configure and enforce a retention schedule before production use. Candidate suppression is available from each candidate profile.</p>
      </Card>
      <Card>
        <div className="font-semibold mb-2">Credential storage</div>
        <p className="text-sm text-teal-300/80">Connector API tokens are encrypted in the local store using CREDENTIALS_KEY. Use a strong, stable secret and a managed secret store/KMS for production.</p>
      </Card>
    </div>
  );
}
