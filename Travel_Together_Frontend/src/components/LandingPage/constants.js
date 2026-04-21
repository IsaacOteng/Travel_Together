import { Users, Map, Shield, MessageCircle, Award, Lock } from "lucide-react";

export const DESTINATIONS = [
  { name: "Mount Afadja",       region: "Volta Region",     img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80", trips: 24 },
  { name: "Kokrobite Beach",    region: "Greater Accra",    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80", trips: 41 },
  { name: "Mole National Park", region: "Northern Region",  img: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&q=80", trips: 18 },
  { name: "Wli Waterfalls",     region: "Volta Region",     img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80", trips: 33 },
];

export const FEATURES = [
  { icon: Users,         color: "#FF6B35", title: "Find Your Crew",       body: "Browse real trips and join verified groups heading to your dream destination. Every organiser is identity-checked." },
  { icon: Map,           color: "#4ade80", title: "Live Fleet Tracking",  body: "See every group member on a real-time map. Know exactly where your crew is — no more 'where are you?' messages." },
  { icon: Shield,        color: "#60a5fa", title: "Built-In Safety Net",  body: "Automatic SOS detection, emergency contact alerts, and geofenced check-ins. Safety that works even when you don't think about it." },
  { icon: MessageCircle, color: "#a855f7", title: "Group Chat & Polls",   body: "Coordinate in real time. Vote on detours, share locations, and keep everyone on the same page — all in one place." },
  { icon: Award,         color: "#fbbf24", title: "Travel Karma",         body: "Your reliability score follows you across every trip. High karma means priority approvals and a trusted reputation." },
  { icon: Lock,          color: "#14b8a6", title: "AES-256 Encryption",   body: "Your location data, messages, and media are encrypted end-to-end. Share freely, knowing your privacy is protected." },
];

export const STATS = [
  { val: 2400,  suffix: "+", label: "Trips Organised" },
  { val: 18000, suffix: "+", label: "Travellers"      },
  { val: 94,    suffix: "%", label: "Check-in Rate"   },
  { val: 4.8,   suffix: "★", label: "Avg Trip Rating", isDecimal: true },
];

export const TESTIMONIALS = [
  { name: "Ama Osei",     role: "Navigator · 21 trips", color: "#f43f5e", quote: "I met my closest friends on Travel Together. The safety features made my parents stop worrying — and that's saying something." },
  { name: "Kwame Asante", role: "Explorer · 8 trips",   color: "#4ade80", quote: "Organised a 12-person safari and the live map alone was worth it. No more waiting at the wrong entrance for 40 minutes." },
  { name: "Jessica Nana", role: "Navigator · 14 trips", color: "#a855f7", quote: "The karma system makes people actually show up on time. Genuinely the best group travel app I've ever used." },
];

export const HOW_IT_WORKS = [
  { num: "01", title: "Create your profile",  body: "Sign up, add your travel preferences, and get your Verified Traveller badge." },
  { num: "02", title: "Discover a trip",       body: "Browse trips near you, filter by destination, date, or group size, and send a join request." },
  { num: "03", title: "Travel together",       body: "Coordinate in real time with live maps, group chat, check-ins, and SOS safety features." },
  { num: "04", title: "Build your reputation", body: "Earn Travel Karma, unlock badges, and become a trusted member of the community." },
];
