"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createCourse,
  updateCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  setCourseFeaturedGlobal,
  markLessonComplete,
} from "@/lib/services/course";
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  CreateLessonSchema,
  UpdateLessonSchema,
  DeleteLessonSchema,
  MarkLessonCompleteSchema,
} from "@/lib/validations";
import { logError } from "@/lib/logger";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

export async function createCourseAction(input: {
  communityId: string;
  communitySlug: string;
  slug: string;
  title: string;
  description?: string;
  pillar?: string;
  level?: "BASIC" | "ADVANCED" | "EXPERT";
  isPublished?: boolean;
}): Promise<ActionResult<{ slug: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CreateCourseSchema.safeParse({
    communityId: input.communityId,
    slug: input.slug,
    title: input.title,
    description: input.description,
    pillar: input.pillar,
    level: input.level,
    isPublished: input.isPublished,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const c = await createCourse({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      pillar: parsed.data.pillar || undefined,
      level: parsed.data.level,
      isPublished: parsed.data.isPublished,
    });
    revalidatePath(`/c/${input.communitySlug}/courses`);
    return { ok: true, data: { slug: c.slug } };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateCourseAction(input: {
  courseId: string;
  communitySlug: string;
  courseSlug: string;
  title?: string;
  description?: string;
  pillar?: string;
  level?: "BASIC" | "ADVANCED" | "EXPERT";
  isPublished?: boolean;
  thumbnailUrl?: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateCourseSchema.safeParse({
    courseId: input.courseId,
    title: input.title,
    description: input.description,
    pillar: input.pillar,
    level: input.level,
    isPublished: input.isPublished,
    thumbnailUrl: input.thumbnailUrl,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateCourse({
      userId: s.user.id,
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      pillar: parsed.data.pillar ?? undefined,
      level: parsed.data.level,
      isPublished: parsed.data.isPublished,
      thumbnailUrl: parsed.data.thumbnailUrl ?? undefined,
    });
    revalidatePath(`/c/${input.communitySlug}/courses`);
    revalidatePath(`/c/${input.communitySlug}/courses/${input.courseSlug}`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, courseId: input.courseId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function createLessonAction(input: {
  courseId: string;
  communitySlug: string;
  courseSlug: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  duration?: number;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CreateLessonSchema.safeParse({
    courseId: input.courseId,
    title: input.title,
    description: input.description,
    content: input.content,
    videoUrl: input.videoUrl,
    duration: input.duration,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await createLesson({
      userId: s.user.id,
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      content: parsed.data.content ?? undefined,
      videoUrl: parsed.data.videoUrl ?? undefined,
      duration: parsed.data.duration,
    });
    revalidatePath(`/c/${input.communitySlug}/courses/${input.courseSlug}`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, courseId: input.courseId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateLessonAction(input: {
  lessonId: string;
  communitySlug: string;
  courseSlug: string;
  title?: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  duration?: number;
  position?: number;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateLessonSchema.safeParse({
    lessonId: input.lessonId,
    title: input.title,
    description: input.description,
    content: input.content,
    videoUrl: input.videoUrl,
    duration: input.duration,
    position: input.position,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateLesson({
      userId: s.user.id,
      lessonId: parsed.data.lessonId,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      content: parsed.data.content ?? undefined,
      videoUrl: parsed.data.videoUrl ?? undefined,
      duration: parsed.data.duration,
      position: parsed.data.position,
    });
    revalidatePath(`/c/${input.communitySlug}/courses/${input.courseSlug}`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, lessonId: input.lessonId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function deleteLessonAction(input: {
  lessonId: string;
  communitySlug: string;
  courseSlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  const parsed = DeleteLessonSchema.safeParse({ lessonId: input.lessonId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    await deleteLesson({ userId: s.user.id, lessonId: parsed.data.lessonId });
    revalidatePath(`/c/${input.communitySlug}/courses/${input.courseSlug}`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, lessonId: input.lessonId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function setCourseFeaturedGlobalAction(input: {
  courseId: string;
  communitySlug: string;
  featured: boolean;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };
  try {
    await setCourseFeaturedGlobal({
      userId: s.user.id,
      courseId: input.courseId,
      featured: input.featured,
    });
    revalidatePath(`/c/${input.communitySlug}/courses`);
    revalidatePath(`/marketplace`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, courseId: input.courseId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function markLessonCompleteAction(input: {
  lessonId: string;
  communitySlug: string;
  courseSlug: string;
  completed: boolean;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = MarkLessonCompleteSchema.safeParse({
    lessonId: input.lessonId,
    completed: input.completed,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await markLessonComplete({
      userId: s.user.id,
      lessonId: parsed.data.lessonId,
      completed: parsed.data.completed,
    });
    revalidatePath(`/c/${input.communitySlug}/courses/${input.courseSlug}`);
    revalidatePath(`/c/${input.communitySlug}/courses`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, lessonId: input.lessonId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
