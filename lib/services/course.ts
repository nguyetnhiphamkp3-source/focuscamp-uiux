/**
 * Course / Lesson admin CRUD.
 * Owner + ADMIN manage course content. See docs/roles-permissions.md.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { assertCommunityCanWrite } from "./community";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";

async function assertCommunityOwner(userId: string, communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      ownerId: true,
      memberships: { where: { userId }, select: { role: true } },
    },
  });
  if (!c) throw new Error("Cộng đồng không tồn tại");
  const role = effectiveCommunityRole({
    isOwner: c.ownerId === userId,
    membershipRole: c.memberships[0]?.role,
  });
  if (!canCommunity(role, "manage_courses"))
    throw new Error("Chỉ admin cộng đồng mới quản lý khoá học");
}

async function assertCourseAdmin(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      community: {
        select: {
          ownerId: true,
          memberships: { where: { userId }, select: { role: true } },
        },
      },
    },
  });
  if (!course) throw new Error("Khoá học không tồn tại");
  const role = effectiveCommunityRole({
    isOwner: course.community.ownerId === userId,
    membershipRole: course.community.memberships[0]?.role,
  });
  if (!canCommunity(role, "manage_courses"))
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
  featuredOnGlobal?: boolean;
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
      ...(input.featuredOnGlobal !== undefined
        ? { featuredOnGlobal: input.featuredOnGlobal }
        : {}),
    },
  });
  return updated;
}

export async function setCourseFeaturedGlobal(input: {
  userId: string;
  courseId: string;
  featured: boolean;
}) {
  await assertCourseAdmin(input.userId, input.courseId);
  await prisma.course.update({
    where: { id: input.courseId },
    data: { featuredOnGlobal: input.featured },
  });
  logger.info(
    { courseId: input.courseId, featured: input.featured, by: input.userId },
    "[course] featuredOnGlobal toggled"
  );
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

/**
 * Mark a lesson as completed (or uncompleted) for a user.
 * Awards course XP/AIP once when all lessons are first completed (idempotent via XPLedger).
 */
export async function markLessonComplete(input: {
  userId: string;
  lessonId: string;
  completed: boolean;
}) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: input.lessonId },
    include: {
      course: {
        select: {
          id: true,
          communityId: true,
          isPublished: true,
          xpReward: true,
          aipReward: true,
          lessons: { select: { id: true } },
        },
      },
    },
  });
  if (!lesson) throw new Error("Lesson không tồn tại");
  if (!lesson.course.isPublished) throw new Error("Khoá học chưa được publish");

  const membership = await prisma.membership.findFirst({
    where: { userId: input.userId, communityId: lesson.course.communityId },
  });
  if (!membership) throw new Error("Bạn chưa tham gia cộng đồng này");

  // Enforce sequential order: previous lesson must be completed first
  if (input.completed) {
    const allLessons = await prisma.lesson.findMany({
      where: { courseId: lesson.course.id },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    const idx = allLessons.findIndex((l) => l.id === input.lessonId);
    if (idx > 0) {
      const prevCompleted = await prisma.courseProgress.findFirst({
        where: { userId: input.userId, lessonId: allLessons[idx - 1].id, completed: true },
      });
      if (!prevCompleted) throw new Error("Bạn cần hoàn thành bài học trước");
    }
  }

  await prisma.courseProgress.upsert({
    where: {
      userId_lessonId: { userId: input.userId, lessonId: input.lessonId },
    },
    create: {
      userId: input.userId,
      lessonId: input.lessonId,
      completed: input.completed,
      completedAt: input.completed ? new Date() : null,
    },
    update: {
      completed: input.completed,
      completedAt: input.completed ? new Date() : null,
    },
  });

  // Award XP/AIP once when all lessons first completed (idempotent via XPLedger)
  if (input.completed && (lesson.course.xpReward > 0 || lesson.course.aipReward > 0)) {
    const allLessonIds = lesson.course.lessons.map((l) => l.id);
    const completedCount = await prisma.courseProgress.count({
      where: {
        userId: input.userId,
        lessonId: { in: allLessonIds },
        completed: true,
      },
    });
    if (completedCount >= allLessonIds.length) {
      const alreadyRewarded = await prisma.xPLedger.findFirst({
        where: {
          userId: input.userId,
          reason: "course_complete",
          reasonId: lesson.course.id,
        },
      });
      if (!alreadyRewarded) {
        await prisma.$transaction([
          prisma.xPLedger.create({
            data: {
              userId: input.userId,
              communityId: lesson.course.communityId,
              amount: lesson.course.xpReward,
              reason: "course_complete",
              reasonId: lesson.course.id,
            },
          }),
          prisma.membership.update({
            where: { id: membership.id },
            data: {
              xp: { increment: lesson.course.xpReward },
              aip: { increment: lesson.course.aipReward },
            },
          }),
        ]);
        logger.info(
          { userId: input.userId, courseId: lesson.course.id, xp: lesson.course.xpReward, aip: lesson.course.aipReward },
          "[course] completion reward awarded"
        );
      }
    }
  }

  logger.info(
    { userId: input.userId, lessonId: input.lessonId, completed: input.completed },
    "[course] lesson progress updated"
  );
}
