import { useState, useRef, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { authApi } from "../../services/api";
import AuthLayout, { AuthHeading, AuthButton, AuthError } from "./AuthLayout.jsx";

const Verify = ({ email = "name@email.com", onVerified, onBack }) => {
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(300);
    const [isShaking, setIsShaking] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);
        setError("");

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(""));
            inputRefs.current[5]?.focus();
        }
    };

    const isFilled = code.every((d) => d !== "");

    const handleSubmit = async () => {
        if (!isFilled) {
            setError("Please enter the full 6-digit code.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const { data } = await authApi.verifyOtp(email, code.join(""));
            onVerified?.(data);
        } catch (err) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail || "";
            let msg;

            if (!err.response) {
                msg = "Network error — check your connection and try again.";
            } else if (status === 429 || detail.toLowerCase().includes("too many")) {
                msg = "Too many attempts. Please request a new code.";
                setResendCooldown(0);
            } else if (detail.toLowerCase().includes("expired")) {
                msg = "That code has expired. Request a new one below.";
                setResendCooldown(0);
            } else if (status === 400) {
                msg = "That code is incorrect. Please check and try again.";
            } else {
                msg = "Something went wrong. Please try again.";
            }

            setError(msg);
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 1000);
            setCode(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setCode(["", "", "", "", "", ""]);
        setError("");
        inputRefs.current[0]?.focus();
        try {
            await authApi.sendOtp(email);
            setResendCooldown(300);
        } catch {
            setError("Couldn't resend the code. Please try again.");
        }
    };

    return (
        <AuthLayout>
            <AuthHeading title="Check your email">
                We sent a six-digit code to{" "}
                <span className="font-semibold text-ink">{email}</span>
            </AuthHeading>

            <div
                className="flex gap-2.5"
                onPaste={handlePaste}
                style={isShaking ? { animation: "ttShake 1s ease-in-out" } : undefined}
            >
                {code.map((digit, index) => (
                    <input
                        key={index}
                        ref={(current) => (inputRefs.current[index] = current)}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={digit}
                        aria-label={`Digit ${index + 1} of 6`}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className={`aspect-square w-full rounded-xl border bg-surface text-center font-display text-[22px] font-semibold text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                            error
                                ? "border-accent"
                                : digit
                                    ? "border-accent"
                                    : "border-line focus:border-accent"
                        }`}
                    />
                ))}
            </div>

            {error && <div className="mt-4"><AuthError>{error}</AuthError></div>}

            <div className="mt-6">
                <AuthButton onClick={handleSubmit} disabled={!isFilled || loading}>
                    {loading ? "Verifying…" : "Verify email"}
                </AuthButton>
            </div>

            <p className="mt-6 text-center text-[13.5px] text-ink-soft">
                Didn&apos;t get it?{" "}
                {resendCooldown > 0 ? (
                    <span className="text-ink-mute">
                        Resend in{" "}
                        <span className="font-semibold tabular-nums text-ink">
                            {Math.floor(resendCooldown / 60)}:
                            {String(resendCooldown % 60).padStart(2, "0")}
                        </span>
                    </span>
                ) : (
                    <button
                        onClick={handleResend}
                        className="cursor-pointer border-none bg-transparent p-0 font-semibold text-accent underline-offset-2 hover:underline"
                    >
                        Resend code
                    </button>
                )}
            </p>

            <button
                onClick={onBack}
                className="mx-auto mt-7 flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] text-ink-mute transition-colors hover:text-accent"
            >
                <ChevronLeft size={14} />
                Use a different email
            </button>
        </AuthLayout>
    );
};

export default Verify;
