import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding } from "@/lib/api-helpers"
import { canViewTask, canEditTask, isBrideOrGroom } from "@/lib/permissions"
import { updateTaskSchema } from "@/lib/validators"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/tasks/[id] - Get a single task
export async function GET(request: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { id } = await params

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      eventDay: { select: { id: true, label: true, date: true } },
      vendor: { select: { id: true, companyName: true, type: true, userId: true } },
      timelineItem: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      watchers: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      allowedUsers: { select: { userId: true } },
      blockedUsers: { select: { userId: true } },
      comments: {
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      activities: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  if (task.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // Check visibility
  const canView = await canViewTask(
    task,
    {
      userId: session.user.id,
      userRole: session.user.role,
      vendorProfileId: session.user.vendorProfileId,
    },
    wedding.id
  )

  if (!canView) {
    return NextResponse.json(
      { error: "You don't have permission to view this task" },
      { status: 403 }
    )
  }

  return NextResponse.json(task)
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(request: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { id } = await params

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      vendor: { select: { userId: true } },
      watchers: { select: { userId: true } },
      allowedUsers: { select: { userId: true } },
      blockedUsers: { select: { userId: true } },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  if (task.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // Check edit permission
  const canEdit = await canEditTask(
    task,
    {
      userId: session.user.id,
      userRole: session.user.role,
      vendorProfileId: session.user.vendorProfileId,
    },
    wedding.id
  )

  if (!canEdit) {
    return NextResponse.json(
      { error: "You don't have permission to edit this task" },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Track changes for activity log
  const changes: Record<string, { from: string | null; to: string | null }> = {}

  if (data.status !== undefined && data.status !== task.status) {
    changes.status = { from: task.status, to: data.status }
  }
  if (data.priority !== undefined && data.priority !== task.priority) {
    changes.priority = { from: task.priority, to: data.priority }
  }
  if (data.assignedToUserId !== undefined && data.assignedToUserId !== task.assignedToUserId) {
    changes.assignedToUserId = { from: task.assignedToUserId, to: data.assignedToUserId }
  }

  // Build update data
  const updateData: Record<string, unknown> = {}

  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.status !== undefined) updateData.status = data.status
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
  }
  if (data.tags !== undefined) updateData.tags = data.tags
  if (data.attachments !== undefined) updateData.attachments = data.attachments
  if (data.visibility !== undefined) updateData.visibility = data.visibility
  if (data.eventDayId !== undefined) updateData.eventDayId = data.eventDayId
  if (data.vendorId !== undefined) updateData.vendorId = data.vendorId
  if (data.timelineItemId !== undefined) updateData.timelineItemId = data.timelineItemId
  if (data.assignedToUserId !== undefined) updateData.assignedToUserId = data.assignedToUserId

  // Update watchers if provided
  if (data.watcherUserIds !== undefined) {
    await prisma.taskWatcher.deleteMany({ where: { taskId: id } })
    await prisma.taskWatcher.createMany({
      data: data.watcherUserIds.map((userId) => ({ taskId: id, userId })),
    })
  }

  // Update allowed users if provided (only bride/groom can modify)
  if (data.allowedUserIds !== undefined && isBrideOrGroom(session.user.role)) {
    await prisma.taskAllowedUser.deleteMany({ where: { taskId: id } })
    await prisma.taskAllowedUser.createMany({
      data: data.allowedUserIds.map((userId) => ({ taskId: id, userId })),
    })
  }

  // Update blocked users if provided (only bride/groom can modify)
  if (data.blockedUserIds !== undefined && isBrideOrGroom(session.user.role)) {
    await prisma.taskBlockedUser.deleteMany({ where: { taskId: id } })
    await prisma.taskBlockedUser.createMany({
      data: data.blockedUserIds.map((userId) => ({ taskId: id, userId })),
    })
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      eventDay: { select: { id: true, label: true, date: true } },
      vendor: { select: { id: true, companyName: true, type: true } },
      timelineItem: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      watchers: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  // Log activity
  const action = Object.keys(changes).includes("status")
    ? "status_changed"
    : Object.keys(changes).includes("assignedToUserId")
      ? "assigned"
      : "updated"

  await prisma.taskActivity.create({
    data: {
      taskId: id,
      userId: session.user.id,
      action,
      details: Object.keys(changes).length > 0 ? changes : { fields: Object.keys(data) },
    },
  })

  return NextResponse.json(updatedTask)
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(request: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { id } = await params

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      vendor: { select: { userId: true } },
      watchers: { select: { userId: true } },
      allowedUsers: { select: { userId: true } },
      blockedUsers: { select: { userId: true } },
    },
  })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  if (task.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // Only bride/groom or task creator can delete
  const isCreator = task.createdByUserId === session.user.id
  const isBrideGroom = isBrideOrGroom(session.user.role)

  if (!isCreator && !isBrideGroom) {
    return NextResponse.json(
      { error: "You don't have permission to delete this task" },
      { status: 403 }
    )
  }

  await prisma.task.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
