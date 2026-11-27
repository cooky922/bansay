interface BansayLogoProps {
  className?: string;
  light?: boolean;
}

export function BansayLogo({
  className = "h-8 w-8",
  light = false,
}: BansayLogoProps) {
  return (
    <img
      src={light ? "/logo-white.svg" : "/logo-purple-gradient.svg"}
      className={className}
      alt=""
      aria-hidden="true"
    />
  );
}
