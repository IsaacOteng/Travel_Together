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

export default function LandingPage({ onGetStarted, onSignIn, onBrowse }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-ground font-sans">
      <Navbar
        scrolled={scrolled}
        onGetStarted={onGetStarted}
        onSignIn={onSignIn}
        onBrowse={onBrowse}
      />
      <Hero onGetStarted={onGetStarted} onBrowse={onBrowse} />
      <StatsBand />
      <Features onGetStarted={onGetStarted} />
      <HowItWorks onGetStarted={onGetStarted} />
      <BrowseStrip onBrowse={onBrowse} />
      <Destinations onBrowse={onBrowse} />
      <Testimonials />
      <CTABanner onGetStarted={onGetStarted} onBrowse={onBrowse} />
      <Footer />
    </div>
  );
}
