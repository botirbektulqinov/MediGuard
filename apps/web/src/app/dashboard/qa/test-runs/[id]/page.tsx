import { QaTestRunExecution } from '@/components/qa/qa-test-run-execution';

type QaTestRunPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default async function QaTestRunPage({ params }: QaTestRunPageProps) {
  const { id } = await params;

  return <QaTestRunExecution id={id} />;
}
