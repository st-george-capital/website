import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** One rendering path for saved lessons and the editor preview; raw HTML stays disabled. */
export function LessonContent({ content }: { content: string }) {
  return (
    <div className="lesson-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="lesson-table"><p className="lesson-table-hint">Scroll horizontally to see all columns →</p>
            <div
              className="lesson-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Lesson table"
            >
              <table>{children}</table>
            </div></div>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              {...(href?.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ""} loading="lazy" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
