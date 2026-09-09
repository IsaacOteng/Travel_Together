import { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin, Users, Calendar, Shield,
  ChevronRight, ChevronDown, AlertTriangle,
  CheckCircle, Clock,
  Crown, Compass, Radio, ArrowLeft, UserCheck,
  RefreshCw, LogOut,
  Plus, X, Check, MessageCircle, Map,
  BarChart2, Star, Lock, Trash2, Navigation, Flag,
} from "lucide-react";
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppNav from '../shared/AppNav.jsx';
import MobileBottomNav from '../shared/MobileBottomNav.jsx';
import { tripsApi, pollsApi, chatApi, tokenStore } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { WS_BASE, AVATAR_COLORS } from './GDConstants.js';
import Avatar from './GDAvatar.jsx';
import RoleBadge from './RoleBadge.jsx';
import FleetMap from './FleetMap.jsx';
import SOSButton from './SOSButton.jsx';
import Countdown from './GDCountdown.jsx';
import Section from './GDSection.jsx';
import QuickAction from './QuickAction.jsx';
import MemberRow from './MemberRow.jsx';
import TripCompletionPrompt from './TripCompletionPrompt.jsx';
import ReportIssueModal from './ReportIssueModal.jsx';
import OrganizerReportCard from './OrganizerReportCard.jsx';
import JoinRequestCard from './JoinRequestCard.jsx';
import { PollCard, CreatePollModal } from './PollComponents.jsx';

export default function GroupDashboard() {
  const navigate     = useNavigate();
  const { tripId }   = useParams();
  const { user }     = useAuth();

  const [winW,          setWinW]          = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [showSOS,       setShowSOS]       = useState(false);
  const [showReport,    setShowReport]    = useState(false);
  const [checkedIn,     setCheckedIn]     = useState(false);
  const [checkedInStops, setCheckedInStops] = useState([]);
  const [myLocation,    setMyLocation]    = useState(null);
  const [locPerms,      setLocPerms]      = useState("prompt");
  const [tick,          setTick]          = useState(0);
  const isTripLiveRef       = useRef(false);
  const wsRef               = useRef(null);
  const wsSendLocationRef   = useRef(null);
  const [requests,      setRequests]      = useState([]);
  const [polls,         setPolls]         = useState([]);
  const [sosAlerts,     setSosAlerts]     = useState([]);
  const alertsWsRef = useRef(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [itinerary,     setItinerary]     = useState([]);
  const [showAddStop,   setShowAddStop]   = useState(false);
  const [stopForm,      setStopForm]      = useState({ name: "", arrival_time: "", note: "" });
  const [mapFlyTo,      setMapFlyTo]      = useState(null);
  const [mapResetKey,   setMapResetKey]   = useState(0);
  const [locating,      setLocating]      = useState(false);
  const [trip,          setTrip]          = useState(null);
  const [chiefId,       setChiefId]       = useState(null);
  const [members,       setMembers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [departing,     setDeparting]     = useState(false);
  const [departMsg,     setDepartMsg]     = useState("");

  const isChief = !!user && (
    (chiefId && String(chiefId) === String(user.id)) ||
    members.some(m => m.role === "chief" && String(m.user_id) === String(user.id))
  );

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    setLoading(true);

    const normMembers = (raw) => {
      const all = raw.results ?? raw;
      const approved = all.filter(m => m.status === "approved");
      setMembers(approved.map((m, idx) => ({
        id:         m.user_id || m.id,
        user_id:    m.user_id,
        name:       `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username || "Member",
        role:       m.role === "chief" ? "chief" : m.role === "scout" ? "scout" : "member",
        karma:      m.travel_karma ?? m.karma_earned ?? 0,
        status:     "offline",
        lastSeen:   "—",
        battery:    null,
        checkedIn:  false,
        avatar:     AVATAR_COLORS[idx % AVATAR_COLORS.length],
        avatar_url: m.avatar_url || null,
      })));
      const pending = all.filter(m => m.status === "pending");
      setRequests(pending.map((m, idx) => ({
        id:       m.user_id || m.id,
        name:     `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username || "Member",
        karma:    m.travel_karma ?? 0,
        trips:    m.trips_count ?? 0,
        rating:   m.average_rating ?? 0,
        time:       "—",
        verified:   m.is_verified ?? false,
        avatar:     AVATAR_COLORS[idx % AVATAR_COLORS.length],
        avatar_url: m.avatar_url || null,
      })));
    };

    tripsApi.get(tripId)
      .then(({ data: t }) => {
        if (cancelled) return;
        // Gate: only the chief or an approved (paid) member can open the group
        // dashboard. Pending / awaiting-payment members are sent to the trip page.
        const amChief = t.chief_id && user && String(t.chief_id) === String(user.id);
        if (!amChief && !t.viewer_is_member) {
          navigate(`/trip/${tripId}`, { replace: true });
          return;
        }
        setChiefId(t.chief_id ?? null);
        // Combine date + time so the countdown reflects the real start moment,
        // not midnight of the start date.
        const startMs   = t.date_start ? new Date(`${t.date_start}T${t.start_time || "00:00"}`).getTime() : null;
        const endMs     = t.date_end   ? new Date(`${t.date_end}T${t.end_time   || "23:59"}`).getTime()   : null;

        // Which moment the clock counts toward depends on where the trip is,
        // not on what time it is: a trip whose start time has passed without
        // departing is still counting down to leaving, and a finished trip
        // isn't counting down to anything.
        const isOver    = ["completed", "cancelled", "archived"].includes(t.status);
        const phase     = isOver ? "ended"
                        : t.departure_confirmed_at ? "ending"
                        : "starting";
        // The clock ticks inside <Countdown/>, so hand it the moment to count
        // toward rather than a duration worked out once, here, on page load.
        const countdownTo = phase === "ended" ? null : (phase === "ending" ? (endMs ?? startMs) : startMs);
        setTrip({
          title:       t.title,
          destination: t.destination || "",
          countdownTo,
          phase,
          spotsTotal:  t.spots_total  ?? 0,
          spotsFilled: t.member_count ?? 0,
          groupKarma:  t.group_karma  ?? 0,
          status:      t.status       ?? "",
          departureConfirmedAt: t.departure_confirmed_at ?? null,
          confirmedCompletion:  t.viewer_confirmed_completion ?? false,
          hasReported:          t.viewer_has_reported ?? false,
          startMs,
          endMs,
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    tripsApi.members(tripId)
      .then(({ data }) => { if (!cancelled) normMembers(data); })
      .catch(() => {});

    pollsApi.list(tripId)
      .then(({ data }) => { if (!cancelled) setPolls(data.results ?? data); })
      .catch(() => {});

    tripsApi.itinerary(tripId)
      .then(({ data }) => { if (!cancelled) setItinerary(data.results ?? data); })
      .catch(() => {});

    tripsApi.getCheckins(tripId)
      .then(({ data }) => { if (!cancelled) setCheckedInStops(data.checked_in_stops ?? []); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    let cancelled        = false;
    let pingInterval     = null;
    let reconnectTimeout = null;
    let reconnectDelay   = 1_000;
    let ws               = null;

    const STALE_MS = 10 * 60 * 1000;
    const applyPosition = (user_id, latitude, longitude, updatedAt = null) => {
      const tsMs  = updatedAt ? new Date(updatedAt).getTime() : Date.now();
      const ageMs = Date.now() - tsMs;

      if (ageMs > STALE_MS) {
        setMembers(prev => prev.map(m =>
          String(m.user_id) === String(user_id)
            ? { ...m, lat: null, lng: null }
            : m
        ));
        return;
      }
      setMembers(prev => prev.map(m =>
        String(m.user_id) === String(user_id)
          ? { ...m, lat: latitude, lng: longitude, lastSeen: "now", lastSeenMs: tsMs }
          : m
      ));
    };

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(`${WS_BASE}/ws/trips/${tripId}/locations/`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) { ws.close(); return; }
        reconnectDelay = 1_000;
        ws.send(JSON.stringify({ type: "auth", token: tokenStore.getAccess() }));
      };

      ws.onmessage = (e) => {
        if (cancelled) return;
        const msg = JSON.parse(e.data);

        if (msg.type === "auth.ok") {
          const sendLocation = () => {
            if (!isTripLiveRef.current) return;
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(pos => {
              if (cancelled) return;
              const { latitude, longitude } = pos.coords;
              setMyLocation({ lat: latitude, lng: longitude });
              setLocPerms("granted");
              if (user?.id) applyPosition(user.id, latitude, longitude);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "location.update", latitude, longitude }));
              }
            }, () => { if (!cancelled) setLocPerms("denied"); });
          };
          wsSendLocationRef.current = sendLocation;
          if (isTripLiveRef.current) sendLocation();
          pingInterval = setInterval(sendLocation, 30_000);
        }

        if (msg.type === "location.snapshot") {
          (msg.positions ?? []).forEach(p => applyPosition(p.user_id, p.latitude, p.longitude, p.updated_at));
        }
        if (msg.type === "location.update") {
          applyPosition(msg.user_id, msg.latitude, msg.longitude, msg.updated_at);
        }
        if (msg.type === "location.stopped") {
          setMembers(prev => prev.map(m =>
            String(m.user_id) === String(msg.user_id)
              ? { ...m, lat: null, lng: null } : m
          ));
        }
      };

      ws.onclose = () => {
        clearInterval(pingInterval);
        pingInterval = null;
        if (!cancelled) {
          reconnectTimeout = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
            connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = () => { /* onclose fires next reconnect handled there */ };
    };

    connect();

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        clearTimeout(reconnectTimeout);
        reconnectDelay = 1_000;
        connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (ws && ws.readyState !== WebSocket.CLOSED) ws.close();
      wsRef.current = null;
      wsSendLocationRef.current = null;
    };
  }, [tripId, user]);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    const ws = new WebSocket(`${WS_BASE}/ws/trips/${tripId}/alerts/`);
    alertsWsRef.current = ws;
    ws.onopen = () => {
      if (cancelled) { ws.close(); return; }
      ws.send(JSON.stringify({ type: "auth", token: tokenStore.getAccess() }));
    };
    ws.onmessage = (e) => {
      if (cancelled) return;
      const msg = JSON.parse(e.data);
      if (msg.type === "sos.alert") {
        setSosAlerts(prev => [...prev, {
          id:        msg.alert_id ?? Date.now(),
          user_id:   msg.user_id,
          name:      msg.name ?? "Member",
          lat:       msg.lat,
          lng:       msg.lng,
          ts:        msg.timestamp ?? new Date().toISOString(),
        }]);
      }
      if (msg.type === "sos.resolved") {
        setSosAlerts(prev => prev.filter(a => a.id !== msg.alert_id));
      }
    };
    return () => {
      cancelled = true;
      alertsWsRef.current = null;
      if (ws.readyState !== WebSocket.CLOSED) ws.close();
    };
  }, [tripId]);

  const pendingStop = itinerary.find(s => !checkedInStops.includes(String(s.id)));
  const canCheckIn  = !!pendingStop;

  const handleCheckIn = async () => {
    if (!canCheckIn) return;
    const doCheckin = async (lat, lng, accuracy) => {
      if (lat == null || lng == null) {
        toast.error("Location required to check in.");
        return;
      }
      try {
        await tripsApi.checkin(tripId, {
          lat, lng, stop_id: pendingStop.id,
          // Sent so the server can widen the geofence by the device's own GPS
          // error margin instead of rejecting a member with a weak fix.
          accuracy_meters: accuracy ?? null,
        });
        const newStopId = String(pendingStop.id);
        setCheckedInStops(prev => [...prev, newStopId]);
        if (user) {
          setMembers(prev => prev.map(m =>
            String(m.user_id) === String(user.id) ? { ...m, checkedIn: true } : m
          ));
        }
        tripsApi.itinerary(tripId)
          .then(({ data }) => setItinerary(data.results ?? data))
          .catch(() => {});
        toast.success(`Checked in at ${pendingStop.name}!`);
      } catch (err) {
        // The server rejects check-ins outside the stop's geofence. Show its
        // message it tells the member how close they need to be.
        toast.error(err?.response?.data?.detail || "Check-in failed. Try again.");
      }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => doCheckin(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
        ()  => toast.error("Enable location to check in."),
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation not supported on this device.");
    }
  };

  const handleRemoveMember = async (userId, name) => {
    setMembers(prev => prev.filter(m => String(m.user_id) !== String(userId)));
    try {
      await tripsApi.declineMember(tripId, userId);
      toast.success(`${name ?? "Member"} removed from the trip.`);
    } catch {
      toast.error("Failed to remove member.");
    }
  };

  const handleLocateMember = (m) => {
    if (m.lat == null || m.lng == null) {
      toast(`Location unavailable for ${m.name.split(" ")[0]}.`, { icon: "📍" });
      return;
    }
    setMapFlyTo([m.lat, m.lng]);
    document.getElementById("fleet-map-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleMessageMember = async (userId) => {
    try {
      const { data } = await chatApi.startDM(userId);
      navigate('/chat', { state: { conversationId: data.id } });
    } catch (e) {
      // DMs are limited to people you're actually travelling with, so this can
      // legitimately refuse. Say why rather than dropping the user on an empty
      // chat screen with no explanation.
      toast.error(e?.response?.data?.detail || "Couldn't open that chat.");
    }
  };

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setMapFlyTo([pos.coords.latitude, pos.coords.longitude]); setLocating(false); },
      ()  => { toast.error("Could not get your location."); setLocating(false); },
      { timeout: 8000 }
    );
  }
  const mobile = winW < 768;

  const latestStop           = itinerary.length > 0 ? itinerary[itinerary.length - 1] : null;
  const latestStopCheckedIds = new Set(
    (latestStop?.checked_in_users ?? []).map(u => String(u.user_id))
  );
  const checkedInCount    = members.filter(m => latestStopCheckedIds.has(String(m.user_id))).length;
  const checkedInStopName = latestStop?.name ?? null;

  useEffect(() => {
    if (itinerary.length === 0) return;
    const latest = itinerary[itinerary.length - 1];
    const ids = new Set((latest?.checked_in_users ?? []).map(u => String(u.user_id)));
    setMembers(prev => prev.map(m => ({ ...m, checkedIn: ids.has(String(m.user_id)) })));
  }, [itinerary]);

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const isTripLive = !!(
    trip?.startMs != null &&
    Date.now() >= trip.startMs &&
    (trip?.endMs == null || Date.now() <= trip.endMs)
  );

  // Check-in opens an hour before departure so early arrivals aren't stuck —
  // mirrors CHECKIN_WINDOW_HOURS_BEFORE_START on the server, which is what
  // actually enforces it. Location sharing and SOS still follow isTripLive.
  const CHECKIN_OPENS_MS_BEFORE = 60 * 60 * 1000;
  const checkInOpen = !!(
    trip?.startMs != null &&
    Date.now() >= trip.startMs - CHECKIN_OPENS_MS_BEFORE &&
    (trip?.endMs == null || Date.now() <= trip.endMs)
  );

  useEffect(() => { isTripLiveRef.current = isTripLive; }, [isTripLive]);

  useEffect(() => {
    if (isTripLive) wsSendLocationRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTripLive]);

  const STATUS_CFG = {
    active:    { label: "Active",    cls: "bg-green-400/10 text-green-400 border-green-400/20"   },
    published: { label: "Published", cls: "bg-blue-400/10  text-blue-400  border-blue-400/20"   },
    draft:     { label: "Draft",     cls: "bg-white/[0.06] text-white/40  border-white/[0.09]"  },
    completed: { label: "Completed", cls: "bg-white/[0.06] text-white/30  border-white/[0.08]"  },
  };

  const TripHeader = (
    <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-5">
      <div className="flex items-center gap-1.5 mb-3">
        <button onClick={() => navigate('/dashboard')} className="bg-transparent border-none cursor-pointer text-white/40 flex p-0">
          <ArrowLeft size={14} />
        </button>
        <span className="text-[10px] text-white/25">My Trips</span>
        <ChevronRight size={10} className="text-white/20" />
        <span className="text-[10px] text-[#FF6B35]/70 font-semibold">Group Dashboard</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-[22px] font-light text-white font-serif tracking-tight leading-tight">
              {trip?.title ?? "—"}
            </h1>
            {trip?.status && STATUS_CFG[trip.status] && (
              <span className={`text-[9px] font-black uppercase tracking-wider border rounded-full px-2 py-px flex-shrink-0 ${STATUS_CFG[trip.status].cls}`}>
                {STATUS_CFG[trip.status].label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="text-white/30" />
            <span className="text-[12px] text-white/40">{trip?.destination ?? ""}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <Countdown targetMs={trip?.countdownTo ?? null} phase={trip?.phase ?? "starting"} />
      </div>
    </div>
  );

  const handleOpenGroupChat = async () => {
    if (!tripId) return;
    try {
      const { data } = await tripsApi.groupConversation(tripId);
      navigate('/chat', { state: { conversationId: data.id } });
    } catch {
      navigate('/chat');
    }
  };

  const preTripTitle = "Check-in opens an hour before the trip starts";
  const QuickActionsPanel = (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07] p-4">
      <p className="text-[9px] font-bold tracking-[.1em] uppercase text-white/25 mb-3">Quick Actions</p>
      <div className={`grid gap-2 ${isChief ? "grid-cols-3" : "grid-cols-4"}`}>
        <div className="relative"
          title={!checkInOpen ? preTripTitle : itinerary.length === 0 ? "Add an itinerary stop first." : !canCheckIn ? "All stops checked in." : undefined}>
          <QuickAction
            icon={CheckCircle}
            label="Check In"
            color={checkInOpen && canCheckIn ? "#52A882" : "#4b5563"}
            onClick={checkInOpen && canCheckIn ? handleCheckIn : undefined}
          />
          {checkInOpen && !canCheckIn && itinerary.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400/80 flex items-center justify-center border-2 border-[#0d1b2a] pointer-events-none">
              <Check size={7} className="text-white" />
            </span>
          )}
        </div>
        <QuickAction icon={MessageCircle} label="Chat" color="#8B9FC4" onClick={handleOpenGroupChat} />
        <div title={!isTripLive ? preTripTitle : undefined}>
          <QuickAction
            icon={AlertTriangle}
            label="SOS"
            color={isTripLive ? "#C0504A" : "#4b5563"}
            onClick={isTripLive ? () => setShowSOS(true) : undefined}
          />
        </div>
        {/* Members only: the organizer answers reports, they don't file them
            against their own trip. Available from approval onward — problems
            at the meeting point need saying before the trip is over, not
            after the payout has moved. */}
        {!isChief && (
          <div title="Raise a problem with this trip">
            <QuickAction
              icon={Flag}
              label="Report"
              color="#E0A458"
              onClick={() => setShowReport(true)}
            />
          </div>
        )}
      </div>
      {checkedIn && pendingStop === undefined && itinerary.length > 0 && (
        <div className="mt-3 px-3 py-2 bg-emerald-500/[0.07] border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[12px] text-emerald-400/80 font-semibold">
          <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" /> All stops checked in!
        </div>
      )}
      {checkedIn && pendingStop && (
        <div className="mt-3 px-3 py-2 bg-emerald-500/[0.07] border border-emerald-500/20 rounded-xl flex items-center gap-2 text-[12px] text-emerald-400/80 font-semibold">
          <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
          Checked in{pendingStop ? ` next: ${pendingStop.name}` : ""}
        </div>
      )}
    </div>
  );

  const locatedCount = members.filter(m => m.lat != null).length;
  const HealthPanel = (
    <div className="bg-[#0d1b2a] rounded-2xl border border-white/[0.07] p-4">
      <p className="text-[9px] font-bold tracking-[.1em] uppercase text-white/25 mb-3">Group Health</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Sharing Loc", val: `${locatedCount}/${members.length}`, sub: "location active",                                        color: "text-white/70"   },
          { label: "Check-ins",   val: `${checkedInCount}/${members.length}`, sub: checkedInStopName ? `at ${checkedInStopName}` : "checked in", color: "text-[#FF6B35]"  },
          { label: "SOS Alerts",  val: `${sosAlerts.length}`,                 sub: sosAlerts.length ? "active alerts!" : "no active alerts", color: sosAlerts.length ? "text-red-400" : "text-white/70" },
          { label: "Spots Left",  val: `${(trip?.spotsTotal ?? 0) - (trip?.spotsFilled ?? 0)}`, sub: `${trip?.spotsFilled ?? 0}/${trip?.spotsTotal ?? 0} filled`, color: "text-white/70" },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
            <div className={`text-xl font-black leading-none font-serif ${s.color}`}>{s.val}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide text-white/20 mt-1">{s.label}</div>
            <div className="text-[9px] text-white/15 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const MapPanel = (
    <div id="fleet-map-anchor">
      <Section title="Live Fleet Map" icon={Map} iconColor="#6B8BAA">
        <FleetMap height={300} members={members} myLocation={myLocation} flyTo={mapFlyTo} resetKey={mapResetKey} />
        <div className="flex gap-2 mt-3">
          <button onClick={handleLocate}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors bg-white/[0.03] border border-white/[0.07] text-white/35 hover:text-white/60 hover:bg-white/[0.06]"
          >
            <MapPin size={11} className={locating ? "animate-spin" : ""} />
            {locating ? "Locating…" : "My Location"}
          </button>
          <button onClick={() => { setMapFlyTo(null); setMapResetKey(k => k + 1); }}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors bg-white/[0.03] border border-white/[0.07] text-white/35 hover:text-white/60 hover:bg-white/[0.06]"
          >
            <RefreshCw size={11} /> Reset View
          </button>
        </div>
      </Section>
    </div>
  );

  const handleAddStop = async (form) => {
    try {
      const { data } = await tripsApi.addStop(tripId, {
        name:         form.name,
        arrival_time: form.arrival_time || null,
        note:         form.note || "",
        order:        itinerary.length,
      });
      setItinerary(prev => [...prev, data]);
    } catch {}
  };

  const handleDeleteStop = async (stopId) => {
    setItinerary(prev => prev.filter(s => s.id !== stopId));
    try { await tripsApi.deleteStop(tripId, stopId); }
    catch { tripsApi.itinerary(tripId).then(r => setItinerary(r.data.results ?? r.data)).catch(() => {}); }
  };

  const handleDepart = async () => {
    if (departing) return;
    setDeparting(true);
    setDepartMsg("");
    try {
      const { data } = await tripsApi.depart(tripId);
      setTrip(prev => prev ? { ...prev, status: "active", departureConfirmedAt: new Date().toISOString() } : prev);
      // Say what the check-in evidence means for the payout, so a thinly
      // attested departure doesn't look identical to a fully attested one.
      const seen = data?.checked_in ?? 0, total = data?.expected ?? 0;
      setDepartMsg(
        data?.evidence === "strong"
          ? `Departure confirmed, the trip is now live. ${seen}/${total} checked in; your payout releases ${data.partial_in}.`
          : data?.evidence === "weak"
            ? `Departure confirmed, the trip is now live. Only ${seen}/${total} checked in, so your payout is held ${data.partial_in} to give members time to raise anything. Late check-ins shorten the wait.`
            : `Departure confirmed, the trip is now live. Too few check-ins (${seen}/${total}) for an early payout, so your full amount settles after the trip ends.`
      );
    } catch (err) {
      setDepartMsg(err?.response?.data?.detail || "Couldn't mark the trip as departed.");
    } finally {
      setDeparting(false);
    }
  };

  // Mirrors the server's departure rules (see TripDepartView) so the organizer
  // isn't offered a button that can only fail. The server is still the
  // enforcement — this just explains the wait instead of erroring after a click.
  const travellers   = members.filter(m => m.role !== "chief");
  const hasTravellers = travellers.length > 0;
  const hasStarted   = trip?.startMs == null || Date.now() >= trip.startMs;

  const canDepart = isChief && trip && !trip.departureConfirmedAt
    && ["published", "active"].includes(trip.status);

  // Only the two conditions the client can judge without ambiguity. The
  // check-in quorum is deliberately left to the server: checkedInCount here
  // tracks the LATEST stop, not the meeting point, so using it would sometimes
  // block a departure that is actually allowed. The server's reply names the
  // exact numbers ("Need 2 member(s) checked in… (1 so far)").
  const departBlockedReason =
    !hasTravellers ? "Nobody has joined this trip yet"
    : !hasStarted  ? "You can confirm departure once the trip's start time arrives"
    : null;
  // Note: the check-in rate is deliberately NOT a condition here. It no longer
  // blocks departure — it only affects how quickly the payout follows, which
  // the server explains in its response.

  const ItineraryPanel = (
    <Section
      title="Itinerary"
      icon={Calendar}
      iconColor="#6B7FA6"
      action={isChief && (
        <div className="flex items-center gap-1.5">
          {canDepart && (
            <button
              onClick={handleDepart}
              disabled={departing || !!departBlockedReason}
              title={departBlockedReason || "Confirm the group has set off"}
              className="flex items-center gap-1 text-[10px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 border border-[#FF6B35]/25 rounded-lg px-2.5 py-1 cursor-pointer hover:bg-[#FF6B35]/20 transition-colors disabled:opacity-60"
            >
              <Navigation size={10} /> {departing ? "Departing…" : "Depart"}
            </button>
          )}
          <button
            onClick={() => setShowAddStop(true)}
            className="flex items-center gap-1 text-[10px] font-bold text-[#6B7FA6] bg-[#6B7FA6]/10 border border-[#6B7FA6]/20 rounded-lg px-2.5 py-1 cursor-pointer hover:bg-[#6B7FA6]/20 transition-colors"
          >
            <Plus size={10} /> Add Stop
          </button>
        </div>
      )}
    >
      {departMsg && (
        <p className="text-[10.5px] text-white/55 bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1.5 mb-2.5 leading-snug">
          {departMsg}
        </p>
      )}
      {itinerary.length === 0 ? (
        <p className="text-[11px] text-white/25 text-center py-2">No stops added yet.</p>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-white/15 to-white/[0.03] rounded-full" />
          {itinerary.map((stop, i) => (
            <div key={stop.id} className={`relative flex gap-3 ${i < itinerary.length - 1 ? "mb-5" : ""}`}>
              <div className={`absolute -left-5 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${stop.is_current ? "border-[#6B7FA6] bg-[#6B7FA6]" : "border-white/10 bg-white/[0.05]"}`}
              />
              <div className={`flex-1 rounded-xl px-3 py-2.5 border
                ${stop.is_current ? "bg-[#6B7FA6]/[0.07] border-[#6B7FA6]/20" : "bg-white/[0.02] border-white/[0.05]"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[13px] font-bold ${stop.is_current ? "text-[#8BA4C8]" : "text-white/70"}`}>
                    {stop.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {stop.checkin_count > 0 && (
                      <span className="text-[9px] font-bold text-green-400/70 bg-green-400/10 border border-green-400/20 px-2 py-px rounded-full">
                        {stop.checkin_count} checked in
                      </span>
                    )}
                    {stop.is_current && (
                      <span className="text-[9px] font-semibold text-[#8BA4C8] bg-[#6B7FA6]/10 border border-[#6B7FA6]/20 px-2 py-px rounded-full tracking-wider uppercase">
                        Current
                      </span>
                    )}
                    {checkedInStops.includes(String(stop.id)) && (
                      <CheckCircle size={13} className="text-green-400" title="You've checked in" />
                    )}
                    {isChief && !stop.is_system && (
                      <button onClick={() => handleDeleteStop(stop.id)}
                        className="text-white/15 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer p-0">
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] text-white/30">
                  {stop.arrival_time && <span className="flex items-center gap-1"><Clock size={9} />{stop.arrival_time}</span>}
                  {stop.note        && <span className="flex items-center gap-1"><MapPin size={9} />{stop.note}</span>}
                </div>
                {isChief && stop.checked_in_users?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {stop.checked_in_users.map(u => (
                      <span key={u.user_id} className="text-[9px] text-white/40 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-px">
                        {u.first_name || u.username}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );

  const RequestsPanel = requests.length > 0 && (
    <Section title={`Join Requests (${requests.length})`} icon={UserCheck} iconColor="#8B8B6A">
      <div className="flex flex-col gap-2">
        {requests.map(r => (
          <JoinRequestCard key={r.id} req={r}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </Section>
  );

  async function handlePollVote(pollId, payload) {
    setPolls(prev => prev.map(p => p.id === pollId
      ? { ...p, my_vote: payload, total_votes: p.total_votes + (p.my_vote == null ? 1 : 0) }
      : p));
    try {
      await pollsApi.vote(tripId, pollId, payload);
    } catch {
      setPolls(prev => prev.map(p => p.id === pollId
        ? { ...p, my_vote: null, total_votes: Math.max(0, p.total_votes - 1) }
        : p));
    }
  }

  async function handlePollLock(pollId) {
    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, is_locked: true } : p));
    try {
      await pollsApi.lock(tripId, pollId);
    } catch {
      setPolls(prev => prev.map(p => p.id === pollId ? { ...p, is_locked: false } : p));
    }
  }

  async function handlePollCreate(payload) {
    try {
      const { data } = await pollsApi.create(tripId, payload);
      setPolls(prev => [data, ...prev]);
    } catch { /* ignore modal stays closed */ }
  }

  async function handleApprove(memberId) {
    setRequests(rs => rs.filter(x => x.id !== memberId));
    try { await tripsApi.approveMember(tripId, memberId); } catch { /* ignore */ }
  }

  async function handleReject(memberId) {
    setRequests(rs => rs.filter(x => x.id !== memberId));
    try { await tripsApi.declineMember(tripId, memberId); } catch { /* ignore */ }
  }

  const openCount  = polls.filter(p => !p.is_locked && !p.is_expired).length;

  const PollsPanel = (
    <>
      <Section
        title={`Polls${openCount > 0 ? ` (${openCount} open)` : ""}`}
        icon={BarChart2}
        iconColor="#FF6B35"
        action={
          isChief && (
            <button onClick={e => { e.stopPropagation(); setShowCreate(true); }}
              className="mr-2 flex items-center gap-1 text-[11px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 border border-[#FF6B35]/25 rounded-lg px-2 py-1 cursor-pointer hover:bg-[#FF6B35]/20 transition-all">
              <Plus size={12} /> New
            </button>
          )
        }
      >
        {polls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <BarChart2 size={18} className="text-white/20" />
            </div>
            <p className="text-[12px] text-white/25">No polls yet</p>
            {isChief && (
              <button onClick={() => setShowCreate(true)} className="mt-1 text-[11px] text-[#FF6B35]/70 hover:text-[#FF6B35] bg-transparent border-none cursor-pointer transition-colors">
                Create the first poll
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {polls.map(poll => (
              <PollCard key={poll.id} poll={poll} isChief={isChief}
                onVote={payload => handlePollVote(poll.id, payload)}
                onLock={() => handlePollLock(poll.id)}
              />
            ))}
          </div>
        )}
      </Section>
      <CreatePollModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={handlePollCreate} />
    </>
  );

  const MembersPanel = (
    <Section
      title={`Members (${members.length}/${trip?.spotsTotal ?? 0})`}
      icon={Users}
      iconColor="#6B8BAA"
    >
      <div className="flex flex-col gap-2">
        {members.length === 0 && (
          <p className="text-[11px] text-white/25 text-center py-3">No members yet.</p>
        )}
        {members.map(m => (
          <MemberRow key={m.id} m={m} isChief={isChief} tripId={tripId} isTripLive={isTripLive}
            onRemove={handleRemoveMember}
            onMessage={handleMessageMember}
            onLocate={handleLocateMember}
            onViewProfile={handleViewProfile}
          />
        ))}
      </div>
    </Section>
  );

  const SafetyPanel = (
    <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-4">
      <p className="text-[9px] font-bold tracking-[.1em] uppercase text-white/25 mb-3">Safety Status</p>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${sosAlerts.length ? "bg-red-400/10 border border-red-400/30" : "bg-orange-400/10 border border-orange-400/30"}`}>
          <Shield size={18} className={sosAlerts.length ? "text-red-400" : "text-orange-500"} />
        </div>
        <div>
          <div className={`text-[13px] font-bold ${sosAlerts.length ? "text-red-400" : "text-orange-500"}`}>
            {sosAlerts.length ? `${sosAlerts.length} Active Alert${sosAlerts.length > 1 ? "s" : ""}` : "All Clear"}
          </div>
          <div className="text-[10px] text-white/30">
            {sosAlerts.length ? sosAlerts.map(a => a.name).join(", ") : "No active SOS alerts"}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {["GPS tracking", "Emergency contact", "Location sharing", "Notifications"].map(s => (
          <div key={s} className="flex items-center justify-between text-[11px] text-white/45">
            <span>{s}</span>
            <Check size={13} className="text-orange-400" />
          </div>
        ))}
      </div>
    </div>
  );

  const CompactMembers = (
    <div className="bg-[#0d1b2a] border border-white/[0.07] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-bold tracking-[.1em] uppercase text-white/25">Members</p>
        <span className="text-[11px] font-semibold text-white/40">{members.length} total</span>
      </div>
      <div className="flex flex-col gap-2">
        {members.map(m => (
          <div
            key={m.id}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleViewProfile(m.user_id)}
          >
            <div className={`w-7 h-7 ${m.avatar} rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
              {m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <span className="flex-1 text-[11px] font-semibold text-white/75 truncate">{m.name.split(" ")[0]}</span>
            {m.lat != null
              ? <MapPin size={11} className="text-emerald-400/60 flex-shrink-0" title="Sharing location" />
              : <MapPin size={11} className="text-white/15 flex-shrink-0" title="No location" />
            }
            {m.checkedIn
              ? <CheckCircle size={11} className="text-green-400 flex-shrink-0" />
              : <Clock size={11} className="text-white/15 flex-shrink-0" />
            }
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#071422] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#FF6B35]/30 border-t-[#FF6B35] animate-spin" />
        <span className="text-[12px] text-white/30 font-semibold">Loading trip…</span>
      </div>
    </div>
  );

  const LocationAlertBanner = (() => {
    if (!isTripLive) return null;
    if (locPerms === "denied") return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={13} className="text-red-400" />
        </div>
        <p className="flex-1 text-[12px] text-red-300/80 leading-snug">
          Location access is blocked. Enable it in your browser settings it&apos;s required while the trip is active.
        </p>
        <button
          onClick={() => navigator.geolocation?.getCurrentPosition(() => setLocPerms("granted"), () => {})}
          className="text-[11px] font-bold text-red-300 bg-red-500/15 rounded-lg px-2.5 py-1 border border-red-500/20 cursor-pointer hover:bg-red-500/25 transition-colors flex-shrink-0"
        >
          Retry
        </button>
      </div>
    );
    if (locPerms === "prompt") return (
      <div className="bg-[#FF6B35]/8 border-b border-[#FF6B35]/15 px-5 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-[#FF6B35]/15 border border-[#FF6B35]/25 flex items-center justify-center flex-shrink-0">
          <MapPin size={13} className="text-[#FF6B35]" />
        </div>
        <p className="flex-1 text-[12px] text-white/60 leading-snug">
          <span className="text-[#FF6B35] font-semibold">Trip is live</span> your location is required so the group can see you.
        </p>
        <button
          onClick={() => wsSendLocationRef.current?.()}
          className="text-[11px] font-bold text-white bg-[#FF6B35] rounded-lg px-3 py-1.5 border-none cursor-pointer hover:bg-[#e55c28] transition-colors flex-shrink-0 shadow-[0_2px_8px_rgba(255,107,53,0.35)]"
        >
          Share Now
        </button>
      </div>
    );
    return null;
  })();

  const PreTripNotice = (!isTripLive && trip?.startMs != null && Date.now() < trip.startMs) && (
    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">

      <p className="text-[9px] text-white/35 leading-relaxed">
        Check-in opens an hour before departure. SOS and location sharing
        unlock when the trip starts. Check-ins don't block departure they
        just get your payout released sooner.
      </p>
    </div>
  );

  const LocationBanner = LocationAlertBanner;

  const handleSOSFire = () => new Promise((resolve, reject) => {
    // The alert must go out even when we can't locate the device. What must
    // NOT happen is inventing a position: this previously fell back to (0, 0),
    // which is a real point in the Atlantic, so a failed GPS read produced an
    // SOS that looked precisely located and sent responders nowhere. Send no
    // coordinates instead — the backend records "location unknown" and tells
    // the group to make contact directly.
    const doPost = (coords) => {
      tripsApi.triggerSOS(tripId, { trigger_type: "manual", ...coords })
        .then(() => {
          if (!coords.latitude) {
            toast("SOS sent, but your location couldn't be found — tell the group where you are.", {
              icon: "⚠️", duration: 6000,
            });
          }
          setTimeout(() => setShowSOS(false), 1800);
          resolve();
        })
        .catch(reject);
    };

    if (!navigator.geolocation) { doPost({}); return; }

    navigator.geolocation.getCurrentPosition(
      pos => doPost({
        latitude:        pos.coords.latitude,
        longitude:       pos.coords.longitude,
        accuracy_meters: pos.coords.accuracy ?? null,
      }),
      ()  => doPost({}),                       // denied / unavailable / timed out
      { timeout: 5000, enableHighAccuracy: true }
    );
  });

  const SOSOverlay = showSOS && (
    <div
      onClick={e => { if (e.target === e.currentTarget) setShowSOS(false); }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}
    >
      <div
        className="bg-[#0d1b2a] border-2 border-red-500/30 rounded-3xl p-8 w-full max-w-sm text-center shadow-[0_0_60px_rgba(244,63,94,0.2)]"
        style={{ animation: "slideUp .25s ease" }}
      >
        <p className="text-[11px] font-bold tracking-widest uppercase text-red-400 mb-1">Emergency Alert</p>
        <h2 className="text-xl font-light text-white font-serif mb-2">Activate SOS?</h2>
        <p className="text-[13px] text-white/45 leading-relaxed mb-6">
          Your live location will be sent immediately to the group chat so your travel group can reach you.
        </p>
        <SOSButton onFire={handleSOSFire} />
        <button
          onClick={() => setShowSOS(false)}
          className="mt-5 bg-transparent border-none cursor-pointer text-[12px] text-white/30 underline block mx-auto"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const AddStopModal = showAddStop && (
    <div onClick={e => { if (e.target === e.currentTarget) setShowAddStop(false); }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
      style={{ animation: "fadeIn .2s ease" }}>
      <div className="bg-[#0d1b2a] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-white">Add Itinerary Stop</h2>
          <button onClick={() => setShowAddStop(false)} className="bg-transparent border-none cursor-pointer text-white/30 hover:text-white/60"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-white/30 mb-1 block">Stop Name *</label>
            <input value={stopForm.name} onChange={e => setStopForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Ho, Volta Region"
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-white/20 outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-white/30 mb-1 block">Arrival Time</label>
            <input type="time" value={stopForm.arrival_time} onChange={e => setStopForm(p => ({ ...p, arrival_time: e.target.value }))}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white/70 outline-none focus:border-white/25 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-white/30 mb-1 block">Note</label>
            <input value={stopForm.note} onChange={e => setStopForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Optional note"
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-white/20 outline-none focus:border-white/25"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => { setShowAddStop(false); setStopForm({ name: "", arrival_time: "", note: "" }); }}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white/50 text-[13px] font-semibold cursor-pointer">
            Cancel
          </button>
          <button disabled={!stopForm.name.trim()} onClick={async () => { await handleAddStop(stopForm); setShowAddStop(false); setStopForm({ name: "", arrival_time: "", note: "" }); }}
            className="flex-1 py-2.5 rounded-xl bg-[#6B7FA6] border-none text-white text-[13px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Add Stop
          </button>
        </div>
      </div>
    </div>
  );

  const styles = `
    @keyframes sosPulse {
      0%,100% { box-shadow: 0 0 20px rgba(244,63,94,.4), 0 0 40px rgba(244,63,94,.15); }
      50%      { box-shadow: 0 0 30px rgba(244,63,94,.7), 0 0 60px rgba(244,63,94,.3);  }
    }
    @keyframes fadeIn  { from { opacity: 0; }                    to { opacity: 1; }                  }
    @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    ::-webkit-scrollbar       { width: 4px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 99px; }
  `;

  if (mobile) {
    return (
      <div className="min-h-screen bg-[#071422] font-sans pb-[78px]">
        <style>{styles}</style>
        {SOSOverlay}
      {showReport && (
        <ReportIssueModal
          tripId={tripId}
          onClose={() => setShowReport(false)}
          onFiled={() => setTrip(t => (t ? { ...t, hasReported: true } : t))}
        />
      )}
        {AddStopModal}
        {LocationAlertBanner}
        <div className="p-3.5 flex flex-col gap-3">
          {TripHeader}
          {isChief && <OrganizerReportCard tripId={tripId} />}
          {trip?.status === "completed" && !isChief
            && !trip?.confirmedCompletion && !trip?.hasReported
            && <TripCompletionPrompt tripId={tripId} />}
          {PreTripNotice}
          {QuickActionsPanel}
          {HealthPanel}
          {MapPanel}
          {ItineraryPanel}
          {PollsPanel}
          {RequestsPanel}
          {MembersPanel}
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071422] font-sans">
      <style>{styles}</style>
      {SOSOverlay}
      {showReport && (
        <ReportIssueModal
          tripId={tripId}
          onClose={() => setShowReport(false)}
          onFiled={() => setTrip(t => (t ? { ...t, hasReported: true } : t))}
        />
      )}
      {AddStopModal}
      <AppNav rightExtra={
        <>
          {trip?.status && (
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border text-[11px] font-bold
              ${trip.status === "active"    ? "bg-green-400/10  border-green-400/20  text-green-400" :
                trip.status === "published" ? "bg-blue-400/10   border-blue-400/20   text-blue-400"  :
                trip.status === "completed" ? "bg-white/[0.06]  border-white/[0.09]  text-white/40"  :
                                              "bg-white/[0.06]  border-white/[0.09]  text-white/40"}`}
            >
              <Radio size={10} className={trip.status === "active" ? "animate-pulse" : ""} />
              <span className="capitalize">{trip.status}</span>
            </div>
          )}
        </>
      } />

      {LocationAlertBanner}

      <div className="tt-shell flex gap-5 py-5">

        <div className="w-[280px] flex-shrink-0 flex flex-col gap-3.5">
          {TripHeader}
          {PreTripNotice}
          {QuickActionsPanel}
          {HealthPanel}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3.5">
          {isChief && <OrganizerReportCard tripId={tripId} />}
          {trip?.status === "completed" && !isChief
            && !trip?.confirmedCompletion && !trip?.hasReported
            && <TripCompletionPrompt tripId={tripId} />}
          {MapPanel}
          {ItineraryPanel}
          {PollsPanel}
          {RequestsPanel}
          {MembersPanel}
        </div>

        <div className="w-[250px] flex-shrink-0 flex flex-col gap-3.5">
          {SafetyPanel}
          {CompactMembers}
        </div>

      </div>
    </div>
  );
}
