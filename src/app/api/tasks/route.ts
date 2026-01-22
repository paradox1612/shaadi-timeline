import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding } from "@/lib/api-helpers"
import {
  buildTaskVisibilityFilter,
  hasPermission,
  isBrideOrGroom,
} from "@/lib/permissions"
import { createTaskSchema } from "@/lib/validators"

// GET /api/tasks - List tasks with filtering
export async function GET(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { searchParams } = new URL(request.url)

  // Parse filter params
  const statusFilter = searchParams.getAll("status")
  const priorityFilter = searchParams.getAll("priority")
  const visibilityFilter = searchParams.getAll("visibility")
  const assignedToUserId = searchParams.get("assignedToUserId")
  const vendorId = searchParams.get("vendorId")
  const eventDayId = searchParams.get("eventDayId")
  const dueBefore = searchParams.get("dueBefore")
  const dueAfter = searchParams.get("dueAfter")
  const tags = searchParams.getAll("tags")
  const search = searchParams.get("search")

  // Build visibility filter based on user's permissions
  const visibilityWhere = await buildTaskVisibilityFilter(
    {
      userId: session.user.id,
      userRole: session.user.role,
      vendorProfileId: session.user.vendorProfileId,
    },
    wedding.id
  )

  // Build additional filters
  const additionalFilters: object[] = []

  if (statusFilter.length > 0) {
    additionalFilters.push({ status: { in: statusFilter } })
  }

  if (priorityFilter.length > 0) {
    additionalFilters.push({ priority: { in: priorityFilter } })
  }

  if (visibilityFilter.length > 0) {
    additionalFilters.push({ visibility: { in: visibilityFilter } })
  }

  if (assignedToUserId) {
    additionalFilters.push({ assignedToUserId })
  }

  if (vendorId) {
    additionalFilters.push({ vendorId })
  }

  if (eventDayId) {
    additionalFilters.push({ eventDayId })
  }

  if (dueBefore) {
    additionalFilters.push({ dueDate: { lte: new Date(dueBefore) } })
  }

  if (dueAfter) {
    additionalFilters.push({ dueDate: { gte: new Date(dueAfter) } })
  }

  if (tags.length > 0) {
    additionalFilters.push({ tags: { hasSome: tags } })
  }

  if (search) {
    additionalFilters.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    })
  }

  const tasks = await prisma.task.findMany({
    where: {
      ...visibilityWhere,
      AND: additionalFilters.length > 0 ? additionalFilters : undefined,
    },
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
      _count: {
        select: { comments: true },
      },
    },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  })

  return NextResponse.json(tasks)
}

// POST /api/tasks - Create a new task
export async function POST(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  // Check permission to create tasks
  const canCreate = await hasPermission(
    session.user.id,
    session.user.role,
    wedding.id,
    "tasks.create"
  )

  if (!canCreate) {
    return NextResponse.json(
      { error: "You don't have permission to create tasks" },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Check assign permission if assigning to someone
  if (data.assignedToUserId) {
    const canAssign = await hasPermission(
      session.user.id,
      session.user.role,
      wedding.id,
      "tasks.assign"
    )

    if (!canAssign && !isBrideOrGroom(session.user.role)) {
      return NextResponse.json(
        { error: "You don't have permission to assign tasks" },
        { status: 403 }
      )
    }
  }

  // Create the task with related data
  const task = await prisma.task.create({
    data: {
      weddingId: wedding.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      tags: data.tags,
      attachments: data.attachments,
      visibility: data.visibility,
      eventDayId: data.eventDayId,
      vendorId: data.vendorId,
      timelineItemId: data.timelineItemId,
      createdByUserId: session.user.id,
      assignedToUserId: data.assignedToUserId,
      watchers: {
        create: data.watcherUserIds.map((userId) => ({ userId })),
      },
      allowedUsers: {
        create: data.allowedUserIds.map((userId) => ({ userId })),
      },
      blockedUsers: {
        create: data.blockedUserIds.map((userId) => ({ userId })),
      },
    },
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
  await prisma.taskActivity.create({
    data: {
      taskId: task.id,
      userId: session.user.id,
      action: "created",
      details: { title: task.title },
    },
  })

  return NextResponse.json(task, { status: 201 })
}
