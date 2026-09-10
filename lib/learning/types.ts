export interface CourseLesson {
  id: string;
  title: string;
  slug: string;
  content: string;
  order: number;
  published: boolean;
}
export interface LearningCourse {
  id: string;
  title: string;
  slug: string;
  summary: string;
  tags: string;
  published: boolean;
  order: number;
  lessons: CourseLesson[];
}
export const readingMinutes = (content: string) =>
  Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length / 200));
export function lessonExcerpt(content: string) {
  return content
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
