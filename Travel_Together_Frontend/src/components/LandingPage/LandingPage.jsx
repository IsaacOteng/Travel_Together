import { useState, useEffect, useRef } from "react";
import {
  MapPin, Shield, Users, Star, ArrowRight, ChevronDown,
  Play, Menu, X, Zap, Globe, Lock, Map,
  MessageCircle, Award, ChevronRight, Compass,
} from "lucide-react";

const DESTINATIONS = [
  { name: "Mount Afadja",       region: "Volta Region",     img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80", trips: 24 },
  { name: "Kokrobite Beach",    region: "Greater Accra",    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80", trips: 41 },
  { name: "Mole National Park", region: "Northern Region",  img: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&q=80", trips: 18 },
  { name: "Wli Waterfalls",     region: "Volta Region",     img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80", trips: 33 },
];

const FEATURES = [
  { icon: Users,         color: "#FF6B35", title: "Find Your Crew",       body: "Browse real trips and join verified groups heading to your dream destination. Every organiser is identity-checked." },
  { icon: Map,           color: "#4ade80", title: "Live Fleet Tracking",  body: "See every group member on a real-time map. Know exactly where your crew is — no more 'where are you?' messages." },
  { icon: Shield,        color: "#60a5fa", title: "Built-In Safety Net",  body: "Automatic SOS detection, emergency contact alerts, and geofenced check-ins. Safety that works even when you don't think about it." },
  { icon: MessageCircle, color: "#a855f7", title: "Group Chat & Polls",   body: "Coordinate in real time. Vote on detours, share locations, and keep everyone on the same page — all in one place." },
  { icon: Award,         color: "#fbbf24", title: "Travel Karma",         body: "Your reliability score follows you across every trip. High karma means priority approvals and a trusted reputation." },
  { icon: Lock,          color: "#14b8a6", title: "AES-256 Encryption",   body: "Your location data, messages, and media are encrypted end-to-end. Share freely, knowing your privacy is protected." },
];

const STATS = [
  { val: 2400, suffix: "+", label: "Trips Organised" },
  { val: 18000, suffix: "+", label: "Travellers"     },
  { val: 94, suffix: "%",   label: "Check-in Rate"   },
  { val: 4.8, suffix: "★",  label: "Avg Trip Rating", isDecimal: true },
];

const TESTIMONIALS = [
  { name: "Ama Osei",      role: "Navigator · 21 trips",  color: "#f43f5e", quote: "I met my closest friends on Travel Together. The safety features made my parents stop worrying — and that's saying something." },
  { name: "Kwame Asante",  role: "Explorer · 8 trips",    color: "#4ade80", quote: "Organised a 12-person safari and the live map alone was worth it. No more waiting at the wrong entrance for 40 minutes." },
  { name: "Jessica Nana",  role: "Navigator · 14 trips",  color: "#a855f7", quote: "The karma system makes people actually show up on time. Genuinely the best group travel app I've ever used." },
];

const HOW_IT_WORKS = [
  { num: "01", title: "Create your profile",  body: "Sign up, add your travel preferences, and get your Verified Traveller badge." },
  { num: "02", title: "Discover a trip",       body: "Browse trips near you, filter by destination, date, or group size, and send a join request." },
  { num: "03", title: "Travel together",       body: "Coordinate in real time with live maps, group chat, check-ins, and SOS safety features." },
  { num: "04", title: "Build your reputation", body: "Earn Travel Karma, unlock badges, and become a trusted member of the community." },
];

/* ── hooks ─────────────────────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── animated counter ──────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "", isDecimal = false }) {
  const [ref, inView] = useInView(0.4);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const dur = 1800;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(isDecimal ? +(eased * target).toFixed(1) : Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, isDecimal]);
  return (
    <span ref={ref}>
      {isDecimal ? val.toFixed(1) : val.toLocaleString()}{suffix}
    </span>
  );
}

/* ── reveal wrapper ────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity .65s ease ${delay}s, transform .65s ease ${delay}s`,
        opacity:    inView ? 1 : 0,
        transform:  inView ? "translateY(0)" : "translateY(28px)",
      }}
    >
      {children}
    </div>
  );
}

/* ── avatar ─────────────────────────────────────────────────────── */
function Avatar({ name, color, size = "w-10 h-10" }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`${size} rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}
      style={{ background: color }}>
      {initials}
    </div>
  );
}

/* ── navbar ─────────────────────────────────────────────────────── */
function Navbar({ scrolled, onGetStarted, onSignIn, onBrowse }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#071422]/96 backdrop-blur-xl border-b border-white/[0.07] shadow-2xl" : "bg-transparent"}`}>
        <div className="max-w-[1200px] mx-auto px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/src/assets/official_logo_nobg.png" alt="logo" className="w-9 h-9"
              onError={e => { e.target.style.display = "none"; }} />
            <span className="text-[16px] font-bold text-white tracking-tight">Travel Together</span>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={onBrowse}
              className="text-[13px] text-white/55 font-semibold hover:text-white transition-colors px-3 py-2 bg-transparent border-none cursor-pointer">
              Browse trips
            </button>
            <button onClick={onSignIn}
              className="text-[13px] text-white/55 font-semibold hover:text-white transition-colors px-3 py-2 bg-transparent border-none cursor-pointer">
              Sign in
            </button>
            <button onClick={onGetStarted}
              className="flex items-center gap-1.5 bg-[#FF6B35] text-white text-[13px] font-bold px-4 py-2.5 rounded-xl hover:bg-[#e55c28] transition-all shadow-[0_4px_14px_rgba(255,107,53,0.35)] hover:shadow-[0_6px_20px_rgba(255,107,53,0.45)] hover:-translate-y-0.5 border-none cursor-pointer">
              Get started <ArrowRight size={14} />
            </button>
          </div>

          <button onClick={() => setOpen(o => !o)} className="md:hidden bg-transparent border-none cursor-pointer text-white/60 hover:text-white p-1">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 bg-[#071422]/98 backdrop-blur-xl flex flex-col pt-[68px]"
          style={{ animation: "fadeIn .15s ease" }}>
          <div className="flex flex-col gap-3 p-5 mt-4">
            <button onClick={() => { setOpen(false); onBrowse(); }}
              className="w-full py-3 text-center text-[14px] font-semibold text-white border border-white/15 rounded-2xl hover:bg-white/5 transition-colors bg-transparent cursor-pointer">
              Browse trips
            </button>
            <button onClick={() => { setOpen(false); onSignIn(); }}
              className="w-full py-3 text-center text-[14px] font-semibold text-white/60 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors bg-transparent cursor-pointer">
              Sign in
            </button>
            <button onClick={() => { setOpen(false); onGetStarted(); }}
              className="w-full py-3 text-center text-[14px] font-bold text-white bg-[#FF6B35] rounded-2xl hover:bg-[#e55c28] transition-colors shadow-[0_4px_14px_rgba(255,107,53,0.35)] border-none cursor-pointer">
              Get started free
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── hero ────────────────────────────────────────────────────────── */
function Hero({ onGetStarted, onBrowse, scrollY }) {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#071422]">

      {/* parallax background strips */}
      <div className="absolute inset-0 grid grid-cols-4 gap-0 pointer-events-none"
        style={{ transform: `translateY(${scrollY * 0.18}px)` }}>
        {[
          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=60",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=60",
          "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=60",
          "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=60",
        ].map((src, i) => (
          <div key={i} className="h-full overflow-hidden opacity-[0.18]">
            <img src={src} alt="" className="w-full h-[115%] object-cover"
              style={{ transform: i % 2 === 0 ? "translateY(-7.5%)" : "translateY(0)" }} />
          </div>
        ))}
      </div>

      {/* gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#071422] via-[#071422]/88 to-[#071422]/55 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#071422] via-transparent to-[#071422]/40 pointer-events-none" />

      {/* animated orbs */}
      <div className="absolute top-1/4 right-[30%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(255,107,53,0.08) 0%, transparent 70%)", animation: "pulseOrb 6s ease-in-out infinite" }} />
      <div className="absolute bottom-1/4 right-[15%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(96,165,250,0.06) 0%, transparent 70%)", animation: "pulseOrb 8s ease-in-out infinite 2s" }} />

      {/* subtle grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative max-w-[1200px] mx-auto px-6 pt-28 pb-20 w-full">
        <div className="max-w-[680px]">

          {/* eyebrow badge */}
          <div className="flex items-center gap-2 mb-6" style={{ animation: "fadeSlideUp .55s ease both" }}>
            <div className="flex items-center gap-1.5 bg-[#FF6B35]/15 border border-[#FF6B35]/30 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" style={{ animation: "ping 1.8s ease-in-out infinite" }} />
              <span className="text-[11px] font-bold text-[#FF6B35] tracking-widest uppercase">Now live in Ghana</span>
            </div>
          </div>

          {/* headline */}
          <h1 className="font-serif font-light leading-[1.05] tracking-[-2px] text-white mb-6"
            style={{ fontSize: "clamp(48px, 7vw, 88px)", animation: "fadeSlideUp .65s ease .1s both" }}>
            Travel far.<br />
            <span className="text-[#FF6B35]" style={{ animation: "fadeSlideUp .65s ease .2s both, shimmer 4s ease-in-out 1s infinite" }}>
              Travel safe.
            </span><br />
            Travel together.
          </h1>

          {/* sub */}
          <p className="text-[17px] text-white/50 leading-[1.75] max-w-[520px] mb-9 font-light"
            style={{ animation: "fadeSlideUp .65s ease .3s both" }}>
            Find verified travel groups heading your way. Real-time coordination, built-in safety features, and a community that looks out for each other.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 mb-12" style={{ animation: "fadeSlideUp .65s ease .4s both" }}>
            <button onClick={onGetStarted}
              className="flex items-center gap-2 bg-[#FF6B35] text-white text-[15px] font-bold px-7 py-4 rounded-2xl hover:bg-[#e55c28] transition-all shadow-[0_8px_28px_rgba(255,107,53,0.4)] hover:shadow-[0_12px_36px_rgba(255,107,53,0.5)] hover:-translate-y-0.5 border-none cursor-pointer">
              Get started free <ArrowRight size={17} />
            </button>
            <button onClick={onBrowse}
              className="flex items-center gap-2 bg-white/[0.08] border border-white/20 text-white text-[15px] font-semibold px-7 py-4 rounded-2xl hover:bg-white/15 hover:border-white/35 transition-all cursor-pointer hover:-translate-y-0.5">
              <Compass size={16} className="text-[#FF6B35]" /> Explore the app
            </button>
          </div>

          {/* trust strip */}
          <div className="flex flex-wrap items-center gap-5" style={{ animation: "fadeSlideUp .65s ease .5s both" }}>
            {[
              { icon: Shield,  text: "Identity verified groups" },
              { icon: Users,   text: "18,000+ travellers"       },
              { icon: Star,    text: "4.8 avg trip rating"      },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon size={14} className="text-[#FF6B35]/70 flex-shrink-0" />
                <span className="text-[12px] text-white/40 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* floating trip cards */}
        <div className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col gap-3"
          style={{ animation: "fadeSlideLeft .8s ease .55s both" }}>
          {[
            { dest: "Mount Afadja", date: "May 6",  spots: 3, karma: 480, i: 0 },
            { dest: "Kokrobite",    date: "Apr 28", spots: 7, karma: 390, i: 1 },
            { dest: "Mole Safari",  date: "May 14", spots: 5, karma: 610, i: 2 },
          ].map((trip) => (
            <div key={trip.dest}
              className="bg-[#0d1b2a]/92 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3.5 w-[224px] hover:border-[#FF6B35]/40 hover:bg-[#0d1b2a] transition-all duration-300 hover:-translate-x-1.5 cursor-pointer"
              style={{ animation: `floatCard ${4 + trip.i * 1.2}s ease-in-out ${trip.i * 0.4}s infinite alternate` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-white">{trip.dest}</span>
                <span className="text-[10px] font-bold text-[#FF6B35] bg-[#FF6B35]/15 px-2 py-0.5 rounded-full">{trip.spots} left</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/35">
                <span className="flex items-center gap-1"><MapPin size={9} /> {trip.date}</span>
                <span className="flex items-center gap-1 text-[#FF6B35]/70">⚡ {trip.karma}</span>
              </div>
            </div>
          ))}
          <button onClick={onBrowse}
            className="text-center text-[11px] text-[#FF6B35] hover:text-[#ff8c5a] transition-colors font-semibold mt-1 cursor-pointer bg-transparent border-none">
            View all trips →
          </button>
        </div>
      </div>

      {/* scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
        style={{ animation: "fadeSlideUp .6s ease 1.1s both" }}>
        <span className="text-[10px] text-white/50 tracking-widest uppercase font-medium">Scroll</span>
        <ChevronDown size={16} className="text-white/50 animate-bounce" />
      </div>
    </section>
  );
}

/* ── stats band ──────────────────────────────────────────────────── */
function StatsBand() {
  const [ref, inView] = useInView(0.3);
  return (
    <section ref={ref} className="bg-[#0d1b2a] border-y border-white/[0.06] py-10">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/[0.07]">
          {STATS.map((s, i) => (
            <div key={s.label}
              className="flex flex-col items-center text-center px-6"
              style={{ transition: `opacity .6s ease ${i * 0.12}s, transform .6s ease ${i * 0.12}s`, opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)" }}>
              <span className="text-[38px] font-black text-white font-serif leading-none mb-1.5">
                {inView ? <AnimatedCounter target={s.val} suffix={s.suffix} isDecimal={s.isDecimal} /> : "0"}
              </span>
              <span className="text-[11px] text-white/35 font-medium uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── features ────────────────────────────────────────────────────── */
function Features() {
  return (
    <section id="features" className="py-24 bg-[#071422]">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal className="max-w-[520px] mb-16">
          <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-3">Everything you need</p>
          <h2 className="text-[42px] font-light text-white font-serif tracking-tight leading-[1.1] mb-4">
            Group travel,<br />done properly.
          </h2>
          <p className="text-[15px] text-white/40 leading-relaxed">
            Every feature is built around one idea — that travelling with others should be easier, safer, and more memorable than going alone.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07}>
              <div
                className="group bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-6 hover:border-[var(--c)]/30 transition-all duration-300 hover:-translate-y-1.5 h-full"
                style={{ "--c": f.color }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                  <f.icon size={19} color={f.color} />
                </div>
                <h3 className="text-[16px] font-bold text-white mb-2 group-hover:text-[var(--c)] transition-colors" style={{ "--c": f.color }}>
                  {f.title}
                </h3>
                <p className="text-[13px] text-white/45 leading-relaxed">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── how it works ────────────────────────────────────────────────── */
function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-[#0d1b2a]">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal className="text-center max-w-[480px] mx-auto mb-16">
          <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-3">Simple process</p>
          <h2 className="text-[42px] font-light text-white font-serif tracking-tight leading-[1.1]">
            From signup to<br />summit in 4 steps.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#FF6B35]/0 via-[#FF6B35]/30 to-[#FF6B35]/0" />
          {HOW_IT_WORKS.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.1}>
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#ff8c5a] flex items-center justify-center flex-shrink-0 shadow-[0_6px_20px_rgba(255,107,53,0.35)]">
                    <span className="text-[13px] font-black text-white font-serif">{step.num}</span>
                  </div>
                </div>
                <h3 className="text-[16px] font-bold text-white mb-2">{step.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── destinations ────────────────────────────────────────────────── */
function Destinations({ onBrowse }) {
  return (
    <section id="destinations" className="py-24 bg-[#071422]">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-3">Popular right now</p>
            <h2 className="text-[42px] font-light text-white font-serif tracking-tight leading-[1.1]">
              Where is everyone<br />going?
            </h2>
          </div>
          <button onClick={onBrowse}
            className="flex items-center gap-1.5 text-[13px] text-[#FF6B35] font-semibold hover:gap-3 transition-all flex-shrink-0 bg-transparent border-none cursor-pointer">
            Browse all trips <ArrowRight size={14} />
          </button>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DESTINATIONS.map((dest, i) => (
            <Reveal key={dest.name} delay={i * 0.1}>
              <div
                className="group relative rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-2 transition-all duration-400"
                onClick={onBrowse}>
                <div className="h-[280px] overflow-hidden">
                  <img src={dest.img} alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-600" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#071422] via-[#071422]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[16px] font-bold text-white leading-tight">{dest.name}</div>
                      <div className="flex items-center gap-1 text-[11px] text-white/50 mt-0.5">
                        <MapPin size={9} /> {dest.region}
                      </div>
                    </div>
                    <div className="bg-[#FF6B35] rounded-xl px-2.5 py-1.5 text-center flex-shrink-0">
                      <div className="text-[14px] font-black text-white leading-none">{dest.trips}</div>
                      <div className="text-[8px] text-white/70 font-bold uppercase tracking-wide">trips</div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-250">
                  <span className="bg-[#FF6B35] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                    Explore →
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── testimonials (auto-carousel) ───────────────────────────────── */
function Testimonials() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setActive(a => (a + 1) % TESTIMONIALS.length);
        setAnimating(false);
      }, 300);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const goTo = (i) => {
    if (i === active) return;
    setAnimating(true);
    setTimeout(() => { setActive(i); setAnimating(false); }, 250);
  };

  return (
    <section className="py-24 bg-[#0d1b2a]">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal className="text-center max-w-[480px] mx-auto mb-14">
          <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-3">Real travellers</p>
          <h2 className="text-[42px] font-light text-white font-serif tracking-tight leading-[1.1]">
            Don't take our<br />word for it.
          </h2>
        </Reveal>

        {/* desktop: 3-up grid */}
        <div className="hidden md:grid grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <div className="bg-[#071422] border border-white/[0.07] rounded-2xl p-6 hover:border-[#FF6B35]/25 transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} className="text-[#FF6B35]" fill="#FF6B35" />)}
                </div>
                <p className="text-[14px] text-white/65 leading-[1.8] mb-5 font-light italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                  <Avatar name={t.name} color={t.color} size="w-9 h-9" />
                  <div>
                    <div className="text-[13px] font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-white/35">{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* mobile: carousel */}
        <div className="md:hidden">
          <div
            className="bg-[#071422] border border-white/[0.07] rounded-2xl p-6 transition-opacity duration-300"
            style={{ opacity: animating ? 0 : 1 }}>
            <div className="flex gap-0.5 mb-4">
              {[...Array(5)].map((_, j) => <Star key={j} size={13} fill="#FF6B35" className="text-[#FF6B35]" />)}
            </div>
            <p className="text-[14px] text-white/65 leading-[1.8] mb-5 font-light italic">
              "{TESTIMONIALS[active].quote}"
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
              <Avatar name={TESTIMONIALS[active].name} color={TESTIMONIALS[active].color} size="w-9 h-9" />
              <div>
                <div className="text-[13px] font-bold text-white">{TESTIMONIALS[active].name}</div>
                <div className="text-[10px] text-white/35">{TESTIMONIALS[active].role}</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-2 mt-5">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className="rounded-full transition-all duration-300 border-none cursor-pointer"
                style={{ width: i === active ? 20 : 8, height: 8, background: i === active ? "#FF6B35" : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── browse CTA strip ───────────────────────────────────────────── */
function BrowseStrip({ onBrowse }) {
  const [ref, inView] = useInView(0.3);
  return (
    <section ref={ref} className="py-14 bg-[#071422] border-y border-white/[0.05]">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div style={{ transition: "opacity .6s ease, transform .6s ease", opacity: inView ? 1 : 0, transform: inView ? "translateX(0)" : "translateX(-24px)" }}>
          <p className="text-[11px] font-bold tracking-[.2em] uppercase text-[#FF6B35] mb-1">No account needed</p>
          <h3 className="text-[26px] font-light text-white font-serif tracking-tight leading-[1.2]">
            Curious? Browse trips without signing up.
          </h3>
        </div>
        <div style={{ transition: "opacity .6s ease .15s, transform .6s ease .15s", opacity: inView ? 1 : 0, transform: inView ? "translateX(0)" : "translateX(24px)" }}>
          <button onClick={onBrowse}
            className="flex items-center gap-2.5 bg-white text-[#071422] font-bold text-[15px] px-7 py-4 rounded-2xl hover:bg-white/90 transition-all hover:-translate-y-0.5 shadow-[0_8px_28px_rgba(255,255,255,0.12)] border-none cursor-pointer whitespace-nowrap">
            <Compass size={18} /> Browse the app
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── CTA banner ─────────────────────────────────────────────────── */
function CTABanner({ onGetStarted, onBrowse }) {
  return (
    <section className="py-24 bg-[#071422] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(255,107,53,0.12) 0%, transparent 70%)", animation: "pulseOrb 5s ease-in-out infinite" }} />
      </div>

      <Reveal className="relative max-w-[720px] mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-[#FF6B35]/15 border border-[#FF6B35]/30 rounded-full px-4 py-2 mb-6">
          <Zap size={13} className="text-[#FF6B35]" fill="#FF6B35" />
          <span className="text-[11px] font-bold text-[#FF6B35] tracking-widest uppercase">Free to join</span>
        </div>
        <h2 className="text-[48px] md:text-[58px] font-light text-white font-serif tracking-tight leading-[1.05] mb-5">
          Your next adventure<br />is waiting for you.
        </h2>
        <p className="text-[16px] text-white/40 leading-relaxed mb-8 max-w-[440px] mx-auto">
          Join thousands of travellers already discovering Ghana together. Create your profile in under 2 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onGetStarted}
            className="flex items-center justify-center gap-2 bg-[#FF6B35] text-white text-[15px] font-bold px-8 py-4 rounded-2xl hover:bg-[#e55c28] transition-all shadow-[0_8px_28px_rgba(255,107,53,0.4)] hover:-translate-y-0.5 border-none cursor-pointer">
            Create free account <ArrowRight size={16} />
          </button>
          <button onClick={onBrowse}
            className="flex items-center justify-center gap-2 bg-white/[0.06] border border-white/15 text-white text-[15px] font-semibold px-8 py-4 rounded-2xl hover:bg-white/12 hover:border-white/25 transition-all cursor-pointer hover:-translate-y-0.5">
            <Compass size={16} /> Browse trips first
          </button>
        </div>

        {/* social proof */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="flex -space-x-2">
            {["#FF6B35","#4ade80","#a855f7","#0ea5e9","#f43f5e"].map((c, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-[#071422] flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: c }}>
                {["A","K","E","Y","J"][i]}
              </div>
            ))}
          </div>
          <span className="text-[12px] text-white/40">
            <span className="text-white/70 font-semibold">2,400+</span> trips organised this year
          </span>
        </div>
      </Reveal>
    </section>
  );
}

/* ── footer ─────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-[#0d1b2a] border-t border-white/[0.06] pt-14 pb-8">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src="/src/assets/official_logo_nobg.png" alt="logo" className="w-8 h-8"
                onError={e => { e.target.style.display = "none"; }} />
              <span className="text-[15px] font-bold text-white tracking-tight">Travel Together</span>
            </div>
            <p className="text-[13px] text-white/35 leading-relaxed max-w-[240px]">
              The safe way to explore Ghana with verified travel groups.
            </p>
            <div className="flex gap-2 mt-5">
              {["T","I","K"].map((s, i) => (
                <div key={i} className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-white/40">
                  {s}
                </div>
              ))}
            </div>
          </div>

          {[
            { heading: "Product", links: ["Features","How it works","Destinations","Community"] },
            { heading: "Safety",  links: ["SOS System","Verified Travellers","Privacy","Trust & Safety"] },
            { heading: "Company", links: ["About","Blog","Careers","Contact"] },
          ].map(col => (
            <div key={col.heading}>
              <p className="text-[10px] font-bold tracking-[.15em] uppercase text-white/30 mb-4">{col.heading}</p>
              <div className="flex flex-col gap-2.5">
                {col.links.map(l => (
                  <a key={l} href="#" className="text-[13px] text-white/45 hover:text-white transition-colors">{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <p className="text-[12px] text-white/25">© {new Date().getFullYear()} Travel Together, Inc. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-[12px] text-white/25">
            <Globe size={12} />
            <span>Ghana · English</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── root ───────────────────────────────────────────────────────── */
export default function LandingPage({ onGetStarted, onSignIn, onBrowse }) {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY,  setScrollY]  = useState(0);

  useEffect(() => {
    const h = () => {
      setScrolled(window.scrollY > 40);
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="min-h-screen bg-[#071422] font-sans">
      <style>{`
        @keyframes fadeSlideUp   { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeSlideLeft { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn        { from{opacity:0} to{opacity:1} }
        @keyframes floatCard     { from{transform:translateY(0px)} to{transform:translateY(-10px)} }
        @keyframes pulseOrb      { 0%,100%{opacity:1;transform:translate(-50%,-50%) scale(1)} 50%{opacity:0.6;transform:translate(-50%,-50%) scale(1.15)} }
        @keyframes ping          { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.6)} }
        @keyframes shimmer       { 0%,100%{opacity:1} 50%{opacity:0.85} }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:99px}
        html{scroll-behavior:smooth}
      `}</style>

      <Navbar scrolled={scrolled} onGetStarted={onGetStarted} onSignIn={onSignIn} onBrowse={onBrowse} />
      <Hero onGetStarted={onGetStarted} onBrowse={onBrowse} scrollY={scrollY} />
      <StatsBand />
      <Features />
      <HowItWorks />
      <BrowseStrip onBrowse={onBrowse} />
      <Destinations onBrowse={onBrowse} />
      <Testimonials />
      <CTABanner onGetStarted={onGetStarted} onBrowse={onBrowse} />
      <Footer />
    </div>
  );
}
