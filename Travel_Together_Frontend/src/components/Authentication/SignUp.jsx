import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { authApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { auth, googleProvider } from "../../services/firebase";
import AuthLayout, { AuthHeading, AuthButton, AuthError } from "./AuthLayout.jsx";

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
    const showEmailError = touched && email && !isValid;

    /* ── Google popup sign-in ───────────────────────────────────── */
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
        <AuthLayout>
            <AuthHeading title="Log in or sign up">
                One email gets you in. No password to forget, no card to enter.
            </AuthHeading>

            <AuthButton
                type="button"
                variant="secondary"
                onClick={() => handleSocialSignIn(googleProvider)}
                disabled={googleLoading}
            >
                {googleLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                ) : (
                    <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt=""
                        className="h-[18px] w-[18px]"
                    />
                )}
                {googleLoading ? "Signing in…" : "Continue with Google"}
            </AuthButton>

            {socialError && <div className="mt-4"><AuthError>{socialError}</AuthError></div>}

            <div className="my-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">or</span>
                <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label
                        htmlFor="email"
                        className="mb-2 block text-[13px] font-medium text-ink"
                    >
                        Email address
                    </label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(true)}
                        aria-invalid={showEmailError || undefined}
                        className={`w-full rounded-xl border bg-surface px-4 py-3.5 text-[15px] text-ink transition-colors placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                            showEmailError
                                ? "border-accent focus:border-accent"
                                : "border-line focus:border-accent"
                        }`}
                    />
                    {showEmailError && (
                        <p className="mt-2 text-[12.5px] text-accent">
                            That doesn&apos;t look like a valid email address.
                        </p>
                    )}
                </div>

                <AuthError>{apiError}</AuthError>

                <AuthButton type="submit" disabled={!isValid || loading}>
                    {loading ? "Sending…" : "Continue with email"}
                </AuthButton>
            </form>

            <p className="mt-7 text-[12.5px] leading-relaxed text-ink-mute">
                We&apos;ll email you a six-digit code to sign in. By continuing you
                agree to our terms and privacy policy.
            </p>
        </AuthLayout>
    );
}
