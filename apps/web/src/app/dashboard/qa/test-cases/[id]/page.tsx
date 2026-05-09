import { QaTestCaseDetail } from '@/components/qa/qa-test-case-detail';

type QaTestCasePageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function QaTestCasePage({ params }: QaTestCasePageProps) {
  const { id } = await params;

  return <QaTestCaseDetail id={id} />;
}
