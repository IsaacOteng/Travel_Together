import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import signuppic from "../../assets/signup_pic.png";
import { authApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { auth, googleProvider } from "../../services/firebase";

export default function SignUp({ onVerify }) {
    const { login } = useAuth();

    const [email,         setEmail]         = useState("");
    const [touched,       setTouched]       = useState(false);
    const [loading,       setLoading]       = useState(false);
    const [apiError,      setApiError]      = useState("");
    const [googleLoading, setGoogleLoading] = useState(false);
    const [socialError,   setSocialError]   = useState("");

    const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const isValid = validateEmail(email);

    /* ── Google popup sign-in ───────────────────────────────────────── */
    const handleSocialSignIn = async (provider) => {
        setSocialError("");
        setGoogleLoading(true);
        try {
            const result   = await signInWithPopup(auth, provider);
            const idToken  = await result.user.getIdToken();
            const { data } = await authApi.firebaseAuth(idToken);
            await login(data);
        } catch (err) {
            if (err.code === "auth/popup-closed-by-user" ||
                err.code === "auth/cancelled-popup-request") {
                setGoogleLoading(false);
                return;
            }
            if (import.meta.env.DEV) console.error("[Google sign-in error]", err?.response?.data || err);
            setSocialError("Sign-in failed. Please try again.");
            setGoogleLoading(false);
        }
    };

    /* ── Email OTP handler ──────────────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setTouched(true);
        if (!isValid) return;
        setLoading(true);
        setApiError("");
        try {
            await authApi.sendOtp(email);
            onVerify?.(email);
        } catch (err) {
            setApiError(err.response?.data?.detail || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans">

            {/* LEFT */}
            <div className="w-full lg:w-[50%] flex flex-col justify-between px-8 py-8">

                {/* Logo */}
                <div>
                    <img src="/src/assets/official_logo_nobg.png" alt="logo"
                        className="absolute lg:top-5 lg:left-2 top-10 left-46 w-15 inline-block" />
                    <img src="/src/assets/ttlogo.png" alt="logo"
                        className="absolute lg:hidden top-10 left-33 w-40 inline-block" />
                </div>

                {/* Form */}
                <div className="w-full max-w-sm mx-auto -mt-15">
                    <h1 className="text-3xl font-light font-serif text-[#1E3A5F] tracking-tight mb-7">
                        Log in or sign up
                    </h1>

                    {/* ── Google ── */}
                    <button
                        type="button"
                        onClick={() => handleSocialSignIn(googleProvider)}
                        disabled={googleLoading}
                        className="w-full border border-[#FF6B35] text-sm text-[#FF6B35] py-2.5 px-4 mb-5 flex items-center justify-center gap-3 hover:bg-[#1E3A5F] hover:text-white hover:border-[#1E3A5F] transition rounded disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {googleLoading ? (
                            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        ) : (
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg"
                                alt="" className="w-4 h-4" />
                        )}
                        {googleLoading ? "Signing in…" : "Continue with Google"}
                    </button>

                    {/* Social error */}
                    {socialError && (
                        <p className="text-red-500 text-xs mb-4 text-center">{socialError}</p>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-4 mb-5">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-gray-400 text-xs">OR</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Email */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                            <input
                                type="email"
                                placeholder="name@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => setTouched(true)}
                                className={`w-full border text-sm px-3 py-2.5 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 transition ${
                                    touched && !isValid && email
                                        ? "border-red-400 focus:ring-red-300"
                                        : "border-gray-300"
                                }`}
                            />
                            {touched && !isValid && email && (
                                <p className="text-red-500 text-xs mt-1">Enter a valid email address</p>
                            )}
                        </div>

                        {apiError && <p className="text-red-500 text-xs">{apiError}</p>}

                        <button
                            type="submit"
                            disabled={!email || loading}
                            className={`w-full py-2.5 text-sm rounded transition font-medium ${
                                email && isValid && !loading
                                    ? "bg-[#FF6B35] text-white hover:bg-[#af370c]"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                        >
                            {loading ? "Sending…" : "Continue with email"}
                        </button>
                    </form>
                </div>

                <div className="text-xs text-[#5576a0] text-center">
                    © {new Date().getFullYear()} Travel Together, Inc.
                </div>
            </div>

            {/* RIGHT — image */}
            <div
                className="hidden lg:block lg:w-[49%] bg-cover bg-center"
                style={{
                    backgroundImage: `url(${signuppic})`,
                    margin: "12px 12px 12px 0",
                    borderRadius: "12px",
                }}
            />
        </div>
    );
}
