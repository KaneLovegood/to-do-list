"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

type AuthMode = "login" | "register";
type AuthStep = "credentials" | "otp";

export default function AuthModal() {
  const { register, verifyRegistration, login, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(
      () => setResendCooldown((current) => current - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const resetFeedback = () => {
    setError("");
    setMessage("");
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStep("credentials");
    setOtp("");
    setPassword("");
    setPasswordConfirmation("");
    resetFeedback();
  };

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();

    if (mode === "register" && password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result =
      mode === "login"
        ? await login(email, password)
        : await register(email, password, passwordConfirmation);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    if (mode === "register") {
      setMessage(result.message);
      setStep("otp");
      setResendCooldown(60);
    }
  };

  const handleVerifyRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    resetFeedback();
    setIsSubmitting(true);
    const result = await verifyRegistration(email, otp);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setMode("login");
    setStep("credentials");
    setOtp("");
    setPassword("");
    setPasswordConfirmation("");
    setMessage(result.message);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    resetFeedback();
    setIsSubmitting(true);
    const result = await register(email, password, passwordConfirmation);
    setIsSubmitting(false);

    if (result.success) {
      setMessage("A new verification code has been sent.");
      setResendCooldown(60);
    } else {
      setError(result.message);
    }
  };

  const isRegistering = mode === "register";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden bg-[#faf7f2] border border-[#f2eaea] rounded-2xl shadow-2xl p-8 flex flex-col gap-6 animate-scale-up">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#f87777]" />

        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#f87777] text-white font-semibold text-2xl shadow-inner mb-2">
            v
          </div>
          <h2 className="text-2xl font-bold text-[#11110f] tracking-tight">
            {step === "otp"
              ? "Verify Your Email"
              : isRegistering
                ? "Create Your Account"
                : "Welcome Back"}
          </h2>
          <p className="text-sm text-[#696563]">
            {step === "otp"
              ? `We sent a 6-digit code to ${email}`
              : isRegistering
                ? "Register with your email and a secure password."
                : "Log in to access your tasks."}
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
            {message}
          </div>
        )}

        {step === "credentials" ? (
          <form onSubmit={handleCredentials} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-[#11110f] uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 text-sm text-[#11110f] bg-[#f2eaea]/50 border border-[#f2eaea] rounded-xl outline-none focus:border-[#f87777] focus:ring-2 focus:ring-[#f87777]/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-[#11110f] uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={isRegistering ? 8 : 1}
                maxLength={128}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                placeholder={isRegistering ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 text-sm text-[#11110f] bg-[#f2eaea]/50 border border-[#f2eaea] rounded-xl outline-none focus:border-[#f87777] focus:ring-2 focus:ring-[#f87777]/20 transition-all"
              />
            </div>

            {isRegistering && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password-confirmation" className="text-xs font-semibold text-[#11110f] uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  id="password-confirmation"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 text-sm text-[#11110f] bg-[#f2eaea]/50 border border-[#f2eaea] rounded-xl outline-none focus:border-[#f87777] focus:ring-2 focus:ring-[#f87777]/20 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-sm font-semibold text-white bg-[#f87777] hover:bg-[#f65a5a] active:bg-[#e05252] rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? isRegistering
                  ? "Creating account..."
                  : "Logging in..."
                : isRegistering
                  ? "Create Account"
                  : "Log In"}
            </button>

            <button
              type="button"
              onClick={() => switchMode(isRegistering ? "login" : "register")}
              disabled={isSubmitting}
              className="text-xs font-medium text-[#696563] hover:text-[#f87777] transition-colors"
            >
              {isRegistering
                ? "Already have an account? Log in"
                : "Need an account? Register"}
            </button>

            <div className="relative flex items-center justify-center my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#f2eaea]" />
              </div>
              <span className="relative px-3 text-xs text-[#696563] bg-[#faf7f2] uppercase">
                or
              </span>
            </div>

            <button
              type="button"
              onClick={continueAsGuest}
              disabled={isSubmitting}
              className="w-full py-3 text-sm font-semibold text-[#11110f] bg-white border border-[#f2eaea] hover:bg-[#f2eaea]/30 rounded-xl transition-all"
            >
              Continue as Guest
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyRegistration} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="otp" className="text-xs font-semibold text-[#11110f] uppercase tracking-wider">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                disabled={isSubmitting}
                className="w-full px-4 py-3 text-center text-lg font-mono tracking-[0.5em] text-[#11110f] bg-[#f2eaea]/50 border border-[#f2eaea] rounded-xl outline-none focus:border-[#f87777] focus:ring-2 focus:ring-[#f87777]/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-sm font-semibold text-white bg-[#f87777] hover:bg-[#f65a5a] active:bg-[#e05252] rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </button>

            <div className="flex items-center justify-between text-xs text-[#696563] mt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  resetFeedback();
                }}
                className="hover:text-[#11110f] font-medium transition-colors"
              >
                Back to registration
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isSubmitting}
                className="hover:text-[#f87777] font-medium transition-colors disabled:opacity-50 disabled:hover:text-[#696563]"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
