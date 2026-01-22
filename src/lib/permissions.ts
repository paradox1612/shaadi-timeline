import { UserRole, TaskVisibility, Task } from "@prisma/client"
import { prisma } from "./prisma"

// ============================================================
// PERMISSION CAPABILITIES
// ============================================================

export const PERMISSION_CAPABILITIES = [
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
] as const

export type PermissionCapability = (typeof PERMISSION_CAPABILITIES)[number]

export type RolePermissions = {
  [key in PermissionCapability]?: boolean
}

export type PermissionsMatrix = {
  [role in UserRole]?: RolePermissions
}

// ============================================================
// DEFAULT PERMISSIONS BY ROLE
// ============================================================

export const DEFAULT_PERMISSIONS: PermissionsMatrix = {
  BRIDE: {
    "tasks.create": true,
    "tasks.edit_any": true,
    "tasks.edit_assigned": true,
    "tasks.view_private": true,
    "tasks.assign": true,
    "tasks.comment": true,
    "vendors.view": true,
    "vendors.manage": true,
    "quotes.view": true,
    "quotes.manage": true,
    "payments.create": true,
    "payments.approve": true,
    "payments.view_all": true,
    "payments.view_own": true,
  },
  GROOM: {
    "tasks.create": true,
    "tasks.edit_any": true,
    "tasks.edit_assigned": true,
    "tasks.view_private": true,
    "tasks.assign": true,
    "tasks.comment": true,
    "vendors.view": true,
    "vendors.manage": true,
    "quotes.view": true,
    "quotes.manage": true,
    "payments.create": true,
    "payments.approve": true,
    "payments.view_all": true,
    "payments.view_own": true,
  },
  PLANNER: {
    "tasks.create": true,
    "tasks.edit_any": true,
    "tasks.edit_assigned": true,
    "tasks.view_private": false, // Cannot see PRIVATE tasks by default
    "tasks.assign": true,
    "tasks.comment": true,
    "vendors.view": true,
    "vendors.manage": true,
    "quotes.view": true,
    "quotes.manage": true,
    "payments.create": true,
    "payments.approve": false, // Cannot approve payments by default
    "payments.view_all": true,
    "payments.view_own": true,
  },
  BRIDE_PARENT: {
    "tasks.create": true,
    "tasks.edit_any": false,
    "tasks.edit_assigned": true,
    "tasks.view_private": false,
    "tasks.assign": false,
    "tasks.comment": true,
    "vendors.view": true,
    "vendors.manage": false,
    "quotes.view": true,
    "quotes.manage": false,
    "payments.create": false,
    "payments.approve": false,
    "payments.view_all": false,
    "payments.view_own": true,
  },
  GROOM_PARENT: {
    "tasks.create": true,
    "tasks.edit_any": false,
    "tasks.edit_assigned": true,
    "tasks.view_private": false,
    "tasks.assign": false,
    "tasks.comment": true,
    "vendors.view": true,
    "vendors.manage": false,
    "quotes.view": true,
    "quotes.manage": false,
    "payments.create": false,
    "payments.approve": false,
    "payments.view_all": false,
    "payments.view_own": true,
  },
  FAMILY_HELPER: {
    "tasks.create": true,
    "tasks.edit_any": false,
    "tasks.edit_assigned": true,
    "tasks.view_private": false,
    "tasks.assign": false,
    "tasks.comment": true,
    "vendors.view": true,
    "vendors.manage": false,
    "quotes.view": false,
    "quotes.manage": false,
    "payments.create": false,
    "payments.approve": false,
    "payments.view_all": false,
    "payments.view_own": false,
  },
  VENDOR: {
    "tasks.create": false,
    "tasks.edit_any": false,
    "tasks.edit_assigned": true,
    "tasks.view_private": false,
    "tasks.assign": false,
    "tasks.comment": true,
    "vendors.view": false, // Vendor can only see their own profile
    "vendors.manage": false,
    "quotes.view": true, // Can view their own quotes
    "quotes.manage": false,
    "payments.create": false,
    "payments.approve": false,
    "payments.view_all": false,
    "payments.view_own": true,
  },
}

// ============================================================
// ROLE HELPERS
// ============================================================

export function isBrideOrGroom(role: UserRole): boolean {
  return role === "BRIDE" || role === "GROOM"
}

export function isInternalTeamMember(role: UserRole): boolean {
  return ["BRIDE", "GROOM", "PLANNER"].includes(role)
}

export function isParent(role: UserRole): boolean {
  return role === "BRIDE_PARENT" || role === "GROOM_PARENT"
}

export function isFamilyHelper(role: UserRole): boolean {
  return role === "FAMILY_HELPER"
}

export function isVendor(role: UserRole): boolean {
  return role === "VENDOR"
}

// Roles that should see the main dashboard (not vendor dashboard)
export function isDashboardUser(role: UserRole): boolean {
  return [
    "BRIDE",
    "GROOM",
    "PLANNER",
    "BRIDE_PARENT",
    "GROOM_PARENT",
    "FAMILY_HELPER",
  ].includes(role)
}

// ============================================================
// PERMISSION POLICY HELPERS
// ============================================================

export async function getPermissionPolicy(
  weddingId: string
): Promise<PermissionsMatrix> {
  const policy = await prisma.permissionPolicy.findUnique({
    where: { weddingId },
  })

  if (!policy) {
    return DEFAULT_PERMISSIONS
  }

  // Merge with defaults (policy overrides take precedence)
  const storedPermissions = policy.permissions as PermissionsMatrix
  const mergedPermissions: PermissionsMatrix = {}

  for (const role of Object.keys(DEFAULT_PERMISSIONS) as UserRole[]) {
    mergedPermissions[role] = {
      ...DEFAULT_PERMISSIONS[role],
      ...(storedPermissions[role] || {}),
    }
  }

  return mergedPermissions
}

export async function hasPermission(
  userId: string,
  userRole: UserRole,
  weddingId: string,
  capability: PermissionCapability
): Promise<boolean> {
  // Bride and Groom always have full permissions
  if (isBrideOrGroom(userRole)) {
    return true
  }

  const policy = await getPermissionPolicy(weddingId)
  const rolePermissions = policy[userRole] || {}

  return rolePermissions[capability] === true
}

// ============================================================
// TASK VISIBILITY EVALUATION
// ============================================================

type TaskWithRelations = Task & {
  allowedUsers?: { userId: string }[]
  blockedUsers?: { userId: string }[]
  watchers?: { userId: string }[]
  vendor?: { userId: string | null } | null
}

export interface TaskVisibilityContext {
  userId: string
  userRole: UserRole
  vendorProfileId?: string | null
}

/**
 * Evaluates whether a user can view a specific task.
 *
 * Visibility evaluation order:
 * 1. If user is in blockedUsers => deny
 * 2. If user is bride or groom => allow
 * 3. If task.visibility == PRIVATE:
 *    allow only if userId in allowedUsers OR (policy allows view_private AND role is configured)
 * 4. If task.visibility matches role bucket (PARENTS, VENDORS, INTERNAL_TEAM, EVERYONE_INTERNAL):
 *    allow if role allowed by that visibility AND the permission policy allows viewing tasks
 * 5. Vendors: only allow if task is linked/assigned to that vendor OR vendor is explicitly allowedUsers
 */
export async function canViewTask(
  task: TaskWithRelations,
  context: TaskVisibilityContext,
  weddingId: string
): Promise<boolean> {
  const { userId, userRole, vendorProfileId } = context

  // 1. If user is explicitly blocked, deny
  if (task.blockedUsers?.some((bu) => bu.userId === userId)) {
    return false
  }

  // 2. Bride/Groom can always view any task
  if (isBrideOrGroom(userRole)) {
    return true
  }

  // Check if user is in allowed list
  const isExplicitlyAllowed = !!task.allowedUsers?.some(
    (au) => au.userId === userId
  )

  // 3. Handle PRIVATE visibility
  if (task.visibility === TaskVisibility.PRIVATE) {
    if (isExplicitlyAllowed) {
      return true
    }
    // Check if user's role has view_private permission
    const canViewPrivate = await hasPermission(
      userId,
      userRole,
      weddingId,
      "tasks.view_private"
    )
    return canViewPrivate
  }

  // For vendors, check special rules
  if (isVendor(userRole)) {
    // Vendor can only see tasks if:
    // - Task is assigned to their vendor profile
    // - OR they are explicitly in allowedUsers
    // - AND the visibility includes VENDORS or EVERYONE_INTERNAL
    if (
      task.visibility !== TaskVisibility.VENDORS &&
      task.visibility !== TaskVisibility.EVERYONE_INTERNAL
    ) {
      return isExplicitlyAllowed
    }

    // Check if task is assigned to this vendor
    const isAssignedVendor =
      vendorProfileId && task.vendorId === vendorProfileId
    const vendorUserMatch =
      vendorProfileId && task.vendor?.userId === userId

    return isAssignedVendor || vendorUserMatch || isExplicitlyAllowed
  }

  // 4. Check visibility buckets for non-vendor roles
  switch (task.visibility) {
    case TaskVisibility.INTERNAL_TEAM:
      // Only bride/groom/planner (bride/groom already handled above)
      return userRole === "PLANNER"

    case TaskVisibility.PARENTS:
      // Bride/groom + parents + planner
      return (
        userRole === "PLANNER" ||
        userRole === "BRIDE_PARENT" ||
        userRole === "GROOM_PARENT"
      )

    case TaskVisibility.VENDORS:
      // Bride/groom + planner + assigned vendor (vendors handled above)
      return userRole === "PLANNER"

    case TaskVisibility.EVERYONE_INTERNAL:
      // Bride/groom + planner + parents + family helpers + assigned vendor
      return (
        userRole === "PLANNER" ||
        userRole === "BRIDE_PARENT" ||
        userRole === "GROOM_PARENT" ||
        userRole === "FAMILY_HELPER"
      )

    default:
      return isExplicitlyAllowed
  }
}

/**
 * Check if user can edit a specific task
 */
export async function canEditTask(
  task: TaskWithRelations,
  context: TaskVisibilityContext,
  weddingId: string
): Promise<boolean> {
  const { userId, userRole, vendorProfileId } = context

  // First, user must be able to view the task
  const canView = await canViewTask(task, context, weddingId)
  if (!canView) {
    return false
  }

  // Check edit_any permission
  const canEditAny = await hasPermission(
    userId,
    userRole,
    weddingId,
    "tasks.edit_any"
  )
  if (canEditAny) {
    return true
  }

  // Check edit_assigned permission
  const canEditAssigned = await hasPermission(
    userId,
    userRole,
    weddingId,
    "tasks.edit_assigned"
  )
  if (!canEditAssigned) {
    return false
  }

  // For edit_assigned, check if user is assignedTo or a watcher
  if (task.assignedToUserId === userId) {
    return true
  }

  // Check watchers
  if (task.watchers?.some((w) => w.userId === userId)) {
    return true
  }

  // For vendors, check if task is assigned to their vendor profile
  if (isVendor(userRole) && vendorProfileId) {
    return task.vendorId === vendorProfileId
  }

  return false
}

/**
 * Check if user can comment on a task
 */
export async function canCommentOnTask(
  task: TaskWithRelations,
  context: TaskVisibilityContext,
  weddingId: string
): Promise<boolean> {
  // Must be able to view the task
  const canView = await canViewTask(task, context, weddingId)
  if (!canView) {
    return false
  }

  // Check tasks.comment permission
  return hasPermission(
    context.userId,
    context.userRole,
    weddingId,
    "tasks.comment"
  )
}

// ============================================================
// PAYMENT/QUOTE VISIBILITY
// ============================================================

export async function canViewPayments(
  userId: string,
  userRole: UserRole,
  weddingId: string,
  vendorProfileId?: string | null
): Promise<{ viewAll: boolean; viewOwn: boolean }> {
  const viewAll = await hasPermission(
    userId,
    userRole,
    weddingId,
    "payments.view_all"
  )
  const viewOwn = await hasPermission(
    userId,
    userRole,
    weddingId,
    "payments.view_own"
  )

  // If vendor, they can only view payments for their vendor profile
  if (isVendor(userRole)) {
    return { viewAll: false, viewOwn: viewOwn && !!vendorProfileId }
  }

  return { viewAll, viewOwn }
}

export async function canViewQuotes(
  userId: string,
  userRole: UserRole,
  weddingId: string,
  vendorProfileId?: string | null
): Promise<boolean> {
  // Vendors can view their own quotes
  if (isVendor(userRole) && vendorProfileId) {
    return true
  }

  return hasPermission(userId, userRole, weddingId, "quotes.view")
}

export async function canManageQuotes(
  userId: string,
  userRole: UserRole,
  weddingId: string
): Promise<boolean> {
  return hasPermission(userId, userRole, weddingId, "quotes.manage")
}

export async function canCreatePayments(
  userId: string,
  userRole: UserRole,
  weddingId: string
): Promise<boolean> {
  return hasPermission(userId, userRole, weddingId, "payments.create")
}

// ============================================================
// BUILD TASK VISIBILITY FILTER FOR PRISMA
// ============================================================

/**
 * Builds a Prisma where clause to filter tasks based on user's visibility permissions.
 * This should be used when fetching task lists to ensure only visible tasks are returned.
 */
export async function buildTaskVisibilityFilter(
  context: TaskVisibilityContext,
  weddingId: string
): Promise<object> {
  const { userId, userRole, vendorProfileId } = context

  // Bride/Groom can see everything
  if (isBrideOrGroom(userRole)) {
    return {
      weddingId,
      // Exclude tasks where user is blocked
      NOT: {
        blockedUsers: {
          some: { userId },
        },
      },
    }
  }

  // Get policy for view_private check
  const canViewPrivate = await hasPermission(
    userId,
    userRole,
    weddingId,
    "tasks.view_private"
  )

  // Build visibility conditions based on role
  const visibilityConditions: object[] = []

  // Always include tasks where user is explicitly allowed
  visibilityConditions.push({
    allowedUsers: {
      some: { userId },
    },
  })

  // For vendors
  if (isVendor(userRole)) {
    if (vendorProfileId) {
      // Can see VENDORS or EVERYONE_INTERNAL visibility if assigned to them
      visibilityConditions.push({
        visibility: { in: [TaskVisibility.VENDORS, TaskVisibility.EVERYONE_INTERNAL] },
        vendorId: vendorProfileId,
      })
    }
  } else {
    // Non-vendor roles
    if (userRole === "PLANNER") {
      // Planner can see INTERNAL_TEAM, PARENTS, VENDORS, EVERYONE_INTERNAL
      visibilityConditions.push({
        visibility: {
          in: [
            TaskVisibility.INTERNAL_TEAM,
            TaskVisibility.PARENTS,
            TaskVisibility.VENDORS,
            TaskVisibility.EVERYONE_INTERNAL,
          ],
        },
      })
      if (canViewPrivate) {
        visibilityConditions.push({ visibility: TaskVisibility.PRIVATE })
      }
    }

    if (isParent(userRole)) {
      // Parents can see PARENTS, EVERYONE_INTERNAL
      visibilityConditions.push({
        visibility: {
          in: [TaskVisibility.PARENTS, TaskVisibility.EVERYONE_INTERNAL],
        },
      })
    }

    if (isFamilyHelper(userRole)) {
      // Family helpers can see EVERYONE_INTERNAL
      visibilityConditions.push({
        visibility: TaskVisibility.EVERYONE_INTERNAL,
      })
    }
  }

  return {
    weddingId,
    AND: [
      // Exclude blocked users
      {
        NOT: {
          blockedUsers: {
            some: { userId },
          },
        },
      },
      // Match any of the visibility conditions
      {
        OR: visibilityConditions,
      },
    ],
  }
}
