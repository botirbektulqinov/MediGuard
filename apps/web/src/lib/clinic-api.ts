'use client';

import { getApiUrl, getStoredSession } from './auth';

export interface ClinicSummary {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
}

export interface StaffSummary {
  id: string;
  employeeCode: string;
  jobTitle: string;
  department: string;
  isActive: boolean;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
  clinic: { name: string };
  branch: { id?: string; name: string } | null;
  doctorProfile: { id: string; specialty: string; licenseNumber: string } | null;
}

export interface BranchSummary {
  id: string;
  clinicId: string;
  name: string;
  code: string;
}

export interface ClinicServiceSummary {
  id: string;
  clinicId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

export interface PatientSummary {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  clinic: { name: string };
  contact: {
    phone: string;
    email: string | null;
    address: string;
    city: string | null;
  } | null;
  primaryDoctor: {
    specialty: string;
    staffProfile: {
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
    };
  } | null;
}

export interface AppointmentSummary {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  clinic: { id: string; name: string };
  branch: { id: string; name: string };
  service: { id: string; name: string; durationMinutes: number } | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    medicalRecordNumber: string;
  };
  doctor: {
    id: string;
    specialty: string;
    staffProfile: {
      user: { firstName: string; lastName: string; email: string };
    };
  };
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    createdAt: string;
  }>;
  queueEntry: { id: string; status: string; position: number } | null;
}

export interface QueueEntrySummary {
  id: string;
  status: string;
  position: number;
  arrivedAt: string;
  calledAt: string | null;
  completedAt: string | null;
  appointment: {
    id: string;
    status: string;
    startAt: string;
    patient: { firstName: string; lastName: string; medicalRecordNumber: string };
    doctor: {
      specialty: string;
      staffProfile: { user: { firstName: string; lastName: string; email: string } };
    };
  };
}

export interface VisitSummary {
  id: string;
  appointmentId: string;
  status: string;
  diagnosis: string | null;
  recommendation: string | null;
  completedAt: string | null;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string; medicalRecordNumber: string };
  doctor: {
    specialty: string;
    staffProfile: { user: { firstName: string; lastName: string; email: string } };
  };
  prescriptions: Array<{ id: string; note: string; createdAt: string }>;
  labOrders: LabOrderSummary[];
}

export interface LabOrderSummary {
  id: string;
  testName: string;
  instructions: string | null;
  status: string;
  createdAt: string;
  patient?: { firstName: string; lastName: string; medicalRecordNumber: string };
  result: LabResultSummary | null;
}

export interface LabResultSummary {
  id: string;
  status: string;
  resultSummary: string | null;
  readyAt: string | null;
  createdAt?: string;
  labOrder?: {
    id: string;
    testName: string;
    instructions: string | null;
    status: string;
    visitId: string;
    doctor: {
      staffProfile: { user: { firstName: string; lastName: string; email: string } };
    };
  };
  patient?: { firstName: string; lastName: string; medicalRecordNumber: string };
  attachment: { id: string; originalName: string; mimeType: string; sizeBytes: number } | null;
}

export interface QaTestCaseSummary {
  id: string;
  suiteId: string;
  title: string;
  description: string | null;
  featureArea: string;
  preconditions: string | null;
  steps: string;
  expectedResult: string;
  priority: string;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  suite: { id: string; name: string };
}

export interface QaTestSuiteSummary {
  id: string;
  name: string;
  description: string | null;
  featureArea: string;
  createdAt: string;
  testCases: QaTestCaseSummary[];
}

export interface QaTestRunSummary {
  id: string;
  suiteId: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  suite: { id: string; name: string; featureArea: string };
  results: Array<{
    id: string;
    status: string;
    actualResult: string | null;
    notes: string | null;
    testCase: {
      id: string;
      title: string;
      featureArea: string;
      priority: string;
      isRequired: boolean;
      expectedResult: string;
    };
    bugReports: Array<{ id: string; title: string; severity: string; status: string }>;
  }>;
}

export interface QaBugReportSummary {
  id: string;
  testRunResultId: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  featureArea: string;
  assignedToUserId: string | null;
  createdAt: string;
  assignedTo: { id: string; email: string; firstName: string; lastName: string } | null;
}

export interface QaReleaseGateSummary {
  id: string;
  testRunId: string;
  name: string;
  version: string;
  status: string;
  minPassRate: number;
  createdAt: string;
  testRun: { id: string; name: string; suite: { name: string } };
  checks: Array<{ id: string; type: string; status: string; message: string }>;
}

export interface SecurityDashboardSummary {
  failedLogins24h: number;
  openEvents: number;
  openIncidents: number;
  criticalFindings: number;
  activeSessions: number;
}

export interface SecurityUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status?: string;
}

export interface AuditLogSummary {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
  actor?: SecurityUserSummary | null;
}

export interface FailedLoginSummary {
  id: string;
  email: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  failureReason: string | null;
  createdAt: string;
  user: SecurityUserSummary | null;
}

export interface SuspiciousActivityRuleSummary {
  id: string;
  type: string;
  name: string;
  description: string;
  severity: string;
  threshold: number;
  windowMinutes: number;
  isEnabled: boolean;
}

export interface SuspiciousActivityEventSummary {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  evidence: unknown;
  actorUserId: string | null;
  ipAddress: string | null;
  resourceType: string | null;
  resourceId: string | null;
  occurredAt: string;
  createdAt: string;
  rule: { id: string; name: string };
  actor: SecurityUserSummary | null;
  incident: { id: string; status: string; severity: string } | null;
}

export interface SecurityIncidentSummary {
  id: string;
  sourceEventId: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  remediationNotes: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  assignedTo: SecurityUserSummary | null;
  sourceEvent: SuspiciousActivityEventSummary | null;
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    affectedModule: string;
    status: string;
    createdAt: string;
  }>;
}

export interface SecurityFindingSummary {
  id: string;
  incidentId: string | null;
  title: string;
  description: string;
  severity: string;
  affectedModule: string;
  evidence: unknown;
  remediation: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecuritySessionSummary {
  id: string;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  expiresAt: string;
  user: SecurityUserSummary;
}

export interface CountBySeverity {
  severity: string;
  count: number;
}

export interface AppointmentVolumePoint {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface QueueWaitingTimeSummary {
  averageMinutes: number;
  waitingNow: number;
  inConsultation: number;
  completedToday: number;
}

export interface TestPassRateSummary {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  pending: number;
  passRate: number;
}

export interface FailedLoginTrendPoint {
  date: string;
  count: number;
}

export interface RoleDashboardSummary {
  title: string;
  metrics: Record<string, number>;
  charts?: {
    appointmentVolume?: AppointmentVolumePoint[];
    queue?: QueueWaitingTimeSummary;
    passRate?: TestPassRateSummary;
    bugSeverity?: CountBySeverity[];
    incidentsBySeverity?: CountBySeverity[];
    failedLoginTrends?: FailedLoginTrendPoint[];
  };
  upcoming?: Array<{
    id: string;
    startAt: string;
    status: string;
    patient: { firstName: string; lastName: string; medicalRecordNumber: string };
    doctor?: { staffProfile: { user: { firstName: string; lastName: string } } };
  }>;
  queue?: Array<{
    id: string;
    status: string;
    position: number;
    appointment: {
      startAt: string;
      patient: { firstName: string; lastName: string; medicalRecordNumber: string };
    };
  }>;
}

async function apiGet<T>(path: string): Promise<T> {
  const session = getStoredSession();
  if (!session) {
    throw new Error('Missing session.');
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function apiSend<T>(path: string, method: 'POST' | 'PATCH', body?: unknown): Promise<T> {
  const session = getStoredSession();
  if (!session) {
    throw new Error('Missing session.');
  }

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${getApiUrl()}${path}`, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const session = getStoredSession();
  if (!session) {
    throw new Error('Missing session.');
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.accessToken}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export function fetchClinics(): Promise<ClinicSummary[]> {
  return apiGet<ClinicSummary[]>('/api/clinics');
}

export function fetchStaff(): Promise<StaffSummary[]> {
  return apiGet<StaffSummary[]>('/api/staff');
}

export function fetchBranches(): Promise<BranchSummary[]> {
  return apiGet<BranchSummary[]>('/api/branches');
}

export function fetchClinicServices(): Promise<ClinicServiceSummary[]> {
  return apiGet<ClinicServiceSummary[]>('/api/clinic-services');
}

export function fetchPatients(search?: string): Promise<PatientSummary[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiGet<PatientSummary[]>(`/api/patients${query}`);
}

export function fetchPatient(id: string): Promise<PatientSummary> {
  return apiGet<PatientSummary>(`/api/patients/${id}`);
}

export function fetchAppointments(): Promise<AppointmentSummary[]> {
  return apiGet<AppointmentSummary[]>('/api/appointments');
}

export function fetchAppointment(id: string): Promise<AppointmentSummary> {
  return apiGet<AppointmentSummary>(`/api/appointments/${id}`);
}

export function bookAppointment(input: {
  patientId?: string;
  doctorId: string;
  branchId: string;
  serviceId?: string;
  startAt: string;
  reason?: string;
}): Promise<AppointmentSummary> {
  return apiSend<AppointmentSummary>('/api/appointments', 'POST', input);
}

export function confirmAppointment(id: string): Promise<AppointmentSummary> {
  return apiSend<AppointmentSummary>(`/api/appointments/${id}/confirm`, 'PATCH');
}

export function markAppointmentArrived(id: string): Promise<AppointmentSummary> {
  return apiSend<AppointmentSummary>(`/api/appointments/${id}/arrive`, 'PATCH');
}

export function cancelAppointment(id: string, reason?: string): Promise<AppointmentSummary> {
  return apiSend<AppointmentSummary>(`/api/appointments/${id}/cancel`, 'PATCH', { reason });
}

export function enqueueAppointment(appointmentId: string): Promise<QueueEntrySummary> {
  return apiSend<QueueEntrySummary>('/api/queue', 'POST', { appointmentId });
}

export function fetchTodayQueue(): Promise<QueueEntrySummary[]> {
  return apiGet<QueueEntrySummary[]>('/api/queue/today');
}

export function startQueueConsultation(id: string): Promise<QueueEntrySummary> {
  return apiSend<QueueEntrySummary>(`/api/queue/${id}/start`, 'PATCH');
}

export function completeQueueConsultation(id: string): Promise<QueueEntrySummary> {
  return apiSend<QueueEntrySummary>(`/api/queue/${id}/complete`, 'PATCH');
}

export function markQueueLabRequired(id: string): Promise<QueueEntrySummary> {
  return apiSend<QueueEntrySummary>(`/api/queue/${id}/lab-required`, 'PATCH');
}

export function createVisit(input: {
  appointmentId: string;
  diagnosisNote?: string;
  recommendation?: string;
  prescriptionNote?: string;
}): Promise<VisitSummary> {
  return apiSend<VisitSummary>('/api/visits', 'POST', input);
}

export function createLabOrder(
  visitId: string,
  input: { testName: string; instructions?: string },
): Promise<VisitSummary> {
  return apiSend<VisitSummary>(`/api/visits/${visitId}/lab-orders`, 'POST', input);
}

export function completeVisit(id: string): Promise<VisitSummary> {
  return apiSend<VisitSummary>(`/api/visits/${id}/complete`, 'PATCH');
}

export function fetchLabOrders(): Promise<LabOrderSummary[]> {
  return apiGet<LabOrderSummary[]>('/api/lab-results/orders');
}

export function uploadLabResult(
  orderId: string,
  input: { resultSummary?: string; file: File },
): Promise<LabResultSummary> {
  const formData = new FormData();
  formData.set('file', input.file);
  if (input.resultSummary) {
    formData.set('resultSummary', input.resultSummary);
  }
  return apiUpload<LabResultSummary>(`/api/lab-results/orders/${orderId}/upload`, formData);
}

export function markLabResultReady(id: string): Promise<LabResultSummary> {
  return apiSend<LabResultSummary>(`/api/lab-results/${id}/ready`, 'PATCH');
}

export function fetchPatientPortalVisits(): Promise<VisitSummary[]> {
  return apiGet<VisitSummary[]>('/api/patient-portal/visits');
}

export function fetchPatientPortalLabResults(): Promise<LabResultSummary[]> {
  return apiGet<LabResultSummary[]>('/api/patient-portal/lab-results');
}

export function fetchPatientPortalLabResult(id: string): Promise<LabResultSummary> {
  return apiGet<LabResultSummary>(`/api/patient-portal/lab-results/${id}`);
}

export async function downloadAttachment(id: string): Promise<Blob> {
  const session = getStoredSession();
  if (!session) {
    throw new Error('Missing session.');
  }
  const response = await fetch(`${getApiUrl()}/api/files/${id}/download`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }
  return response.blob();
}

export function fetchQaSuites(): Promise<QaTestSuiteSummary[]> {
  return apiGet<QaTestSuiteSummary[]>('/api/qa/test-suites');
}

export function createQaSuite(input: {
  name: string;
  featureArea: string;
  description?: string;
}): Promise<QaTestSuiteSummary> {
  return apiSend<QaTestSuiteSummary>('/api/qa/test-suites', 'POST', input);
}

export function fetchQaCases(): Promise<QaTestCaseSummary[]> {
  return apiGet<QaTestCaseSummary[]>('/api/qa/test-cases');
}

export function fetchQaCase(id: string): Promise<QaTestCaseSummary> {
  return apiGet<QaTestCaseSummary>(`/api/qa/test-cases/${id}`);
}

export function createQaCase(input: {
  suiteId: string;
  title: string;
  featureArea: string;
  steps: string;
  expectedResult: string;
  priority?: string;
  isRequired?: boolean;
  description?: string;
  preconditions?: string;
}): Promise<QaTestCaseSummary> {
  return apiSend<QaTestCaseSummary>('/api/qa/test-cases', 'POST', input);
}

export function fetchQaRuns(): Promise<QaTestRunSummary[]> {
  return apiGet<QaTestRunSummary[]>('/api/qa/test-runs');
}

export function fetchQaRun(id: string): Promise<QaTestRunSummary> {
  return apiGet<QaTestRunSummary>(`/api/qa/test-runs/${id}`);
}

export function startQaRun(input: { suiteId: string; name: string }): Promise<QaTestRunSummary> {
  return apiSend<QaTestRunSummary>('/api/qa/test-runs', 'POST', input);
}

export function updateQaResult(
  resultId: string,
  input: { status: string; actualResult?: string; notes?: string },
): Promise<QaTestRunSummary> {
  return apiSend<QaTestRunSummary>(`/api/qa/test-runs/results/${resultId}`, 'PATCH', input);
}

export function fetchQaBugs(): Promise<QaBugReportSummary[]> {
  return apiGet<QaBugReportSummary[]>('/api/qa/bug-reports');
}

export function createQaBug(input: {
  testRunResultId?: string;
  title: string;
  description: string;
  severity: string;
  featureArea: string;
  assignedToUserId?: string;
}): Promise<QaBugReportSummary> {
  return apiSend<QaBugReportSummary>('/api/qa/bug-reports', 'POST', input);
}

export function updateQaBugStatus(id: string, status: string): Promise<QaBugReportSummary> {
  return apiSend<QaBugReportSummary>(`/api/qa/bug-reports/${id}/status`, 'PATCH', { status });
}

export function fetchQaReleaseGates(): Promise<QaReleaseGateSummary[]> {
  return apiGet<QaReleaseGateSummary[]>('/api/qa/release-gates');
}

export function createQaReleaseGate(input: {
  testRunId: string;
  name: string;
  version: string;
  minPassRate?: number;
}): Promise<QaReleaseGateSummary> {
  return apiSend<QaReleaseGateSummary>('/api/qa/release-gates', 'POST', input);
}

export function fetchSecurityDashboard(): Promise<SecurityDashboardSummary> {
  return apiGet<SecurityDashboardSummary>('/api/security/dashboard');
}

export function fetchFailedLogins(): Promise<FailedLoginSummary[]> {
  return apiGet<FailedLoginSummary[]>('/api/security/failed-logins');
}

export function fetchSecurityAuditLogs(filters?: {
  action?: string;
  resourceType?: string;
}): Promise<AuditLogSummary[]> {
  const query = new URLSearchParams();
  if (filters?.action) query.set('action', filters.action);
  if (filters?.resourceType) query.set('resourceType', filters.resourceType);
  const suffix = query.toString() ? `?${query.toString()}` : '';

  return apiGet<AuditLogSummary[]>(`/api/security/audit-logs${suffix}`);
}

export function fetchSensitivePatientAccessLogs(): Promise<AuditLogSummary[]> {
  return apiGet<AuditLogSummary[]>('/api/security/patient-access');
}

export function fetchSuspiciousActivityRules(): Promise<SuspiciousActivityRuleSummary[]> {
  return apiGet<SuspiciousActivityRuleSummary[]>('/api/security/suspicious-activity/rules');
}

export function fetchSuspiciousActivityEvents(): Promise<SuspiciousActivityEventSummary[]> {
  return apiGet<SuspiciousActivityEventSummary[]>('/api/security/suspicious-activity/events');
}

export function evaluateSuspiciousActivity(): Promise<SuspiciousActivityEventSummary[]> {
  return apiSend<SuspiciousActivityEventSummary[]>(
    '/api/security/suspicious-activity/evaluate',
    'POST',
  );
}

export function fetchSecurityIncidents(): Promise<SecurityIncidentSummary[]> {
  return apiGet<SecurityIncidentSummary[]>('/api/security/incidents');
}

export function fetchSecurityIncident(id: string): Promise<SecurityIncidentSummary> {
  return apiGet<SecurityIncidentSummary>(`/api/security/incidents/${id}`);
}

export function createSecurityIncident(input: {
  title: string;
  description: string;
  severity: string;
  sourceEventId?: string;
  assignedToUserId?: string;
}): Promise<SecurityIncidentSummary> {
  return apiSend<SecurityIncidentSummary>('/api/security/incidents', 'POST', input);
}

export function updateSecurityIncident(
  id: string,
  input: {
    status?: string;
    severity?: string;
    remediationNotes?: string;
    assignedToUserId?: string;
  },
): Promise<SecurityIncidentSummary> {
  return apiSend<SecurityIncidentSummary>(`/api/security/incidents/${id}`, 'PATCH', input);
}

export function fetchSecurityFindings(): Promise<SecurityFindingSummary[]> {
  return apiGet<SecurityFindingSummary[]>('/api/security/findings');
}

export function createSecurityFinding(input: {
  title: string;
  description: string;
  severity: string;
  affectedModule: string;
  evidence?: Record<string, unknown>;
  remediation?: string;
  incidentId?: string;
}): Promise<SecurityFindingSummary> {
  return apiSend<SecurityFindingSummary>('/api/security/findings', 'POST', input);
}

export function updateSecurityFinding(
  id: string,
  input: {
    status?: string;
    severity?: string;
    remediation?: string;
    evidence?: Record<string, unknown>;
  },
): Promise<SecurityFindingSummary> {
  return apiSend<SecurityFindingSummary>(`/api/security/findings/${id}`, 'PATCH', input);
}

export function fetchSecuritySessions(): Promise<SecuritySessionSummary[]> {
  return apiGet<SecuritySessionSummary[]>('/api/security/sessions');
}

export function revokeSecuritySession(id: string): Promise<SecuritySessionSummary> {
  return apiSend<SecuritySessionSummary>(`/api/security/sessions/${id}/revoke`, 'PATCH');
}

export function fetchRoleDashboard(role: string): Promise<RoleDashboardSummary> {
  return apiGet<RoleDashboardSummary>(`/api/dashboards/${role}`);
}

export function fetchAppointmentVolume(): Promise<AppointmentVolumePoint[]> {
  return apiGet<AppointmentVolumePoint[]>('/api/reports/appointments-per-day');
}

export function fetchQueueWaitingTime(): Promise<QueueWaitingTimeSummary> {
  return apiGet<QueueWaitingTimeSummary>('/api/reports/queue-waiting-time');
}

export function fetchTestPassRate(): Promise<TestPassRateSummary> {
  return apiGet<TestPassRateSummary>('/api/reports/test-pass-rate');
}

export function fetchOpenBugsBySeverity(): Promise<CountBySeverity[]> {
  return apiGet<CountBySeverity[]>('/api/reports/open-bugs-by-severity');
}

export function fetchSecurityIncidentsBySeverity(): Promise<CountBySeverity[]> {
  return apiGet<CountBySeverity[]>('/api/reports/security-incidents-by-severity');
}

export function fetchFailedLoginTrends(): Promise<FailedLoginTrendPoint[]> {
  return apiGet<FailedLoginTrendPoint[]>('/api/reports/failed-login-trends');
}
