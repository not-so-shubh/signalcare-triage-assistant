export type LogoMarkProps = {
  size?: number;
  variant?: "default" | "inverse" | "iconOnly";
};

export default function LogoMark({ size = 44, variant = "default" }: LogoMarkProps) {
  const isInverse = variant === "inverse";
  const isDecorative = variant === "iconOnly";
  const shell = isInverse ? "#F7F3EA" : "#171717";
  const inner = isInverse ? "#171717" : "#F7F3EA";
  const accent = "#2E7D5B";
  const signalNode = "#D92D20";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      className="logo-mark"
      role={isDecorative ? undefined : "img"}
      aria-label={isDecorative ? undefined : "SignalCare pulse-shield brand mark"}
      aria-hidden={isDecorative ? "true" : undefined}
      focusable="false"
    >
      <path
        d="M22 3.8C27.8 7.1 32.9 8.2 38.2 8.8V20.4C38.2 29.7 32.1 37.2 22 41.1C11.9 37.2 5.8 29.7 5.8 20.4V8.8C11.1 8.2 16.2 7.1 22 3.8Z"
        fill={shell}
      />
      <path
        d="M22 8.7C26.4 11 30.3 12 34.5 12.5V20.7C34.5 27.5 30.2 32.6 22 35.8C13.8 32.6 9.5 27.5 9.5 20.7V12.5C13.7 12 17.6 11 22 8.7Z"
        fill="none"
        stroke={inner}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M13.2 22.8H17.7L19.5 18.3L23.6 28.3L25.8 22.8H30.4"
        fill="none"
        stroke={accent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <circle cx="31.8" cy="22.8" r="2.2" fill={signalNode} stroke={inner} strokeWidth="1" />
    </svg>
  );
}
