import { AppointmentDetail } from '@/components/appointments/appointment-detail';

type AppointmentDetailPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function AppointmentDetailPage({ params }: AppointmentDetailPageProps) {
  const { id } = await params;

  return <AppointmentDetail id={id} />;
}
