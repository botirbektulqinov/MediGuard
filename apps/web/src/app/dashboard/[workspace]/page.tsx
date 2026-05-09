import { RoleDashboard } from '@/components/dashboard/role-dashboard';

type RoleDashboardPageProps = Readonly<{
  params: Promise<{ workspace: string }>;
}>;

export default async function RoleDashboardPage({ params }: RoleDashboardPageProps) {
  const { workspace } = await params;

  return <RoleDashboard role={workspace} />;
}
