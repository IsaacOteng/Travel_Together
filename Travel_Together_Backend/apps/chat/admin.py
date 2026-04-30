from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import Conversation, ConversationMember, Message, MessageReadReceipt


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
