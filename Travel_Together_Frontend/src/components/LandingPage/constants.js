/* Photography note (see FRONTEND_DOCS.md): these four are placeholders
   pulled from Unsplash. Swap the `img` values for real Ghana shots when
   they're available — the cards expect a tall 3:4 crop. */
export const DESTINATIONS = [
  { name: "Mount Afadja",       region: "Volta Region",    trips: 24, img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80" },
  { name: "Kokrobite Beach",    region: "Greater Accra",   trips: 41, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80" },
  { name: "Mole National Park", region: "Northern Region", trips: 18, img: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80" },
  { name: "Wli Waterfalls",     region: "Volta Region",    trips: 33, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80" },
];

/* `id` selects the preview component in FeatureVisuals.jsx, and the
   order here drives the bento layout — see TILES in Features.jsx. */
export const FEATURES = [
  { id: "crew",       title: "Find your crew",              body: "Browse real trips and join groups heading where you're headed. Every organiser is identity-checked before they can post." },
  { id: "fleet",      title: "Live fleet tracking",         body: "See every member of your group on one map, in real time. No more asking where everyone got to." },
  { id: "safety",     title: "A safety net that runs itself", body: "SOS detection, emergency contact alerts and geofenced check-ins, working quietly in the background." },
  { id: "chat",       title: "Group chat and polls",        body: "Agree on the detour, split the cost, share a location — without a seventeen-message thread." },
  { id: "karma",      title: "Travel karma",                body: "Your reliability score travels with you. Show up, and organisers approve you faster next time." },
  { id: "encryption", title: "Encrypted by default",        body: "Locations, messages and media are encrypted end to end. Share freely; it stays between your group." },
];

export const STATS = [
  { val: "2,400+", label: "Trips organised" },
  { val: "18,000", label: "Travellers" },
  { val: "94%",    label: "Check-in rate" },
  { val: "4.8",    label: "Average trip rating" },
];

export const TESTIMONIALS = [
  { name: "Ama Osei",     role: "Navigator · 21 trips", img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=700&h=875&fit=crop&crop=faces&q=80", quote: "I met my closest friends on Travel Together. The safety features made my parents stop worrying — and that is saying something." },
  { name: "Kwame Asante", role: "Explorer · 8 trips",   img: "https://images.unsplash.com/photo-1562173650-f61426fbe683?w=700&h=875&fit=crop&crop=faces&q=80", quote: "I organised a twelve-person safari and the live map alone paid for the whole thing. Nobody waited at the wrong entrance for forty minutes." },
  { name: "Jessica Nana", role: "Navigator · 14 trips", img: "https://images.unsplash.com/photo-1606416132922-22ab37c1231e?w=700&h=875&fit=crop&crop=faces&q=80", quote: "The karma score makes people actually turn up on time. Genuinely the best group travel app I have used." },
];

export const HOW_IT_WORKS = [
  { num: "01", title: "Make your profile",    body: "Sign up, set your travel preferences, and pick up your Verified Traveller badge." },
  { num: "02", title: "Find a trip",           body: "Filter by destination, date or group size, then send a request to join." },
  { num: "03", title: "Travel together",       body: "Live maps, group chat, check-ins and SOS, for the whole way there and back." },
  { num: "04", title: "Build your standing",   body: "Earn karma, unlock badges, and become someone other travellers want along." },
];

export const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features",     href: "#features" },
  { label: "Destinations", href: "#destinations" },
];

export { BRAND_IMAGE as HERO_IMAGE } from "../../config/media.js";

/* Two live trips previewed on the hero photo. */
export const HERO_CARDS = [
  { name: "Mole Safari",   meta: "14 May · 5 spots left", img: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=300&q=70" },
  { name: "Mount Afadja",  meta: "6 May · 3 spots left",  img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&q=70" },
];

