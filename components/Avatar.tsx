import { avatarColor } from "@/app/dashboard/feed";

/**
 * Avatar: shows the user's uploaded photo when present, otherwise a colored
 * initial circle (the existing CamPulse style). Used everywhere a face appears.
 */
export function Avatar({
  src,
  name,
  size = 40,
  className,
  ring,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
    flex: "0 0 auto",
  };
  if (ring) style.border = "3px solid var(--bg)";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={className}
        style={{ ...style, objectFit: "cover", borderRadius: "9999px" }}
      />
    );
  }

  return (
    <div
      className={`tw-avatar ${className || ""}`}
      style={{ ...style, background: avatarColor(name), borderRadius: "9999px" }}
    >
      {initial}
    </div>
  );
}
