export function Mark({
  className = "h-7 w-7",
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Arbor"}
      fill="none"
    >
      <rect width="32" height="32" fill="#0A0C0F" />
      <path
        fill="#E85D04"
        d="M20 12h8v8h-8v8h-8V18L4 10l6-6 8 8h2z"
      />
    </svg>
  );
}

export function Logo({
  className = "",
  nameClassName = "font-display text-[15px] font-bold tracking-tight text-paper",
  markClassName = "h-7 w-7 shrink-0",
}: {
  className?: string;
  nameClassName?: string;
  markClassName?: string;
}) {
  return (
    <a href="#top" className={`inline-flex items-center gap-3 ${className}`}>
      <Mark className={markClassName} decorative />
      <span className={nameClassName}>Arbor</span>
    </a>
  );
}
