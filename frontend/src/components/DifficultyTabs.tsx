import Link from "next/link";
import { DIFFICULTY_LIST } from "@/lib/difficulty";

export function DifficultyTabs({
  basePath,
  activeId,
  query,
}: {
  basePath: string;
  activeId: string;
  query?: Record<string, string>;
}) {
  return (
    <nav aria-label="Difficulty" className="segmented">
      {DIFFICULTY_LIST.map((d) => {
        const params = new URLSearchParams({ difficulty: d.id, ...query });
        return (
        <Link
          key={d.id}
          href={`${basePath}?${params}`}
          scroll={false}
          className="segmented-item"
          aria-current={d.id === activeId ? "page" : undefined}
        >
          {d.label}
        </Link>
        );
      })}
    </nav>
  );
}
