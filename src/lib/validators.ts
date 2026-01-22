import { z } from "zod"

// ============================================================
// TASK VALIDATORS
// ============================================================

export const TaskStatusEnum = z.enum([
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "ARCHIVED",
])

export const TaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])

export const TaskVisibilityEnum = z.enum([
  "PRIVATE",
  "INTERNAL_TEAM",
  "PARENTS",
  "VENDORS",
  "EVERYONE_INTERNAL",
])

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional().nullable(),
  status: TaskStatusEnum.optional().default("TODO"),
  priority: TaskPriorityEnum.optional().default("MEDIUM"),
  dueDate: z
    .string()
    .datetime()
    .or(z.string().regex(dateOnlyRegex))
    .optional()
    .nullable(),
  tags: z.array(z.string().max(50)).optional().default([]),
  attachments: z.array(z.string().url()).optional().default([]),
  visibility: TaskVisibilityEnum.optional().default("INTERNAL_TEAM"),
  eventDayId: z.string().cuid().optional().nullable(),
  vendorId: z.string().cuid().optional().nullable(),
  timelineItemId: z.string().cuid().optional().nullable(),
  assignedToUserId: z.string().cuid().optional().nullable(),
  watcherUserIds: z.array(z.string().cuid()).optional().default([]),
  allowedUserIds: z.array(z.string().cuid()).optional().default([]),
  blockedUserIds: z.array(z.string().cuid()).optional().default([]),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  dueDate: z
    .string()
    .datetime()
    .or(z.string().regex(dateOnlyRegex))
    .optional()
    .nullable(),
  tags: z.array(z.string().max(50)).optional(),
  attachments: z.array(z.string().url()).optional(),
  visibility: TaskVisibilityEnum.optional(),
  eventDayId: z.string().cuid().optional().nullable(),
  vendorId: z.string().cuid().optional().nullable(),
  timelineItemId: z.string().cuid().optional().nullable(),
  assignedToUserId: z.string().cuid().optional().nullable(),
  watcherUserIds: z.array(z.string().cuid()).optional(),
  allowedUserIds: z.array(z.string().cuid()).optional(),
  blockedUserIds: z.array(z.string().cuid()).optional(),
})

export const taskCommentSchema = z.object({
  text: z.string().min(1, "Comment cannot be empty").max(5000),
})

export const taskFilterSchema = z.object({
  status: z.array(TaskStatusEnum).optional(),
  priority: z.array(TaskPriorityEnum).optional(),
  visibility: z.array(TaskVisibilityEnum).optional(),
  assignedToUserId: z.string().cuid().optional().nullable(),
  vendorId: z.string().cuid().optional().nullable(),
  eventDayId: z.string().cuid().optional().nullable(),
  dueBefore: z.string().datetime().or(z.string().regex(dateOnlyRegex)).optional(),
  dueAfter: z.string().datetime().or(z.string().regex(dateOnlyRegex)).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(200).optional(),
})

// ============================================================
// PERMISSION VALIDATORS
// ============================================================

export const UserRoleEnum = z.enum([
  "BRIDE",
  "GROOM",
  "PLANNER",
  "VENDOR",
  "BRIDE_PARENT",
  "GROOM_PARENT",
  "FAMILY_HELPER",
])

export const PermissionCapabilityEnum = z.enum([
  "tasks.create",
  "tasks.edit_any",
  "tasks.edit_assigned",
  "tasks.view_private",
  "tasks.assign",
  "tasks.comment",
  "vendors.view",
  "vendors.manage",
  "quotes.view",
  "quotes.manage",
  "payments.create",
  "payments.approve",
  "payments.view_all",
  "payments.view_own",
])

export const rolePermissionsSchema = z.record(
  PermissionCapabilityEnum,
  z.boolean()
)

export const permissionsPolicySchema = z.record(
  UserRoleEnum,
  rolePermissionsSchema.optional()
)

export const updatePermissionsPolicySchema = z.object({
  permissions: permissionsPolicySchema,
})

// ============================================================
// QUOTE VALIDATORS
// ============================================================

export const QuoteStatusEnum = z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"])

export const quoteLineItemSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().min(0),
  quantity: z.number().int().min(1).optional().default(1),
})

export const createQuoteSchema = z.object({
  vendorId: z.string().cuid(),
  title: z.string().min(1, "Title is required").max(200),
  amountTotal: z.number().min(0),
  currency: z.string().length(3).optional().default("USD"),
  notes: z.string().max(5000).optional().nullable(),
  lineItems: z.array(quoteLineItemSchema).optional().default([]),
  status: QuoteStatusEnum.optional().default("DRAFT"),
})

export const updateQuoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  amountTotal: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional().nullable(),
  lineItems: z.array(quoteLineItemSchema).optional(),
  status: QuoteStatusEnum.optional(),
})

// ============================================================
// PAYMENT VALIDATORS
// ============================================================

export const PaymentMethodEnum = z.enum([
  "CASH",
  "ZELLE",
  "VENMO",
  "BANK",
  "CARD",
  "OTHER",
])

export const createPaymentSchema = z.object({
  vendorId: z.string().cuid().optional().nullable(),
  quoteId: z.string().cuid().optional().nullable(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3).optional().default("USD"),
  paidAt: z.string().datetime().optional(),
  method: PaymentMethodEnum.optional().default("OTHER"),
  note: z.string().max(1000).optional().nullable(),
})

export const updatePaymentSchema = z.object({
  vendorId: z.string().cuid().optional().nullable(),
  quoteId: z.string().cuid().optional().nullable(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  paidAt: z.string().datetime().optional(),
  method: PaymentMethodEnum.optional(),
  note: z.string().max(1000).optional().nullable(),
})

// ============================================================
// TYPE EXPORTS
// ============================================================

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type TaskCommentInput = z.infer<typeof taskCommentSchema>
export type TaskFilterInput = z.infer<typeof taskFilterSchema>

export type RolePermissionsInput = z.infer<typeof rolePermissionsSchema>
export type PermissionsPolicyInput = z.infer<typeof permissionsPolicySchema>
export type UpdatePermissionsPolicyInput = z.infer<
  typeof updatePermissionsPolicySchema
>

export type QuoteLineItemInput = z.infer<typeof quoteLineItemSchema>
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
