type LogoProps = {
  className?: string;
  /** Hide the Arbor wordmark (mark only). */
  markOnly?: boolean;
};

export function Logo({ className = "h-8 w-8", markOnly = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        className={className}
        viewBox="0 0 32 32"
        aria-hidden={markOnly ? undefined : true}
        role={markOnly ? "img" : undefined}
        aria-label={markOnly ? "Arbor" : undefined}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" fill="#0A0C0F" />
        <path
          fill="#E85D04"
          d="M20 12h8v8h-8v8h-8V18L4 10l6-6 8 8h2z"
        />
      </svg>
      {!markOnly && (
        <span className="select-none text-sm font-bold tracking-tight text-foreground">
          Arbor
        </span>
      )}
    </span>
  );
}
