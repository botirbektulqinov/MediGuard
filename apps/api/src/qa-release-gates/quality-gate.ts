import type { BugSeverity, BugStatus, TestResultStatus } from '@prisma/client';

export interface QualityGateResultInput {
  status: TestResultStatus;
  isRequired: boolean;
  testCaseId: string;
  title: string;
}

export interface QualityGateBugInput {
  status: BugStatus;
  severity: BugSeverity;
  id: string;
  title: string;
}

export interface QualityGateCheckResult {
  type: 'CRITICAL_BUGS_OPEN' | 'REQUIRED_TESTS_FAILED' | 'MIN_PASS_RATE';
  status: 'PASSED' | 'FAILED';
  message: string;
  details: Record<string, unknown>;
}

export interface QualityGateResult {
  status: 'PASSED' | 'BLOCKED';
  passRate: number;
  checks: QualityGateCheckResult[];
}

const OPEN_BUG_STATUSES: BugStatus[] = [
  'OPEN',
  'TRIAGED',
  'IN_PROGRESS',
  'READY_FOR_QA',
  'RETEST',
  'REOPENED',
];

export function calculateQualityGate(input: {
  results: QualityGateResultInput[];
  bugs: QualityGateBugInput[];
  minPassRate?: number;
}): QualityGateResult {
  const minPassRate = input.minPassRate ?? 90;
  const executed = input.results.filter(
    (result) => !['PENDING', 'SKIPPED'].includes(result.status),
  );
  const passed = executed.filter((result) => result.status === 'PASSED').length;
  const passRate = executed.length > 0 ? Math.round((passed / executed.length) * 100) : 0;
  const criticalOpenBugs = input.bugs.filter(
    (bug) => bug.severity === 'CRITICAL' && OPEN_BUG_STATUSES.includes(bug.status),
  );
  const requiredTestsNotPassed = input.results.filter(
    (result) => result.isRequired && result.status !== 'PASSED',
  );

  const checks: QualityGateCheckResult[] = [
    {
      type: 'CRITICAL_BUGS_OPEN',
      status: criticalOpenBugs.length === 0 ? 'PASSED' : 'FAILED',
      message:
        criticalOpenBugs.length === 0
          ? 'No open critical bugs.'
          : `${criticalOpenBugs.length} open critical bug(s) block release.`,
      details: { bugIds: criticalOpenBugs.map((bug) => bug.id) },
    },
    {
      type: 'REQUIRED_TESTS_FAILED',
      status: requiredTestsNotPassed.length === 0 ? 'PASSED' : 'FAILED',
      message:
        requiredTestsNotPassed.length === 0
          ? 'All required test cases passed.'
          : `${requiredTestsNotPassed.length} required test case(s) are not passed.`,
      details: { testCaseIds: requiredTestsNotPassed.map((result) => result.testCaseId) },
    },
    {
      type: 'MIN_PASS_RATE',
      status: passRate >= minPassRate ? 'PASSED' : 'FAILED',
      message:
        passRate >= minPassRate
          ? `Pass rate ${passRate}% meets the ${minPassRate}% threshold.`
          : `Pass rate ${passRate}% is below the ${minPassRate}% threshold.`,
      details: { passRate, minPassRate, executed: executed.length, passed },
    },
  ];

  return {
    status: checks.every((check) => check.status === 'PASSED') ? 'PASSED' : 'BLOCKED',
    passRate,
    checks,
  };
}
