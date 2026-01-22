import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding } from "@/lib/api-helpers"
import { canViewTask, canCommentOnTask } from "@/lib/permissions"
import { taskCommentSchema } from "@/lib/validators"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/tasks/[id]/comments - List comments on a task
export async function GET(request: Request, { params }: RouteParams) {
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

  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(comments)
}

// POST /api/tasks/[id]/comments - Add a comment to a task
export async function POST(request: Request, { params }: RouteParams) {
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

  // Check comment permission
  const canComment = await canCommentOnTask(
    task,
    {
      userId: session.user.id,
      userRole: session.user.role,
      vendorProfileId: session.user.vendorProfileId,
    },
    wedding.id
  )

  if (!canComment) {
    return NextResponse.json(
      { error: "You don't have permission to comment on this task" },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = taskCommentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId: id,
      authorUserId: session.user.id,
      text: parsed.data.text,
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  // Log activity
  await prisma.taskActivity.create({
    data: {
      taskId: id,
      userId: session.user.id,
      action: "commented",
      details: { preview: parsed.data.text.substring(0, 100) },
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
