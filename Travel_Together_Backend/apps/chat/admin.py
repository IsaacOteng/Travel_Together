from django.contrib import admin
from django.core.exceptions import PermissionDenied
from django.db.models import Count, F, Q
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import (
    Conversation, ConversationMember, Message, MessageReadReceipt, SupportThread,
)


# ─── Inlines ──────────────────────────────────────────────────────────────────

class ConversationMemberInline(TabularInline):
    model           = ConversationMember
    extra           = 0
    raw_id_fields   = ("user",)
    fields          = ("user", "is_admin", "is_muted", "last_read_at", "joined_at")
    readonly_fields = ("joined_at", "last_read_at")
    verbose_name        = "Member"
    verbose_name_plural = "Members"


class MessageInline(TabularInline):
    model           = Message
    extra           = 0
    max_num         = 20
    raw_id_fields   = ("sender",)
    readonly_fields = ("id", "created_at", "edited_at")
    fields          = ("sender", "message_type", "text_preview", "is_deleted", "is_pinned", "created_at")
    ordering        = ("-created_at",)
    can_delete      = True
    verbose_name        = "Message"
    verbose_name_plural = "Latest messages (20)"

    @display(description="Content")
    def text_preview(self, obj):
        if obj.text:
            return obj.text[:80] + ("…" if len(obj.text) > 80 else "")
        if obj.media_url:
            return f"[{obj.message_type.upper()}]"
        return "—"


# ─── Conversation ─────────────────────────────────────────────────────────────

@admin.register(Conversation)
class ConversationAdmin(ModelAdmin):
    list_display    = ("id_short", "type_badge", "name_display", "trip", "created_by", "member_count", "message_count", "created_at")
    list_filter     = ("type",)
    search_fields   = ("name", "trip__title", "created_by__email", "memberships__user__email")
    raw_id_fields   = ("trip", "created_by")
    readonly_fields = ("id", "created_at")
    ordering        = ("-created_at",)
    inlines         = [ConversationMemberInline, MessageInline]

    fieldsets = (
        ("Conversation", {"fields": ("id", "type", "name", "cover_url")}),
        ("Linked to",    {"fields": ("trip", "created_by")}),
        ("Timestamps",   {"fields": ("created_at",)}),
    )

    @display(description="ID")
    def id_short(self, obj):
        return str(obj.id)[:8] + "…"

    @display(description="Type", label={"dm": "info", "group": "success"})
    def type_badge(self, obj):
        return obj.type

    @display(description="Name")
    def name_display(self, obj):
        if obj.name:
            return obj.name
        members = obj.memberships.select_related("user").all()[:2]
        names = [m.user.username or m.user.email.split("@")[0] for m in members]
        return " ↔ ".join(names) if names else "—"

    @display(description="Members")
    def member_count(self, obj):
        return obj.memberships.count()

    @display(description="Messages")
    def message_count(self, obj):
        return obj.messages.filter(is_deleted=False).count()


# ─── Message ──────────────────────────────────────────────────────────────────

@admin.register(Message)
class MessageAdmin(ModelAdmin):
    list_display    = ("sender", "conversation_link", "type_badge", "content_preview", "status_badges", "created_at")
    list_filter     = ("message_type", "is_deleted", "is_pinned", "is_edited")
    search_fields   = ("sender__email", "sender__username", "text")
    raw_id_fields   = ("conversation", "sender")
    readonly_fields = ("id", "created_at", "edited_at", "deleted_at")
    ordering        = ("-created_at",)

    fieldsets = (
        ("Message",     {"fields": ("id", "conversation", "sender", "message_type")}),
        ("Content",     {"fields": ("text", "media_url", "duration_seconds", "location_address", "streak_id")}),
        ("Flags",       {"fields": ("is_edited", "edited_at", "is_deleted", "deleted_at", "is_pinned")}),
        ("Timestamps",  {"fields": ("created_at",)}),
    )

    @display(description="Conversation")
    def conversation_link(self, obj):
        return format_html(
            '<a href="/admin/chat/conversation/{}/change/">{}</a>',
            obj.conversation_id,
            str(obj.conversation_id)[:8] + "…",
        )

    @display(description="Type", label={
        "text":        "default",
        "image":       "info",
        "voice":       "warning",
        "location":    "success",
        "streak":      "danger",
        "poll_result": "info",
        "system":      "default",
    })
    def type_badge(self, obj):
        return obj.message_type

    @display(description="Content")
    def content_preview(self, obj):
        if obj.is_deleted:
            return format_html('<span style="color:#ef4444;font-style:italic">Deleted</span>')
        if obj.text:
            preview = obj.text[:60] + ("…" if len(obj.text) > 60 else "")
            return preview
        if obj.media_url:
            return format_html('<span style="color:#60a5fa">[{}]</span>', obj.message_type.upper())
        if obj.location_address:
            return format_html('<span style="color:#4ade80">📍 {}</span>', obj.location_address[:40])
        return "—"

    @display(description="Flags")
    def status_badges(self, obj):
        parts = []
        if obj.is_pinned:
            parts.append('<span style="background:#fbbf2422;color:#fbbf24;padding:1px 6px;border-radius:4px;font-size:10px">📌 Pinned</span>')
        if obj.is_edited:
            parts.append('<span style="background:#60a5fa22;color:#60a5fa;padding:1px 6px;border-radius:4px;font-size:10px">✏️ Edited</span>')
        if obj.is_deleted:
            parts.append('<span style="background:#ef444422;color:#ef4444;padding:1px 6px;border-radius:4px;font-size:10px">🗑 Deleted</span>')
        return format_html(" ".join(parts)) if parts else "—"


# ─── Conversation Member ──────────────────────────────────────────────────────

@admin.register(ConversationMember)
class ConversationMemberAdmin(ModelAdmin):
    list_display    = ("user", "conversation", "role_badge", "muted_badge", "last_read_at", "joined_at")
    list_filter     = ("is_admin", "is_muted")
    search_fields   = ("user__email", "user__username")
    raw_id_fields   = ("conversation", "user")
    readonly_fields = ("joined_at",)
    ordering        = ("-joined_at",)

    @display(description="Role", label={"Admin": "warning", "Member": "default"})
    def role_badge(self, obj):
        return "Admin" if obj.is_admin else "Member"

    @display(description="Muted", label={"Muted": "danger", "Active": "success"})
    def muted_badge(self, obj):
        return "Muted" if obj.is_muted else "Active"


# ─── Support threads ──────────────────────────────────────────────────────────

class AwaitingReplyFilter(admin.SimpleListFilter):
    """Whether the newest surviving message came from the member or from us."""
    title          = "reply status"
    parameter_name = "awaiting"

    def lookups(self, request, model_admin):
        return (("1", "Awaiting our reply"), ("0", "We replied last"))

    def queryset(self, request, queryset):
        if self.value() == "1":
            return queryset.filter(last_is_official=False)
        if self.value() == "0":
            return queryset.filter(last_is_official=True)
        return queryset


@admin.register(SupportThread)
class SupportThreadAdmin(ModelAdmin):
    """
    Read a member's Travel Together thread and answer it.

    Deliberately not a change form. Everything here is read-only except the one
    thing an admin came to do, and that posts through apps.chat.support so the
    reply carries the same invariants as one sent from anywhere else: no
    sender, is_official set, pushed down the member's websocket.
    """
    list_display        = ("member_display", "member_email", "awaiting_badge",
                           "last_message_preview", "message_count", "last_activity")
    list_display_links  = None
    list_filter         = (AwaitingReplyFilter,)
    search_fields       = ("memberships__user__email", "memberships__user__username",
                           "memberships__user__first_name", "memberships__user__last_name")

    # Newest activity first, with never-used threads at the bottom rather than
    # the top — Postgres sorts NULLs first on a descending column, which would
    # otherwise open this screen on every member who has opened chat and said
    # nothing. Expressed here rather than in `ordering`, which takes only names.
    def get_ordering(self, request):
        return [F("last_activity").desc(nulls_last=True)]

    # Support threads are created for the member by apps.chat.support; one made
    # by hand here would have no member attached and could never be delivered.
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        from django.db.models import Max, OuterRef, Subquery
        newest = (
            Message.objects
            .filter(conversation=OuterRef("pk"), is_deleted=False)
            .order_by("-created_at")
        )
        return (
            super().get_queryset(request)
            .filter(type=Conversation.Type.SUPPORT)
            .annotate(
                last_activity    = Max("messages__created_at", filter=Q(messages__is_deleted=False)),
                last_is_official = Subquery(newest.values("is_official")[:1]),
                last_text        = Subquery(newest.values("text")[:1]),
                live_messages    = Count("messages", filter=Q(messages__is_deleted=False), distinct=True),
            )
            .prefetch_related("memberships__user")
            .order_by(F("last_activity").desc(nulls_last=True))
        )

    @display(description="Member")
    def member_display(self, obj):
        u = obj.member
        if not u:
            return "—"
        name = " ".join(filter(None, [u.first_name, u.last_name])) or u.username or u.email
        return format_html(
            '<a href="{}"><strong>{}</strong></a>',
            reverse("admin:chat_supportthread_thread", args=[obj.pk]),
            name,
        )

    @display(description="Email")
    def member_email(self, obj):
        u = obj.member
        return u.email if u else "—"

    @display(description="Status", label={"Awaiting reply": "danger", "Replied": "success", "Empty": "default"})
    def awaiting_badge(self, obj):
        if obj.last_is_official is None:
            return "Empty"
        return "Replied" if obj.last_is_official else "Awaiting reply"

    @display(description="Latest")
    def last_message_preview(self, obj):
        text = obj.last_text
        if not text:
            return "—"
        return text[:70] + ("…" if len(text) > 70 else "")

    @display(description="Messages")
    def message_count(self, obj):
        return obj.live_messages

    @display(description="Last activity")
    def last_activity(self, obj):
        return obj.last_activity

    # ── the thread screen ────────────────────────────────────────────────────

    def get_urls(self):
        from django.urls import path
        custom = [
            path(
                "<uuid:pk>/thread/",
                self.admin_site.admin_view(self.thread_view),
                name="chat_supportthread_thread",
            ),
        ]
        return custom + super().get_urls()

    def thread_view(self, request, pk):
        from django.shortcuts import get_object_or_404, redirect, render
        from django.contrib import messages as django_messages
        from apps.chat.support import post_official

        thread = get_object_or_404(
            SupportThread.objects.filter(type=Conversation.Type.SUPPORT), pk=pk
        )
        if not self.has_view_permission(request, thread):
            raise PermissionDenied
        member = thread.member

        if request.method == "POST":
            # View access is enough to read someone's support thread; sending a
            # message to them in the platform's own voice is not the same act.
            if not self.has_change_permission(request, thread):
                raise PermissionDenied
            text = (request.POST.get("text") or "").strip()
            if not member:
                django_messages.error(request, "This thread has no member to reply to.")
            elif not text:
                django_messages.error(request, "Write something before sending.")
            else:
                post_official(member, text)
                django_messages.success(request, f"Sent to {member.email} as Travel Together.")
            return redirect(reverse("admin:chat_supportthread_thread", args=[pk]))

        context = {
            **self.admin_site.each_context(request),
            "title":      f"Support · {member.email if member else 'unknown member'}",
            "thread":     thread,
            "member":     member,
            "messages_":  thread.messages.filter(is_deleted=False).order_by("created_at")[:300],
            "can_reply":  self.has_change_permission(request, thread),
            "opts":       self.model._meta,
            "changelist_url": reverse("admin:chat_supportthread_changelist"),
        }
        return render(request, "admin/chat/supportthread/thread.html", context)
