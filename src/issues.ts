import type { AuditReport, Issue, Report, ReportsDiff } from './models'

export type SourceFileIssue = Required<Issue> & { audit: AuditReport }

export function filterRelevantIssues({
  currReport,
  prevReport,
  reportsDiff,
  changedFiles
}: {
  currReport: Report
  prevReport: Report
  reportsDiff: ReportsDiff
  changedFiles: string[]
}): SourceFileIssue[] {
  const audits = [...reportsDiff.audits.changed, ...reportsDiff.audits.added]
    .map(auditLink =>
      currReport.plugins
        .find(plugin => plugin.slug === auditLink.plugin.slug)
        ?.audits.find(audit => audit.slug === auditLink.slug)
    )
    .filter((audit): audit is AuditReport => audit != null)

  const issues = audits.flatMap(getAuditIssues)
  const prevIssues = prevReport.plugins.flatMap(plugin =>
    plugin.audits.flatMap(getAuditIssues)
  )

  return issues.filter(
    issue =>
      changedFiles.includes(issue.source?.file) &&
      !prevIssues.some(prevIssue => issuesAreEqual(prevIssue, issue))
  )
}

function getAuditIssues(audit: AuditReport): SourceFileIssue[] {
  return (
    audit.details?.issues
      .filter((issue): issue is Required<Issue> => issue.source?.file != null)
      .map(issue => ({ ...issue, audit })) ?? []
  )
}

// TODO: naive implementation - lines may have been moved by unrelated changes, etc.
function issuesAreEqual(a: Issue, b: Issue): boolean {
  return (
    a.message === b.message &&
    a.severity === b.severity &&
    a.source?.file === b.source?.file &&
    a.source?.position?.startLine === b.source?.position?.startLine &&
    a.source?.position?.startColumn === b.source?.position?.startColumn &&
    a.source?.position?.endLine === b.source?.position?.endLine &&
    a.source?.position?.endColumn === b.source?.position?.endColumn
  )
}
