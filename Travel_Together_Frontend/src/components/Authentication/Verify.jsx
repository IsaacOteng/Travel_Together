import React, { useState, useRef, useEffect } from "react";
import signuppic from "../../assets/signup_pic.png";
import { ChevronLeft } from "lucide-react";
import { authApi } from "../../services/api";

const Verify = ({ email = "name@email.com", onVerified, onBack }) => {
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [touched, setTouched] = useState(false);
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
        setTouched(true);
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
        <div className="min-h-screen flex bg-white font-sans">

            {/* LEFT SIDE */}
            <div className="w-full lg:w-[50%] flex flex-col justify-between px-8 py-8">

                {/* Logo */}
                <div>
                    <div className="text-black text-2xl font-normal tracking-tight leading-none">
                        <img src="/src/assets/official_logo_nobg.png" alt="logo" className="absolute lg:top-5 lg:left-2 top-10 left-46 w-15 inline-block" />
                        <img src="/src/assets/ttlogo.png" alt="logo" className="absolute lg:hidden lg:top-5 lg:left-2 top-10 left-33 w-40 inline-block" />
                    </div>
                </div>

                {/* Form Area */}
                <div className="w-full max-w-sm items-center justify-center mx-auto -mt-15">

                    {/* Icon */}
                    <div className="w-12 h-12 rounded-full bg-[#fff4f0] flex items-center justify-center mb-6">
                        <svg className="w-6 h-6 text-[#FF6B35]" fill="none" viewBox="0 0 24 24" stroke="#FF6B35" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-light font-serif text-[#1E3A5F] tracking-tight mb-2">
                        Check your email
                    </h1>
                    <p className="text-sm text-gray-500 mb-7 leading-relaxed">
                        We sent a 6-digit verification code to{" "}
                        <span className="text-[#1E3A5F] font-medium">{email}</span>
                    </p>

                    {/* Code Inputs */}
                    <div
                        className={`flex gap-2.5 mb-4 ${isShaking ? "animate-[shake_1s_ease-in-out]" : ""}`}
                        onPaste={handlePaste}
                        style={isShaking ? { animation: "shake 1s ease-in-out" } : {}}
                    >
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={(current) => (inputRefs.current[index] = current)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className={`w-full aspect-square text-center text-xl font-semibold text-[#1E3A5F] border rounded focus:outline-none focus:ring-2 transition
                                    ${error
                                        ? "border-red-400 focus:ring-red-300 bg-red-50"
                                        : digit
                                            ? "border-[#FF6B35] focus:ring-[#FF6B35]/30 bg-[#fff9f7]"
                                            : "border-gray-300 focus:ring-gray-400 bg-white"
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-red-500 text-xs mb-3">{error}</p>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={!isFilled || loading}
                        className={`w-full py-2.5 text-sm rounded transition font-medium mb-4 ${
                            isFilled && !loading
                                ? "bg-[#FF6B35] text-white hover:bg-[#af370c]"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        {loading ? "Verifying…" : "Verify email"}
                    </button>

                    {/* Resend */}
                    <p className="text-sm text-gray-500 text-center">
                        Didn't receive a code?{" "}
                        {resendCooldown > 0 ? (
                            <span className="text-gray-400">
                                Resend in <span className="font-medium text-[#1E3A5F]">{Math.floor(resendCooldown / 60)}:{String(resendCooldown % 60).padStart(2, "0")}</span>
                            </span>
                        ) : (
                            <button
                                onClick={handleResend}
                                className="text-[#FF6B35] font-medium hover:underline"
                            >
                                Resend code
                            </button>
                        )} 
                    </p>

                

                    {/* Back */}
                    <div className="mt-6 text-center">
                        <button onClick={onBack} className="text-xs text-[#5576a0] hover:text-[#1E3A5F] flex items-center gap-1 mx-auto transition">
                            <ChevronLeft size={14} />
                            Back to login
                        </button>
                    </div>
                </div>

                <div className="text-xs text-[#5576a0] text-center">
                    © {new Date().getFullYear()} Travel Together, Inc.
                </div>
            </div>

            {/* RIGHT SIDE — full-height image */}
            <div
                className="hidden lg:block lg:w-[49%] bg-cover bg-center"
                style={{
                    backgroundImage: `url(${signuppic})`,
                    margin: "12px 12px 12px 0",
                    borderRadius: "12px",
                }}
            />

            {/* Shake keyframe */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
            `}</style>
        </div>
    );
};

export default Verify;