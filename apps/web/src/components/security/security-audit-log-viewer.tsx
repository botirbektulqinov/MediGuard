'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { fetchSecurityAuditLogs, fetchSensitivePatientAccessLogs } from '@/lib/clinic-api';

export function SecurityAuditLogViewer() {
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const auditLogs = useQuery({
    queryKey: ['security', 'audit-logs', action, resourceType],
    queryFn: () => fetchSecurityAuditLogs({ action, resourceType }),
  });
  const patientAccess = useQuery({
    queryKey: ['security', 'patient-access'],
    queryFn: fetchSensitivePatientAccessLogs,
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Audit Log Viewer</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Search security-relevant audit records and sensitive patient-data access.
        </p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Action filter"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          />
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Resource type"
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
          />
          <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
            {auditLogs.data?.length ?? 0} matching records
          </div>
        </div>
      </section>
      <AuditTable title="Audit logs" logs={auditLogs.data ?? []} />
      <AuditTable title="Sensitive patient access" logs={patientAccess.data ?? []} />
    </div>
  );
}

function AuditTable({
  logs,
  title,
}: Readonly<{
  title: string;
  logs: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId: string | null;
    ipAddress: string | null;
    createdAt: string;
    actor?: { email: string } | null;
  }>;
}>) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
      <h2 className="p-5 text-lg font-semibold text-ink">{title}</h2>
      {logs.map((log) => (
        <div key={log.id} className="grid gap-2 border-t border-slate-100 p-5 md:grid-cols-4">
          <div>
            <p className="font-medium text-ink">{log.action}</p>
            <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</p>
          </div>
          <p className="text-sm text-slate-600">{log.actor?.email ?? 'system'}</p>
          <p className="text-sm text-slate-600">
            {log.resourceType} {log.resourceId ? `/${log.resourceId}` : ''}
          </p>
          <p className="text-sm text-slate-600">{log.ipAddress ?? 'unknown IP'}</p>
        </div>
      ))}
      {logs.length === 0 ? <p className="p-5 text-sm text-slate-500">No records found.</p> : null}
    </section>
  );
}
