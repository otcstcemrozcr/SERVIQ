"use client";

import { useState, useRef, useEffect, type FormEvent, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  Target, 
  Shield, 
  RefreshCw, 
  Zap, 
  Smartphone, 
  Monitor, 
  Lock, 
  Info
} from "lucide-react";

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
      setError(err.message || "Doğrulama kodu gönderilemedi.");
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

  // --- OTP Input Logic ---
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
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
    <div className="sf-page-wrapper">
      {/* Left Banner: Marketing & Value Props */}
      <div className="sf-left-banner">
        {/* Subtle glowing mesh shapes in the background */}
        <div className="sf-banner-glow-1" />
        <div className="sf-banner-glow-2" />
        
        <div className="sf-left-content">
          <div className="sf-brand-logo">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#60a5fa" }}>
              <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A5 5 0 0 0 5 13c0 .34.03.68.1 1a4.5 4.5 0 0 0 1.9 8" />
              <path d="M12 12v9" />
              <path d="m9 18 3 3 3-3" />
            </svg>
            <span className="sf-brand-name">ServiQ <span className="sf-brand-accent">AI</span></span>
          </div>

          <div className="sf-marketing-hero">
            <h2 className="sf-hero-title">
              Saha ekipleri için modern servis otomasyonu.
            </h2>
            <p className="sf-hero-subtitle">
              İş emirlerinden faturalandırmaya kadar tüm süreci yapay zeka desteğiyle yönetin, operasyonel riskleri minimuma indirin.
            </p>

            <div className="sf-features-list">
              <div className="sf-feature-item">
                <div className="sf-feature-icon-wrapper">
                  <Activity size={20} color="#60a5fa" />
                </div>
                <div className="sf-feature-text">
                  <h3 className="sf-feature-title">Servis durumunu anında görün</h3>
                  <p className="sf-feature-desc">İş emirleri, SLA süreleri ve risk seviyeleri 60 saniyede elinizin altında.</p>
                </div>
              </div>

              <div className="sf-feature-item">
                <div className="sf-feature-icon-wrapper">
                  <Target size={20} color="#60a5fa" />
                </div>
                <div className="sf-feature-text">
                  <h3 className="sf-feature-title">Verimliliğe odaklanın</h3>
                  <p className="sf-feature-desc">Yapay zeka asistanı verilerinizi analiz eder ve atılacak en doğru adımları önerir.</p>
                </div>
              </div>

              <div className="sf-feature-item">
                <div className="sf-feature-icon-wrapper">
                  <Shield size={20} color="#60a5fa" />
                </div>
                <div className="sf-feature-text">
                  <h3 className="sf-feature-title">Kurumsal seviyede güvenlik</h3>
                  <p className="sf-feature-desc">Rol bazlı yetkilendirme ve ERP senkronizasyonu ile tam uyumlu altyapı.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="sf-banner-footer">
            &copy; 2026 SERVIQ AI · Saha Servis Yönetimi Platformu
          </div>
        </div>
      </div>

      {/* Right side: Salesforce-style Login card */}
      <div className="sf-right-panel">
        <div className="sf-login-card-container">
          <div className="sf-login-card">
            {/* Cloud Brand Logo for card top */}
            <div className="sf-card-logo">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#0176d3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sf-cloud-icon">
                <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.07-1.22.2A5 5 0 0 0 5 13c0 .34.03.68.1 1a4.5 4.5 0 0 0 1.9 8" />
                <path d="M12 12v9" />
                <path d="m9 18 3 3 3-3" />
              </svg>
              <h1 className="sf-card-title">ServiQ Giriş</h1>
            </div>

            {/* Role Tab Selector (SLDS Lightning Tab Style) */}
            <div className="sf-tabs-nav">
              <button
                type="button"
                className={`sf-tab-btn ${role === "technician" ? "active" : ""}`}
                onClick={() => setRole("technician")}
              >
                <Smartphone size={16} />
                <span>Saha Teknisyeni</span>
              </button>
              <button
                type="button"
                className={`sf-tab-btn ${role === "backoffice" ? "active" : ""}`}
                onClick={() => setRole("backoffice")}
              >
                <Monitor size={16} />
                <span>Back Ofis</span>
              </button>
            </div>

            {error && (
              <div className="sf-error-alert">
                <Info size={16} className="sf-error-icon" />
                <div className="sf-error-message">{error}</div>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSendOtp} className="sf-form">
                <div className="sf-form-group">
                  <label htmlFor="email" className="sf-form-label">
                    Kullanıcı Adı veya E-posta
                  </label>
                  <div className="sf-input-wrapper">
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ad.soyad@serviq.app"
                      className="sf-form-input"
                    />
                  </div>
                </div>

                <div className="sf-form-options">
                  <label className="sf-checkbox-label">
                    <input type="checkbox" defaultChecked className="sf-checkbox" />
                    <span>Beni Hatırla</span>
                  </label>
                  <a href="#" className="sf-form-link" onClick={(e) => e.preventDefault()}>
                    Şifremi Unuttum?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="sf-btn-primary"
                >
                  {loading ? "Bağlanıyor..." : "İleri"}
                </button>

                <div className="sf-divider">
                  <span className="sf-divider-text">veya</span>
                </div>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading}
                  className="sf-btn-secondary"
                >
                  <Zap size={15} className="sf-zap-icon" />
                  <span>Sandbox / Demo Ortamı Girişi</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="sf-form">
                <div className="sf-form-group">
                  <div className="sf-otp-header">
                    <label className="sf-form-label">Tek Kullanımlık Şifre (OTP)</label>
                    <span className="sf-otp-email">
                      {email}{" "}
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="sf-change-email-btn"
                      >
                        (Değiştir)
                      </button>
                    </span>
                  </div>

                  <div className="sf-otp-info-box">
                    <Lock size={14} className="sf-lock-icon" />
                    <span>Test ortamı giriş kodu: <strong>123456</strong></span>
                  </div>

                  <div className="sf-otp-inputs-row">
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
                        className="sf-otp-input"
                        onFocus={(e) => e.target.select()}
                      />
                    ))}
                  </div>
                </div>

                <div className="sf-otp-resend-row">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={timeLeft > 0 || loading}
                    className="sf-resend-btn"
                  >
                    <RefreshCw size={12} className={loading && timeLeft === 0 ? "animate-spin" : ""} />
                    {timeLeft > 0 ? `${timeLeft} sn sonra kodu tekrar gönder` : "Kodu Yeniden Gönder"}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join("").length !== 6}
                  className="sf-btn-primary"
                >
                  {loading ? "Doğrulanıyor..." : "Giriş Yap"}
                </button>
              </form>
            )}
          </div>

          {/* Salesforce style footer links below card */}
          <div className="sf-card-footer-links">
            <a href="#" className="sf-footer-link" onClick={(e) => e.preventDefault()}>Özel Alan Adı Kullan</a>
            <span className="sf-footer-dot">•</span>
            <a href="#" className="sf-footer-link" onClick={(e) => e.preventDefault()}>Yardım al</a>
            <span className="sf-footer-dot">•</span>
            <a href="#" className="sf-footer-link" onClick={(e) => e.preventDefault()}>Güvenlik Bildirimi</a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .sf-page-wrapper {
          display: flex;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #f3f5f9;
        }

        /* Left side banner styling */
        .sf-left-banner {
          flex: 1.1;
          background: linear-gradient(135deg, #09152b 0%, #0176d3 100%);
          color: #ffffff;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 64px;
        }

        .sf-banner-glow-1 {
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%);
          top: -100px;
          left: -100px;
          pointer-events: none;
        }

        .sf-banner-glow-2 {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%);
          bottom: -200px;
          right: -100px;
          pointer-events: none;
        }

        .sf-left-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: space-between;
        }

        .sf-brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sf-brand-name {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .sf-brand-accent {
          color: #60a5fa;
        }

        .sf-marketing-hero {
          max-width: 540px;
          margin-top: 10vh;
          margin-bottom: auto;
        }

        .sf-hero-title {
          font-size: 42px;
          font-weight: 700;
          line-height: 1.15;
          margin: 0 0 20px 0;
          letter-spacing: -0.02em;
        }

        .sf-hero-subtitle {
          font-size: 17px;
          color: #93c5fd;
          line-height: 1.6;
          margin: 0 0 48px 0;
          font-weight: 400;
        }

        .sf-features-list {
          display: grid;
          gap: 28px;
        }

        .sf-feature-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          padding: 18px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }

        .sf-feature-item:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .sf-feature-icon-wrapper {
          background: rgba(96, 165, 250, 0.12);
          border: 1px solid rgba(96, 165, 250, 0.2);
          padding: 10px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sf-feature-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sf-feature-title {
          font-weight: 600;
          font-size: 15px;
          margin: 0;
          color: #ffffff;
        }

        .sf-feature-desc {
          color: #93c5fd;
          font-size: 13.5px;
          margin: 0;
          line-height: 1.4;
        }

        .sf-banner-footer {
          font-size: 12px;
          color: #93c5fd;
          opacity: 0.8;
          margin-top: 40px;
        }

        /* Right side panel styling */
        .sf-right-panel {
          flex: 0.9;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background-color: #f3f5f9;
        }

        .sf-login-card-container {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sf-login-card {
          background: #ffffff;
          border: 1px solid #dddbda;
          border-radius: 6px;
          padding: 40px 32px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        }

        .sf-card-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 28px;
        }

        .sf-cloud-icon {
          filter: drop-shadow(0 2px 4px rgba(1, 118, 211, 0.15));
        }

        .sf-card-title {
          font-size: 24px;
          font-weight: 700;
          color: #16325c;
          margin: 0;
        }

        /* Salesforce Lightning Tab styling */
        .sf-tabs-nav {
          display: flex;
          background: #f3f5f8;
          border: 1px solid #dddbda;
          border-radius: 4px;
          padding: 3px;
          margin-bottom: 24px;
        }

        .sf-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 3px;
          border: none;
          background: transparent;
          color: #514f4d;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sf-tab-btn:hover {
          color: #0176d3;
          background: rgba(1, 118, 211, 0.04);
        }

        .sf-tab-btn.active {
          background: #ffffff;
          color: #0176d3;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        /* Error alert styling */
        .sf-error-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #fff0f0;
          border-left: 4px solid #c23934;
          border-top: 1px solid #ffd5d5;
          border-right: 1px solid #ffd5d5;
          border-bottom: 1px solid #ffd5d5;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .sf-error-icon {
          color: #c23934;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .sf-error-message {
          color: #c23934;
          font-size: 13px;
          line-height: 1.4;
        }

        /* Form elements styling */
        .sf-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sf-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sf-form-label {
          font-size: 12px;
          font-weight: 600;
          color: #3e3e3c;
          text-transform: none;
        }

        .sf-form-input {
          width: 100%;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 10px 14px;
          font-size: 14px;
          color: #080f1e;
          transition: all 0.15s ease;
          outline: none;
        }

        .sf-form-input:focus {
          border-color: #0176d3;
          box-shadow: 0 0 0 3px rgba(1, 118, 211, 0.15);
        }

        .sf-form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .sf-checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #3e3e3c;
          cursor: pointer;
          user-select: none;
        }

        .sf-checkbox {
          width: 15px;
          height: 15px;
          accent-color: #0176d3;
          cursor: pointer;
        }

        .sf-form-link {
          color: #0176d3;
          text-decoration: none;
          font-weight: 500;
        }

        .sf-form-link:hover {
          text-decoration: underline;
        }

        /* Buttons styling */
        .sf-btn-primary {
          background: #0176d3;
          color: #ffffff;
          border: 1px solid transparent;
          border-radius: 4px;
          padding: 12px 24px;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: background-color 0.15s ease;
          outline: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .sf-btn-primary:hover:not(:disabled) {
          background: #005fb2;
        }

        .sf-btn-primary:active:not(:disabled) {
          background: #014b97;
        }

        .sf-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .sf-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
        }

        .sf-divider::before,
        .sf-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #dddbda;
        }

        .sf-divider-text {
          font-size: 12px;
          color: #8a8683;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .sf-btn-secondary {
          background: #ffffff;
          color: #0176d3;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 12px 24px;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.15s ease;
          outline: none;
        }

        .sf-btn-secondary:hover:not(:disabled) {
          background: #f4f6f9;
          border-color: #0176d3;
        }

        .sf-zap-icon {
          fill: #eab308;
          color: #eab308;
        }

        /* OTP verify mode styling */
        .sf-otp-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 4px;
        }

        .sf-otp-email {
          font-size: 12.5px;
          color: #514f4d;
        }

        .sf-change-email-btn {
          background: none;
          border: none;
          color: #0176d3;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          font-size: 12.5px;
          font-weight: 500;
        }

        .sf-otp-info-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #eef1f6;
          border: 1px dashed #b9c3d5;
          padding: 10px 14px;
          border-radius: 4px;
          font-size: 13px;
          color: #514f4d;
          margin-bottom: 18px;
        }

        .sf-lock-icon {
          color: #0176d3;
          flex-shrink: 0;
        }

        .sf-otp-inputs-row {
          display: flex;
          gap: 8px;
          justify-content: space-between;
        }

        .sf-otp-input {
          width: 46px;
          height: 52px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          color: #080f1e;
          outline: none;
          transition: all 0.15s ease;
        }

        .sf-otp-input:focus {
          border-color: #0176d3;
          box-shadow: 0 0 0 3px rgba(1, 118, 211, 0.15);
        }

        .sf-otp-resend-row {
          display: flex;
          justify-content: center;
          margin-top: -8px;
          margin-bottom: 4px;
        }

        .sf-resend-btn {
          background: none;
          border: none;
          color: #0176d3;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .sf-resend-btn:disabled {
          color: #8a8683;
          cursor: not-allowed;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        /* Footer links styling */
        .sf-card-footer-links {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
        }

        .sf-footer-link {
          color: #514f4d;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .sf-footer-link:hover {
          color: #0176d3;
          text-decoration: underline;
        }

        .sf-footer-dot {
          color: #8a8683;
        }

        /* Responsive */
        @media (max-width: 950px) {
          .sf-page-wrapper {
            flex-direction: column;
          }
          .sf-left-banner {
            flex: none;
            padding: 40px 24px;
            min-height: auto;
          }
          .sf-marketing-hero {
            margin-top: 30px;
          }
          .sf-hero-title {
            font-size: 30px;
          }
          .sf-hero-subtitle {
            margin-bottom: 24px;
          }
          .sf-right-panel {
            flex: none;
            width: 100%;
            padding: 32px 16px;
          }
        }
      `}</style>
    </div>
  );
}
