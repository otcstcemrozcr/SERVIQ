"use client";

import { useState, useRef, useEffect, type FormEvent, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, TextInput } from "@/components/ui";
import { Activity, Target, Building2, RefreshCw, Zap } from "lucide-react";

import { sendOtp, verifyOtp } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<1 | 2>(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState<"technician" | "backoffice">("technician");

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendOtp(email);
      setStep(2);
      setTimeLeft(60);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    const finalCode = otp.join("");
    if (finalCode.length !== 6) {
      setError("Lütfen 6 haneli kodu eksiksiz girin.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await verifyOtp(email, finalCode);
      if (res.api_key) {
        localStorage.setItem("serviq_api_key", res.api_key);
        localStorage.setItem("serviq_dashboard_view_mode", role);
        router.push(role === "technician" ? "/serviq" : "/serviq/dashboard");
      } else {
        setError("Sunucudan geçersiz yanıt alındı.");
      }
    } catch (err: any) {
      setError(err.message || "Geçersiz veya süresi dolmuş kod.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setLoading(true);
    setError("");
    try {
      // Create a dummy successful state directly for the demo
      const res = await verifyOtp("demo@serviq.app", "123456");
      if (res.api_key) {
        localStorage.setItem("serviq_api_key", res.api_key);
        localStorage.setItem("serviq_dashboard_view_mode", role);
        router.push(role === "technician" ? "/serviq" : "/serviq/dashboard");
      } else {
        setError("Sunucudan geçersiz yanıt alındı.");
      }
    } catch (err: any) {
      setError(err.message || "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  // --- OTP Input Mantığı ---
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) return; // Sadece tek karakter
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Bir sonraki kutuya geç
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Önceki kutuya geri dön
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || "";
      }
      setOtp(newOtp);
      // Odaklanacak son kutuyu bul
      const lastFilledIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  }

  async function handleResend() {
    if (timeLeft > 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      await sendOtp(email);
      setTimeLeft(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Kod yeniden gönderilemedi.");
    } finally {
      setLoading(false);
    }
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
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 4px 0" }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Sign in</h2>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px 0" }}>
              {role === "technician" 
                ? "Saha teknisyeni hesabınıza erişmek için bilgilerinizi girin." 
                : "Back Ofis yönetici hesabınıza erişmek için bilgilerinizi girin."}
            </p>

            {/* Role Selector Segmented Control */}
            <div style={{ 
              display: "flex", 
              background: "#f1f5f9", 
              borderRadius: "8px", 
              padding: "4px", 
              marginBottom: 24,
              border: "1px solid #e2e8f0"
            }}>
              <button
                type="button"
                onClick={() => setRole("technician")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: role === "technician" ? "#ffffff" : "transparent",
                  color: role === "technician" ? "#1e293b" : "#64748b",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: role === "technician" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <span>📱</span> Saha Teknisyeni
              </button>
              <button
                type="button"
                onClick={() => setRole("backoffice")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: role === "backoffice" ? "#ffffff" : "transparent",
                  color: role === "backoffice" ? "#1e293b" : "#64748b",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: role === "backoffice" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <span>💻</span> Back Ofis
              </button>
            </div>

            {error && <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "10px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>{error}</div>}

            {step === 1 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#334155", marginBottom: 6 }}>Email</label>
                    <TextInput 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="ornek@sirket.com" 
                      style={{ width: "100%", background: "#eff6ff" }} 
                    />
                  </div>
                  
                  <Button type="submit" variant="primary" style={{ width: "100%", marginTop: 8 }} disabled={loading || !email}>
                    {loading ? "Gönderiliyor..." : "Devam Et"}
                  </Button>
                </form>

                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                  <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>VEYA</span>
                  <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                </div>

                <Button 
                  type="button" 
                  onClick={handleDemoLogin} 
                  disabled={loading} 
                  style={{ width: "100%", background: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1", padding: "12px", display: "flex", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 600 }}
                >
                  <Zap size={18} color="#eab308" style={{ fill: "#eab308" }} />
                  Tek Tıkla Demo Girişi
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#334155" }}>
                      6 Haneli Doğrulama Kodu
                    </label>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      {email} <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", padding: 0, textDecoration: "underline" }}>(Değiştir)</button>
                    </span>
                  </div>
                  
                  <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 6, border: "1px dashed #cbd5e1", fontSize: 13, color: "#64748b", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Test ve demo ortamı şifresi:</span>
                    <strong style={{ fontSize: 14, color: "#0f172a", letterSpacing: 2 }}>123456</strong>
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={handleOtpPaste}
                        style={{
                          width: "48px",
                          height: "56px",
                          background: "#eff6ff",
                          border: `1px solid ${digit ? "#3b82f6" : "#cbd5e1"}`,
                          borderRadius: "8px",
                          textAlign: "center",
                          fontSize: "24px",
                          fontWeight: 600,
                          color: "#0f172a",
                          outline: "none",
                          boxShadow: digit ? "0 0 0 2px rgba(59,130,246,0.1)" : "none",
                          transition: "all 0.2s ease"
                        }}
                        onFocus={(e) => e.target.select()}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", marginTop: -4 }}>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={timeLeft > 0 || loading}
                    style={{
                      background: "none",
                      border: "none",
                      color: timeLeft > 0 ? "#94a3b8" : "#3b82f6",
                      cursor: timeLeft > 0 ? "not-allowed" : "pointer",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 500
                    }}
                  >
                    <RefreshCw size={14} className={loading && timeLeft === 0 ? "animate-spin" : ""} />
                    {timeLeft > 0 ? `${timeLeft} saniye sonra tekrar gönder` : "Kodu Tekrar Gönder"}
                  </button>
                </div>
                
                <Button type="submit" variant="primary" style={{ width: "100%", marginTop: 4 }} disabled={loading || otp.join("").length !== 6}>
                  {loading ? "Doğrulanıyor..." : "Giriş Yap"}
                </Button>
              </form>
            )}

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
