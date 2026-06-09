"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Button, colors } from "@/components/ui";
import { Eraser, PenTool } from "lucide-react";

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
    ctx.strokeStyle = colors.primary; // Dark blue/primary
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ 
        position: "relative",
        border: `2px dashed ${value ? colors.primary : colors.border}`, 
        borderRadius: 12, 
        background: value ? "#f8fafc" : colors.soft,
        overflow: "hidden"
      }}>
        {!value && (
          <div style={{ 
            position: "absolute", 
            top: "50%", 
            left: "50%", 
            transform: "translate(-50%, -50%)", 
            pointerEvents: "none", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: 8, 
            color: colors.muted,
            opacity: 0.5 
          }}>
            <PenTool size={32} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Buraya İmzalayın</span>
          </div>
        )}
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
            touchAction: "none",
            cursor: "crosshair",
            display: "block"
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button type="button" variant="outline" onClick={clear} disabled={!value} style={{ background: "#fff", color: colors.danger, borderColor: value ? colors.danger : colors.border }}>
          <Eraser size={16} />
          {clearLabel}
        </Button>
      </div>
    </div>
  );
}
