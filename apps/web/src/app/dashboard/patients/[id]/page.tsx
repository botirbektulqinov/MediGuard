import { PatientProfile } from '@/components/dashboard/patient-profile';

type PatientProfilePageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function PatientProfilePage({ params }: PatientProfilePageProps) {
  const { id } = await params;

  return <PatientProfile id={id} />;
}
