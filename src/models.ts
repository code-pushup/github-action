// @ts-expect-error https://github.com/microsoft/TypeScript/issues/52529
import type { AuditReport, Report } from '@code-pushup/models/src/lib/report'
// @ts-expect-error https://github.com/microsoft/TypeScript/issues/52529
import type { Issue } from '@code-pushup/models/src/lib/issue'
// @ts-expect-error https://github.com/microsoft/TypeScript/issues/52529
import type { ReportsDiff } from '@code-pushup/models/src/lib/reports-diff'
// @ts-expect-error https://github.com/microsoft/TypeScript/issues/52529
import type { PluginMeta } from '@code-pushup/models/src/lib/plugin-config'
// @ts-expect-error https://github.com/microsoft/TypeScript/issues/52529
import type { Audit } from '@code-pushup/models/src/lib/audit'

export type { Audit, AuditReport, Issue, PluginMeta, Report, ReportsDiff }
