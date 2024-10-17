import * as core from '@actions/core'
import type { SourceFileIssue } from '@code-pushup/ci'
import { CODE_PUSHUP_UNICODE_LOGO } from '@code-pushup/utils'

export function createAnnotationsFromIssues(issues: SourceFileIssue[]): void {
  if (issues.length > 0) {
    core.info(`Creating annotations for ${issues.length} issues:`)
  }

  for (const issue of issues) {
    const message = issue.message
    const properties: core.AnnotationProperties = {
      title: `${CODE_PUSHUP_UNICODE_LOGO} ${issue.plugin.title} | ${issue.audit.title}`,
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
