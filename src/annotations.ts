import * as core from '@actions/core'
import type { SourceFileIssue } from './issues'

export function createAnnotationsFromIssues(issues: SourceFileIssue[]): void {
  for (const issue of issues) {
    const message = issue.message
    const properties: core.AnnotationProperties = {
      title: `${issue.plugin.title} | ${issue.audit.title}`,
      file: issue.source.file,
      startLine: issue.source.position?.startLine,
      startColumn: issue.source.position?.startColumn,
      endLine: issue.source.position?.endLine,
      endColumn: issue.source.position?.endColumn
    }

    switch (issue.severity) {
      case 'error':
        core.error(message, properties)
        break
      case 'warning':
        core.warning(message, properties)
        break
      case 'info':
        core.notice(message, properties)
        break
    }
  }
}
