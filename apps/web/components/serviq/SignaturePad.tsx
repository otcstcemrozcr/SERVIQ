"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui";

export function SignatureCanvas({
  value,
  onChange,
  clearLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  clearLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const p = point(event);
    if (!canvas || !p) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0f172a"; // Slate 900
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const p = point(event);
    if (!canvas || !p) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    onChange(canvas.toDataURL("image/png"));
  }

  function stop() {
    drawingRef.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <canvas
        ref={canvasRef}
        width={640}
        height={220}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerLeave={stop}
        style={{
          width: "100%",
          aspectRatio: "16 / 5.5",
          border: "1px dashed #cbd5e1",
          borderRadius: 8,
          background: "#f8fafc",
          touchAction: "none",
          cursor: "crosshair",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button type="button" variant="outline" onClick={clear} disabled={!value}>
          {clearLabel}
        </Button>
      </div>
    </div>
  );
}
