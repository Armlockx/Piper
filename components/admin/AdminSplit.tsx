import type { ReactNode } from "react";

export function AdminSplit({
  leftSpan,
  left,
  right,
}: {
  leftSpan: 5 | 6;
  left: ReactNode;
  right: ReactNode;
}) {
  const leftClass = leftSpan === 5 ? "lg:col-span-5" : "lg:col-span-6";
  const rightClass = leftSpan === 5 ? "lg:col-span-7" : "lg:col-span-6";
  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
      <div className={`${leftClass} min-h-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`}>
        {left}
      </div>
      <div className={`${rightClass} min-h-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`}>
        {right}
      </div>
    </div>
  );
}
