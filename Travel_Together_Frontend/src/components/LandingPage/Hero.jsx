import { MapPin, Shield, Users, Star, ArrowRight, ChevronDown, Compass } from "lucide-react";

export default function Hero({ onGetStarted, onBrowse, scrollY }) {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#071422]">

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

      <div className="absolute inset-0 bg-gradient-to-r from-[#071422] via-[#071422]/88 to-[#071422]/55 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#071422] via-transparent to-[#071422]/40 pointer-events-none" />

      <div className="absolute top-1/4 right-[30%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(255,107,53,0.08) 0%, transparent 70%)", animation: "pulseOrb 6s ease-in-out infinite" }} />
      <div className="absolute bottom-1/4 right-[15%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(96,165,250,0.06) 0%, transparent 70%)", animation: "pulseOrb 8s ease-in-out infinite 2s" }} />

      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative max-w-[1200px] mx-auto px-6 pt-28 pb-20 w-full">
        <div className="max-w-[680px]">

          <div className="flex items-center gap-2 mb-6" style={{ animation: "fadeSlideUp .55s ease both" }}>
            <div className="flex items-center gap-1.5 bg-[#FF6B35]/15 border border-[#FF6B35]/30 rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" style={{ animation: "ping 1.8s ease-in-out infinite" }} />
              <span className="text-[11px] font-bold text-[#FF6B35] tracking-widest uppercase">Now live in Ghana</span>
            </div>
          </div>

          <h1 className="font-serif font-light leading-[1.05] tracking-[-2px] text-white mb-6"
            style={{ fontSize: "clamp(48px, 7vw, 88px)", animation: "fadeSlideUp .65s ease .1s both" }}>
            Travel far.<br />
            <span className="text-[#FF6B35]" style={{ animation: "fadeSlideUp .65s ease .2s both, shimmer 4s ease-in-out 1s infinite" }}>
              Travel safe.
            </span><br />
            Travel together.
          </h1>

          <p className="text-[17px] text-white/50 leading-[1.75] max-w-[520px] mb-9 font-light"
            style={{ animation: "fadeSlideUp .65s ease .3s both" }}>
            Find verified travel groups heading your way. Real-time coordination, built-in safety features, and a community that looks out for each other.
          </p>

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

          <div className="flex flex-wrap items-center gap-5" style={{ animation: "fadeSlideUp .65s ease .5s both" }}>
            {[
              { icon: Shield, text: "Identity verified groups" },
              { icon: Users,  text: "18,000+ travellers"       },
              { icon: Star,   text: "4.8 avg trip rating"      },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon size={14} className="text-[#FF6B35]/70 flex-shrink-0" />
                <span className="text-[12px] text-white/40 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

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

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
        style={{ animation: "fadeSlideUp .6s ease 1.1s both" }}>
        <span className="text-[10px] text-white/50 tracking-widest uppercase font-medium">Scroll</span>
        <ChevronDown size={16} className="text-white/50 animate-bounce" />
      </div>
    </section>
  );
}
