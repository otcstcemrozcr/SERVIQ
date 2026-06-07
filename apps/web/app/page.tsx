"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, TextInput } from "@/components/ui";
import { Activity, Target, Building2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate login delay
    setTimeout(() => {
      router.push("/serviq");
    }, 600);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Left Side: Dark Info Panel */}
      <div 
        style={{ 
          flex: 1, 
          background: "#0b1120", 
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: "48px 64px"
        }}
      >
        {/* Subtle dot pattern background */}
        <div style={{ 
          position: "absolute", 
          inset: 0, 
          opacity: 0.1, 
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", 
          backgroundSize: "24px 24px" 
        }} />

        <div style={{ position: "relative", zIndex: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.04em", fontFamily: "Inter, system-ui, sans-serif" }}>
            ServiQ <span style={{ color: "#3b82f6", fontWeight: 700 }}>AI</span>
          </h1>

          <div style={{ marginTop: "12vh", maxWidth: 480 }}>
            <h2 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.2, margin: "0 0 20px 0" }}>
              The service engine for modern field teams.
            </h2>
            <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, margin: "0 0 48px 0" }}>
              Dispatch to closed-won, with an AI assistant watching the numbers so your team can focus on resolving issues.
            </p>

            <div style={{ display: "grid", gap: 32 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: 10, borderRadius: 8 }}>
                  <Activity size={20} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>See service at a glance</div>
                  <div style={{ color: "#94a3b8", fontSize: 14 }}>Work orders, SLAs and risk — understood in 60 seconds.</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: 10, borderRadius: 8 }}>
                  <Target size={20} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Focus on what wins</div>
                  <div style={{ color: "#94a3b8", fontSize: 14 }}>Grounded insights and next actions, straight from your data.</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: 10, borderRadius: 8 }}>
                  <Building2 size={20} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Enterprise-grade & multi-tenant</div>
                  <div style={{ color: "#94a3b8", fontSize: 14 }}>Org-scoped data with role-based access from day one.</div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ position: "absolute", bottom: 0, left: 0, fontSize: 12, color: "#64748b" }}>
            &copy; 2026 SERVIQ AI · Field Operations
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div style={{ flex: 1, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "32px 24px", background: "#fff", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>Sign in</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px 0" }}>Welcome back. Enter your credentials.</p>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#334155", marginBottom: 6 }}>Email</label>
                <TextInput 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="emirozcira@gmail.com" 
                  style={{ width: "100%", background: "#eff6ff" }} 
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#334155", marginBottom: 6 }}>Password</label>
                <TextInput 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ width: "100%", background: "#eff6ff" }} 
                />
              </div>
              
              <Button type="submit" variant="primary" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#64748b" }}>
              New to ServiQ AI? <a href="#" style={{ color: "#3b82f6", textDecoration: "none" }}>Create an organization</a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          div[style*="minHeight"] {
            flex-direction: column;
          }
          div[style*="flex: 1"] {
            flex: none;
            width: 100%;
          }
          div[style*="background: #0b1120"] {
            padding: 32px 24px;
            min-height: 400px;
          }
        }
      `}</style>
    </div>
  );
}
