import { calculateQualityGate } from './quality-gate';

describe('calculateQualityGate', () => {
  it('passes when critical bugs are closed, required tests pass, and pass rate meets threshold', () => {
    const gate = calculateQualityGate({
      minPassRate: 80,
      results: [
        { testCaseId: 'tc-1', title: 'Required flow', isRequired: true, status: 'PASSED' },
        { testCaseId: 'tc-2', title: 'Optional flow', isRequired: false, status: 'SKIPPED' },
      ],
      bugs: [{ id: 'bug-1', title: 'Closed issue', severity: 'CRITICAL', status: 'CLOSED' }],
    });

    expect(gate.status).toBe('PASSED');
    expect(gate.passRate).toBe(100);
  });

  it('blocks on open critical bugs, failed required tests, and low pass rate', () => {
    const gate = calculateQualityGate({
      minPassRate: 90,
      results: [
        { testCaseId: 'tc-1', title: 'Required flow', isRequired: true, status: 'FAILED' },
        { testCaseId: 'tc-2', title: 'Optional flow', isRequired: false, status: 'PASSED' },
      ],
      bugs: [{ id: 'bug-1', title: 'Critical defect', severity: 'CRITICAL', status: 'OPEN' }],
    });

    expect(gate.status).toBe('BLOCKED');
    expect(gate.checks.filter((check) => check.status === 'FAILED')).toHaveLength(3);
  });

  it('blocks when required tests are pending or skipped even if optional pass rate is high', () => {
    const gate = calculateQualityGate({
      minPassRate: 90,
      results: [
        { testCaseId: 'tc-1', title: 'Required pending flow', isRequired: true, status: 'PENDING' },
        { testCaseId: 'tc-2', title: 'Required skipped flow', isRequired: true, status: 'SKIPPED' },
        { testCaseId: 'tc-3', title: 'Optional passed flow', isRequired: false, status: 'PASSED' },
      ],
      bugs: [],
    });

    const requiredCheck = gate.checks.find((check) => check.type === 'REQUIRED_TESTS_FAILED');

    expect(gate.status).toBe('BLOCKED');
    expect(requiredCheck?.status).toBe('FAILED');
    expect(requiredCheck?.details.testCaseIds).toEqual(['tc-1', 'tc-2']);
  });
});
