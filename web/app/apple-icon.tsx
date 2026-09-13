import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#0A0C0F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 32 32">
          <path
            fill="#E85D04"
            d="M20 12h8v8h-8v8h-8V18L4 10l6-6 8 8h2z"
          />
        </svg>
      </div>
    ),
    size,
  );
}
