import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
export function ToolPageHeader({
  title,
  description,
  category,
  actions,
}: {
  title: string;
  description: string;
  category: string;
  actions?: ReactNode;
}) {
  return (
    <header className="tool-page-header">
      <Link href="/dashboard/tools" className="tool-back">
        <ArrowLeft size={14} /> Research tools <span>/ {category}</span>
      </Link>
      <div className="tool-heading-row">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className="tool-header-actions">{actions}</div>}
      </div>
    </header>
  );
}
