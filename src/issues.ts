import {
  adjustFileName,
  adjustLine,
  isFileChanged,
  type ChangedFiles
} from './git'
import type {
  Audit,
  AuditReport,
  Issue,
  PluginMeta,
  Report,
  ReportsDiff
} from './models'

export type SourceFileIssue = Required<Issue> & IssueContext

type IssueContext = {
  audit: Pick<Audit, 'slug' | 'title'>
  plugin: Pick<PluginMeta, 'slug' | 'title'>
}

export function filterRelevantIssues({
  currReport,
  prevReport,
  reportsDiff,
  changedFiles
}: {
  currReport: Report
  prevReport: Report
  reportsDiff: ReportsDiff
  changedFiles: ChangedFiles
}): SourceFileIssue[] {
  const auditsWithPlugin = [
    ...reportsDiff.audits.changed,
    ...reportsDiff.audits.added
  ]
    .map((auditLink): [PluginMeta, AuditReport] | undefined => {
      const plugin = currReport.plugins.find(
        ({ slug }) => slug === auditLink.plugin.slug
      )
      const audit = plugin?.audits.find(({ slug }) => slug === auditLink.slug)
      return plugin && audit && [plugin, audit]
    })
    .filter((ctx): ctx is [PluginMeta, AuditReport] => ctx != null)

  const issues = auditsWithPlugin.flatMap(([plugin, audit]) =>
    getAuditIssues(audit, plugin)
  )
  const prevIssues = prevReport.plugins.flatMap(plugin =>
    plugin.audits.flatMap(audit => getAuditIssues(audit, plugin))
  )

  return issues.filter(
    issue =>
      isFileChanged(changedFiles, issue.source.file) &&
      !prevIssues.some(prevIssue => issuesMatch(prevIssue, issue, changedFiles))
  )
}

function getAuditIssues(
  audit: AuditReport,
  plugin: PluginMeta
): SourceFileIssue[] {
  return (
    audit.details?.issues
      .filter((issue): issue is Required<Issue> => issue.source?.file != null)
      .map(issue => ({ ...issue, audit, plugin })) ?? []
  )
}

export function issuesMatch(
  prev: SourceFileIssue,
  curr: SourceFileIssue,
  changedFiles: ChangedFiles
): boolean {
  return (
    prev.plugin.slug === curr.plugin.slug &&
    prev.audit.slug === curr.audit.slug &&
    prev.severity === curr.severity &&
    removeDigits(prev.message) === removeDigits(curr.message) &&
    adjustFileName(changedFiles, prev.source.file) === curr.source.file &&
    positionsMatch(prev.source, curr.source, changedFiles)
  )
}

function removeDigits(message: string): string {
  return message.replace(/\d+/g, '')
}

function positionsMatch(
  prev: SourceFileIssue['source'],
  curr: SourceFileIssue['source'],
  changedFiles: ChangedFiles
): boolean {
  if (!hasPosition(prev) || !hasPosition(curr)) {
    return hasPosition(prev) === hasPosition(curr)
  }
  return (
    startLinesMatch(prev, curr, changedFiles) ||
    adjustedLineSpansMatch(prev, curr, changedFiles)
  )
}

function hasPosition(
  source: SourceFileIssue['source']
): source is Required<SourceFileIssue['source']> {
  return source.position != null
}

function startLinesMatch(
  prev: Required<SourceFileIssue['source']>,
  curr: Required<SourceFileIssue['source']>,
  changedFiles: ChangedFiles
): boolean {
  if (prev.position == null || curr.position == null) {
    return prev.position === curr.position
  }
  return (
    adjustLine(changedFiles, prev.file, prev.position.startLine) ===
    curr.position.startLine
  )
}

function adjustedLineSpansMatch(
  prev: SourceFileIssue['source'],
  curr: SourceFileIssue['source'],
  changedFiles: ChangedFiles
): boolean {
  if (prev.position?.endLine == null || curr.position?.endLine == null) {
    return false
  }

  const prevLineCount = prev.position.endLine - prev.position.startLine
  const currLineCount = curr.position.endLine - curr.position.startLine
  const currStartLineOffset =
    adjustLine(changedFiles, curr.file, curr.position.startLine) -
    curr.position.startLine
  return prevLineCount === currLineCount - currStartLineOffset
}
