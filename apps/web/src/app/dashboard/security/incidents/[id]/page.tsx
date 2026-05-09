import { SecurityIncidentDetail } from '@/components/security/security-incident-detail';

type SecurityIncidentPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function SecurityIncidentPage({ params }: SecurityIncidentPageProps) {
  const { id } = await params;

  return <SecurityIncidentDetail id={id} />;
}
