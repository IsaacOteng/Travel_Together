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
import TripPhaseHeader from './TripPhaseHeader.jsx';
import LiveStatus from './LiveStatus.jsx';
import MemberRow from './MemberRow.jsx';
import TripCompletionPrompt from './TripCompletionPrompt.jsx';
import ReportIssueModal from './ReportIssueModal.jsx';
import OrganizerReportCard from './OrganizerReportCard.jsx';
import JoinRequestCard from './JoinRequestCard.jsx';
import { PollCard, CreatePollModal } from './PollComponents.jsx';
import { displayName } from "../../utils/name.js";

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
  const [tab,           setTab]           = useState("overview");

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
        name:       displayName(m, "Member"),
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
        name:     displayName(m, "Member"),
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

  /* One derived phase drives the header, the tabs and which controls appear.
     Previously each panel re-decided this for itself, which is how a finished
     trip kept offering check-in and a live map. */
  const phase = trip?.status === "completed" || trip?.phase === "ended"
    ? "ended"
    : isTripLive ? "live" : "upcoming";

  const STATUS_CFG = {
    active:    { label: "Active",    cls: "bg-green-400/10 text-green-400 border-green-400/20"   },
    published: { label: "Published", cls: "bg-blue-400/10  text-blue-400  border-blue-400/20"   },
    draft:     { label: "Draft",     cls: "bg-surface-alt text-ink-mute  border-line"  },
    completed: { label: "Completed", cls: "bg-surface-alt text-ink-mute  border-line"  },
  };

  const handleOpenGroupChat = async () => {
    if (!tripId) return;
    try {
      const { data } = await tripsApi.groupConversation(tripId);
      navigate('/chat', { state: { conversationId: data.id } });
    } catch {
      navigate('/chat');
    }
  };

  const primaryAction =
    phase === "ended" ? (
      <button
        onClick={handleOpenGroupChat}
        className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
      >
        <MessageCircle size={15} /> Open group chat
      </button>
    ) : checkInOpen && canCheckIn ? (
      <button
        onClick={handleCheckIn}
        className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-accent px-6 py-3 text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
      >
        <CheckCircle size={16} /> Check in{pendingStop ? ` at ${pendingStop.name}` : ""}
      </button>
    ) : (
      <button
        onClick={handleOpenGroupChat}
        className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-accent px-6 py-3 text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
      >
        <MessageCircle size={16} /> Open group chat
      </button>
    );

  const TripHeader = (
    <TripPhaseHeader
      trip={trip}
      phase={phase}
      memberCount={members.length}
      onBack={() => navigate('/dashboard')}
      primaryAction={primaryAction}
    />
  );

  /* Check-in is the header's primary action, so it is deliberately absent
     here — it used to appear in both places. What's left is phase-aware:
     SOS only exists while the trip is actually running. */
  const QuickActionsPanel = (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
        Quick actions
      </p>
      <div className="grid grid-cols-3 gap-2">
        <QuickAction icon={MessageCircle} label="Chat" onClick={handleOpenGroupChat} />

        {phase === "live" && (
          <QuickAction icon={AlertTriangle} label="SOS" tone="danger" onClick={() => setShowSOS(true)} />
        )}

        {/* Members only: the organizer answers reports, they don't file them
            against their own trip. Available from approval onward — problems
            at the meeting point need saying before the trip is over, not
            after the payout has moved. */}
        {!isChief && (
          <QuickAction icon={Flag} label="Report" onClick={() => setShowReport(true)} />
        )}

        {isChief && (
          <QuickAction icon={Users} label="Members" onClick={() => setTab("people")} />
        )}
      </div>

      {phase === "upcoming" && (
        <p className="mt-3.5 text-[12.5px] leading-relaxed text-ink-mute">
          Check-in and SOS open an hour before the trip starts.
        </p>
      )}

      {checkedIn && itinerary.length > 0 && (
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-moss/25 bg-moss/10 px-3.5 py-2.5 text-[12.5px] font-medium text-moss">
          <CheckCircle size={14} className="shrink-0" />
          {pendingStop ? `Checked in at ${checkedInStopName ?? "the last stop"}` : "All stops checked in"}
        </div>
      )}
    </div>
  );

  const locatedCount = members.filter(m => m.lat != null).length;
  const StatusPanel = (
    <LiveStatus
      members={members}
      locatedCount={locatedCount}
      checkedInCount={checkedInCount}
      checkedInStopName={checkedInStopName}
      sosAlerts={sosAlerts}
      phase={phase}
    />
  );

  const MapPanel = (
    <div id="fleet-map-anchor">
      <Section title={phase === "ended" ? "Where everyone went" : "Live fleet map"} icon={Map} iconColor="#6B8BAA">
        <FleetMap height={300} members={members} myLocation={myLocation} flyTo={mapFlyTo} resetKey={mapResetKey} />
        <div className="flex gap-2 mt-3">
          <button onClick={handleLocate}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors bg-surface-alt border border-line text-ink-mute hover:text-ink-soft hover:bg-surface-alt"
          >
            <MapPin size={11} className={locating ? "animate-spin" : ""} />
            {locating ? "Locating…" : "My Location"}
          </button>
          <button onClick={() => { setMapFlyTo(null); setMapResetKey(k => k + 1); }}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors bg-surface-alt border border-line text-ink-mute hover:text-ink-soft hover:bg-surface-alt"
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
              className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 border border-accent/25 rounded-lg px-2.5 py-1 cursor-pointer hover:bg-accent/20 transition-colors disabled:opacity-60"
            >
              <Navigation size={10} /> {departing ? "Departing…" : "Depart"}
            </button>
          )}
          <button
            onClick={() => setShowAddStop(true)}
            className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 border border-[#6B7FA6]/20 rounded-lg px-2.5 py-1 cursor-pointer hover:bg-accent/20 transition-colors"
          >
            <Plus size={10} /> Add Stop
          </button>
        </div>
      )}
    >
      {departMsg && (
        <p className="text-[10.5px] text-ink-soft bg-surface-alt border border-line rounded-lg px-2.5 py-1.5 mb-2.5 leading-snug">
          {departMsg}
        </p>
      )}
      {itinerary.length === 0 ? (
        <p className="text-[11px] text-ink-mute text-center py-2">No stops added yet.</p>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-line to-transparent rounded-full" />
          {itinerary.map((stop, i) => (
            <div key={stop.id} className={`relative flex gap-3 ${i < itinerary.length - 1 ? "mb-5" : ""}`}>
              <div className={`absolute -left-5 mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${stop.is_current ? "border-[#6B7FA6] bg-accent" : "border-line bg-surface-alt"}`}
              />
              <div className={`flex-1 rounded-xl px-3 py-2.5 border
                ${stop.is_current ? "bg-accent/[0.07] border-[#6B7FA6]/20" : "bg-surface-alt border-line"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[13px] font-bold ${stop.is_current ? "text-ink-soft" : "text-ink"}`}>
                    {stop.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {stop.checkin_count > 0 && (
                      <span className="text-[9px] font-bold text-green-400/70 bg-green-400/10 border border-green-400/20 px-2 py-px rounded-full">
                        {stop.checkin_count} checked in
                      </span>
                    )}
                    {stop.is_current && (
                      <span className="text-[9px] font-semibold text-ink-soft bg-accent/10 border border-[#6B7FA6]/20 px-2 py-px rounded-full tracking-wider uppercase">
                        Current
                      </span>
                    )}
                    {checkedInStops.includes(String(stop.id)) && (
                      <CheckCircle size={13} className="text-green-400" title="You've checked in" />
                    )}
                    {isChief && !stop.is_system && (
                      <button onClick={() => handleDeleteStop(stop.id)}
                        className="text-ink-mute hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer p-0">
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] text-ink-mute">
                  {stop.arrival_time && <span className="flex items-center gap-1"><Clock size={9} />{stop.arrival_time}</span>}
                  {stop.note        && <span className="flex items-center gap-1"><MapPin size={9} />{stop.note}</span>}
                </div>
                {isChief && stop.checked_in_users?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {stop.checked_in_users.map(u => (
                      <span key={u.user_id} className="text-[9px] text-ink-mute bg-surface-alt border border-line rounded-full px-2 py-px">
                        {displayName(u, "Member")}
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
        iconColor="var(--tt-accent)"
        action={
          isChief && (
            <button onClick={e => { e.stopPropagation(); setShowCreate(true); }}
              className="mr-2 flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 border border-accent/25 rounded-lg px-2 py-1 cursor-pointer hover:bg-accent/20 transition-all">
              <Plus size={12} /> New
            </button>
          )
        }
      >
        {polls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <div className="w-10 h-10 rounded-xl bg-surface-alt border border-line flex items-center justify-center">
              <BarChart2 size={18} className="text-ink-mute" />
            </div>
            <p className="text-[12px] text-ink-mute">No polls yet</p>
            {isChief && (
              <button onClick={() => setShowCreate(true)} className="mt-1 text-[11px] text-accent/70 hover:text-accent bg-transparent border-none cursor-pointer transition-colors">
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
          <p className="text-[11px] text-ink-mute text-center py-3">No members yet.</p>
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

  /* Tabs replace five stacked accordions. Requests fold into People with a
     count, so an organiser sees pending joins without hunting for a panel. */
  const TAB_DEFS = [
    { id: "overview",  label: "Overview" },
    { id: "itinerary", label: "Itinerary", count: itinerary.length },
    { id: "people",    label: "People",    count: members.length, badge: isChief ? requests.length : 0 },
    { id: "polls",     label: "Polls",     count: polls.length },
  ];

  const Tabs = (
    <div className="scrollbar-none flex gap-2 overflow-x-auto" role="tablist">
      {TAB_DEFS.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => setTab(t.id)}
          className={`relative flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-[14px] transition-colors ${
            tab === t.id
              ? "border-accent bg-accent font-semibold text-accent-ink"
              : "border-line bg-surface font-medium text-ink-soft hover:border-accent hover:text-accent"
          }`}
        >
          {t.label}
          {t.count > 0 && (
            <span className={`text-[12.5px] ${tab === t.id ? "text-accent-ink/70" : "text-ink-mute"}`}>
              {t.count}
            </span>
          )}
          {t.badge > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const TabPanel = (
    <div key={tab} style={{ animation: "ttFadeUp .3s ease both" }} className="flex flex-col gap-4">
      {tab === "overview" && (
        <>
          {MapPanel}
          {StatusPanel}
          {QuickActionsPanel}
        </>
      )}
      {tab === "itinerary" && ItineraryPanel}
      {tab === "people" && (
        <>
          {isChief && requests.length > 0 && RequestsPanel}
          {MembersPanel}
        </>
      )}
      {tab === "polls" && PollsPanel}
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-ground flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-[var(--tt-accent)] animate-spin" />
        <span className="text-[12px] text-ink-mute font-semibold">Loading trip…</span>
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
      <div className="bg-accent/8 border-b border-accent/15 px-5 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center flex-shrink-0">
          <MapPin size={13} className="text-accent" />
        </div>
        <p className="flex-1 text-[12px] text-ink-soft leading-snug">
          <span className="text-accent font-semibold">Trip is live</span> your location is required so the group can see you.
        </p>
        <button
          onClick={() => wsSendLocationRef.current?.()}
          className="text-[11px] font-bold text-ink bg-accent rounded-lg px-3 py-1.5 border-none cursor-pointer hover:bg-[#e55c28] transition-colors flex-shrink-0 shadow-[0_2px_8px_rgba(255,107,53,0.35)]"
        >
          Share Now
        </button>
      </div>
    );
    return null;
  })();

  const PreTripNotice = (!isTripLive && trip?.startMs != null && Date.now() < trip.startMs) && (
    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-surface-alt border border-line">

      <p className="text-[9px] text-ink-mute leading-relaxed">
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
        className="bg-surface border-2 border-red-500/30 rounded-3xl p-8 w-full max-w-sm text-center shadow-[0_0_60px_rgba(244,63,94,0.2)]"
        style={{ animation: "slideUp .25s ease" }}
      >
        <p className="text-[11px] font-bold tracking-widest uppercase text-red-400 mb-1">Emergency Alert</p>
        <h2 className="text-xl font-light text-ink font-serif mb-2">Activate SOS?</h2>
        <p className="text-[13px] text-ink-soft leading-relaxed mb-6">
          Your live location will be sent immediately to the group chat so your travel group can reach you.
        </p>
        <SOSButton onFire={handleSOSFire} />
        <button
          onClick={() => setShowSOS(false)}
          className="mt-5 bg-transparent border-none cursor-pointer text-[12px] text-ink-mute underline block mx-auto"
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
      <div className="bg-surface border border-line rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        style={{ animation: "slideUp .25s ease" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-ink">Add Itinerary Stop</h2>
          <button onClick={() => setShowAddStop(false)} className="bg-transparent border-none cursor-pointer text-ink-mute hover:text-ink-soft"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-ink-mute mb-1 block">Stop Name *</label>
            <input value={stopForm.name} onChange={e => setStopForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Ho, Volta Region"
              className="w-full bg-surface-alt border border-line rounded-xl px-3 py-2.5 text-[13px] text-ink placeholder-white/20 outline-none focus:border-line"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-ink-mute mb-1 block">Arrival Time</label>
            <input type="time" value={stopForm.arrival_time} onChange={e => setStopForm(p => ({ ...p, arrival_time: e.target.value }))}
              className="w-full bg-surface-alt border border-line rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none focus:border-line [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-ink-mute mb-1 block">Note</label>
            <input value={stopForm.note} onChange={e => setStopForm(p => ({ ...p, note: e.target.value }))}
              placeholder="Optional note"
              className="w-full bg-surface-alt border border-line rounded-xl px-3 py-2.5 text-[13px] text-ink placeholder-white/20 outline-none focus:border-line"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => { setShowAddStop(false); setStopForm({ name: "", arrival_time: "", note: "" }); }}
            className="flex-1 py-2.5 rounded-xl bg-surface-alt border border-line text-ink-soft text-[13px] font-semibold cursor-pointer">
            Cancel
          </button>
          <button disabled={!stopForm.name.trim()} onClick={async () => { await handleAddStop(stopForm); setShowAddStop(false); setStopForm({ name: "", arrival_time: "", note: "" }); }}
            className="flex-1 py-2.5 rounded-xl bg-accent border-none text-ink text-[13px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Add Stop
          </button>
        </div>
      </div>
    </div>
  );

  const Notices = (
    <>
      {isChief && <OrganizerReportCard tripId={tripId} />}
      {trip?.status === "completed" && !isChief
        && !trip?.confirmedCompletion && !trip?.hasReported
        && <TripCompletionPrompt tripId={tripId} />}
      {PreTripNotice}
    </>
  );

  const styles = `
    @keyframes sosPulse {
      0%,100% { box-shadow: 0 0 20px rgba(244,63,94,.4), 0 0 40px rgba(244,63,94,.15); }
      50%      { box-shadow: 0 0 30px rgba(244,63,94,.7), 0 0 60px rgba(244,63,94,.3);  }
    }
    @keyframes fadeIn  { from { opacity: 0; }                    to { opacity: 1; }                  }
    @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    ::-webkit-scrollbar       { width: 4px; }
    ::-webkit-scrollbar-thumb { background: var(--tt-line); border-radius: 99px; }
  `;

  if (mobile) {
    return (
      <div className="min-h-screen bg-ground font-sans pb-[78px]">
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
        <div className="flex flex-col gap-4 p-4 pb-6">
          {TripHeader}
          {Notices}
          {Tabs}
          {TabPanel}
        </div>

        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ground font-sans">
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
            <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
              trip.status === "active"
                ? "border-moss/30 bg-moss/10 text-moss"
                : trip.status === "published"
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-line bg-surface-alt text-ink-mute"}`}
            >
              <Radio size={10} className={trip.status === "active" ? "animate-pulse" : ""} />
              <span className="capitalize">{trip.status}</span>
            </div>
          )}
        </>
      } />

      {LocationAlertBanner}

      <div className="tt-shell block py-7">
        <div className="flex flex-col gap-5">
          {TripHeader}
          {Notices}

          <div className="sticky top-20 z-30 -mx-1 bg-ground px-1 py-2">
            {Tabs}
          </div>

          {/* Overview keeps the map wide and puts status alongside it; the
              other tabs get the full measure. */}
          {tab === "overview" ? (
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">{MapPanel}</div>
              <div className="flex w-full flex-col gap-4 lg:w-[320px] lg:shrink-0">
                {StatusPanel}
                {QuickActionsPanel}
              </div>
            </div>
          ) : (
            TabPanel
          )}
        </div>
      </div>
    </div>
  );
}
