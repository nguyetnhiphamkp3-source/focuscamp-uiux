/**
 * Course / Lesson admin CRUD.
 * Community owner only (platform admin role = Phase 2).
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { assertCommunityCanWrite } from "./community";

async function assertCommunityOwner(userId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  if (c.ownerId !== userId)
    throw new Error("Chỉ admin cộng đồng mới quản lý khoá học");
}

async function assertCourseAdmin(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { community: { select: { ownerId: true } } },
  });
  if (!course) throw new Error("Khoá học không tồn tại");
  if (course.community.ownerId !== userId)
    throw new Error("Chỉ admin cộng đồng mới sửa được");
  return course;
}

export async function createCourse(input: {
  userId: string;
  communityId: string;
  slug: string;
  title: string;
  description?: string;
  pillar?: string;
  level?: string;
  isPublished?: boolean;
}) {
  await assertCommunityOwner(input.userId, input.communityId);
  await assertCommunityCanWrite(input.communityId);
  const existing = await prisma.course.findFirst({
    where: { communityId: input.communityId, slug: input.slug },
    select: { id: true },
  });
  if (existing)
    throw new Error(`Slug "${input.slug}" đã tồn tại trong community này`);

  const course = await prisma.course.create({
    data: {
      communityId: input.communityId,
      slug: input.slug,
      title: input.title,
      description: input.description?.trim() || null,
      pillar: input.pillar || null,
      level: input.level || "BASIC",
      isPublished: input.isPublished ?? false,
    },
  });
  logger.info(
    { courseId: course.id, by: input.userId },
    "[course] created"
  );
  return course;
}

export async function updateCourse(input: {
  userId: string;
  courseId: string;
  title?: string;
  description?: string;
  pillar?: string | null;
  level?: string;
  isPublished?: boolean;
  thumbnailUrl?: string | null;
}) {
  await assertCourseAdmin(input.userId, input.courseId);
  const updated = await prisma.course.update({
    where: { id: input.courseId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      ...(input.pillar !== undefined ? { pillar: input.pillar } : {}),
      ...(input.level !== undefined ? { level: input.level } : {}),
      ...(input.isPublished !== undefined
        ? { isPublished: input.isPublished }
        : {}),
      ...(input.thumbnailUrl !== undefined
        ? { thumbnailUrl: input.thumbnailUrl }
        : {}),
    },
  });
  return updated;
}

export async function createLesson(input: {
  userId: string;
  courseId: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  duration?: number;
  position?: number;
}) {
  await assertCourseAdmin(input.userId, input.courseId);
  // auto-position if not given: last + 1
  let position = input.position;
  if (position === undefined) {
    const last = await prisma.lesson.findFirst({
      where: { courseId: input.courseId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    position = (last?.position ?? 0) + 1;
  }
  const lesson = await prisma.lesson.create({
    data: {
      courseId: input.courseId,
      title: input.title,
      description: input.description?.trim() || null,
      content: input.content?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      duration: input.duration ?? null,
      position,
    },
  });
  logger.info(
    { lessonId: lesson.id, courseId: input.courseId, by: input.userId },
    "[lesson] created"
  );
  return lesson;
}

export async function updateLesson(input: {
  userId: string;
  lessonId: string;
  title?: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  duration?: number;
  position?: number;
}) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: input.lessonId },
    select: { courseId: true },
  });
  if (!lesson) throw new Error("Lesson không tồn tại");
  await assertCourseAdmin(input.userId, lesson.courseId);

  const updated = await prisma.lesson.update({
    where: { id: input.lessonId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      ...(input.content !== undefined
        ? { content: input.content || null }
        : {}),
      ...(input.videoUrl !== undefined
        ? { videoUrl: input.videoUrl || null }
        : {}),
      ...(input.duration !== undefined ? { duration: input.duration } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    },
  });
  return updated;
}

export async function deleteLesson(input: { userId: string; lessonId: string }) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: input.lessonId },
    select: { courseId: true },
  });
  if (!lesson) throw new Error("Lesson không tồn tại");
  await assertCourseAdmin(input.userId, lesson.courseId);
  await prisma.lesson.delete({ where: { id: input.lessonId } });
}
