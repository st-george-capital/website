"use client";
import { useState } from "react";
import Link from "next/link";
import type { Workshop } from "@/lib/learning/curriculum";
import { CourseLab } from "./course-lab";
export function CourseWorkshop({ workshop }: { workshop: Workshop }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  return (
    <div className="course-workshop">
      <p className="course-lead">{workshop.intro}</p>
      <CourseLab workshop={workshop} />
      <section className="course-case">
        <div className="course-eyebrow">Worked case · Example assumptions</div>
        <h2>Make the decision yourself</h2>
        <p>{workshop.brief}</p>
        <details>
          <summary>Show worked solution</summary>
          <p>{workshop.solution}</p>
        </details>
      </section>
      {workshop.lab !== "process" && (
        <section>
          <h2>Reason through the case</h2>
          <div className="course-reasoning">
            {workshop.steps.map((s, i) => (
              <article key={s.title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="course-knowledge">
        <div className="course-eyebrow">Check your understanding</div>
        <h2>Explain the result</h2>
        {workshop.quiz.map((q, i) => (
          <fieldset key={q.prompt}>
            <legend>{q.prompt}</legend>
            {q.choices.map((choice, j) => (
              <label key={choice}>
                <input
                  type="radio"
                  name={`question-${i}`}
                  checked={answers[i] === j}
                  onChange={() => setAnswers((a) => ({ ...a, [i]: j }))}
                />
                {choice}
              </label>
            ))}
            {answers[i] !== undefined && (
              <p className="course-answer" role="status">
                <strong>
                  {answers[i] === q.answer ? "Correct." : "Try again."}
                </strong>{" "}
                {q.explanation}
              </p>
            )}
          </fieldset>
        ))}
      </section>
      <section className="course-deliverable">
        <div className="course-eyebrow">Put it into practice</div>
        <h2>Your submission</h2>
        <p>{workshop.deliverable}</p>
        <h3>Review criteria</h3>
        <ul>
          {workshop.rubric.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      {workshop.projectTemplate && (
        <Link
          className="course-primary"
          href={`/dashboard/workshop?template=${workshop.projectTemplate}`}
        >
          Start a project from this workshop →
        </Link>
      )}
      {workshop.sources && (
        <section className="course-sources">
          <h3>Further reading</h3>
          {workshop.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              {s.title} ↗
            </a>
          ))}
        </section>
      )}
    </div>
  );
}
