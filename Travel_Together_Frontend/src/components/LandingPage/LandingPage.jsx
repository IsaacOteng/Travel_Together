import { useState, useEffect } from "react";
import Navbar from "./Navbar.jsx";
import Hero from "./Hero.jsx";
import StatsBand from "./StatsBand.jsx";
import Features from "./Features.jsx";
import HowItWorks from "./HowItWorks.jsx";
import BrowseStrip from "./BrowseStrip.jsx";
import Destinations from "./Destinations.jsx";
import Testimonials from "./Testimonials.jsx";
import CTABanner from "./CTABanner.jsx";
import Footer from "./Footer.jsx";

const globalStyles = `
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
`;

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
      <style>{globalStyles}</style>
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
