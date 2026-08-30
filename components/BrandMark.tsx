interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 38, className }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 64 64"
      width={size}
    >
      <path
        d="M32 5 53 13v16c0 13.8-8.7 24.4-21 30C19.7 53.4 11 42.8 11 29V13L32 5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
      />
      <circle
        cx="29"
        cy="28"
        fill="none"
        r="9"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="m36 35 10 10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M23 47c1.8-5.1 5.4-8 10.3-8 2 0 3.9.5 5.5 1.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}
