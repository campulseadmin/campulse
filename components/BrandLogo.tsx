import Image from "next/image";

/**
 * Brand logo. Renders the refined, transparent CAMPULSE wordmark so it blends
 * into the pure-black theme. Pass `height` (px) — width scales to keep aspect.
 */
export function BrandLogo({
  height = 28,
  className,
  priority,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/campulse-logo.png"
      alt="CamPulse"
      height={height}
      width={Math.round(height * 2)} // source is 1024x512 -> 2:1
      className={className}
      priority={priority}
      style={{ height, width: "auto" }}
    />
  );
}
