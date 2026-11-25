interface BansayLogoProps {
  className?: string;
  light?: boolean;
}

export function BansayLogo({ className = "w-8 h-8", light = false }: BansayLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bansayFlame" x1="16" y1="6" x2="48" y2="58" gradientUnits="userSpaceOnUse">
          {light ? (
            <>
              <stop offset="0%" stopColor="#E9D5FF" />
              <stop offset="100%" stopColor="#C4B5FD" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#5B21B6" />
            </>
          )}
        </linearGradient>
      </defs>
      {/* Flame above open book */}
      <path
        d="M32 6C30.2 11.4 25.5 14.8 25.5 20.5C25.5 24.4 28.4 27.5 32 27.5C35.6 27.5 38.5 24.4 38.5 20.5C38.5 17.5 37.2 15.1 35.7 13.4C35.4 16.2 33.8 18.2 31.8 18.2C33.4 14.5 33.5 10.1 32 6Z"
        fill="url(#bansayFlame)"
      />
      {/* Left book wing / facing figure / hand */}
      <path
        d="M11 33.5C11 29.8 14.1 27 17.8 27.4C23.5 28 28.4 31.4 30.8 36.2V53.5C26.4 51.1 21.8 49.4 16.9 48.7C13.5 48.2 11 45.3 11 41.8V33.5Z"
        fill="url(#bansayFlame)"
      />
      {/* Right book wing / facing figure / hand */}
      <path
        d="M53 33.5C53 29.8 49.9 27 46.2 27.4C40.5 28 35.6 31.4 33.2 36.2V53.5C37.6 51.1 42.2 49.4 47.1 48.7C50.5 48.2 53 45.3 53 41.8V33.5Z"
        fill="url(#bansayFlame)"
      />
      {/* Inner heart/book highlight curve */}
      <path
        d="M21 38.5C23.8 38.5 26.8 40.2 28.8 43.2M43 38.5C40.2 38.5 37.2 40.2 35.2 43.2"
        stroke={light ? "#3B1E6D" : "#FFFFFF"}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
