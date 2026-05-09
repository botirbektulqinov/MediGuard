import { LabResultDetail } from '@/components/medical/lab-result-detail';

type PatientLabResultPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function PatientLabResultPage({ params }: PatientLabResultPageProps) {
  const { id } = await params;

  return <LabResultDetail id={id} />;
}
