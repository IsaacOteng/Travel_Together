"""
Utility used by other apps to create notifications.

Usage:
    from apps.notifications.utils import push

    push(
        recipient  = user,
        notif_type = "join_request",
        title      = "New join request",
        body       = f"{requester.username} wants to join your trip.",
        sender     = requester,          # optional
        trip       = trip,               # optional
        action_url = f"/trips/{trip.id}/members/",  # optional deep-link
        data       = {"member_id": str(requester.id)},  # optional extra payload
    )
"""

from .models import Notification


def _ws_push(notif):
    """
    Fire-and-forget: push the notification to the recipient's WS channel group.
    Runs synchronously inside a Django request cycle — uses async_to_sync so it
    works even when called from a regular (non-async) Django view.
    Safe to call even if channels / Redis is not running (fails silently).
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from consumers.notifications import user_group

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        payload = {
            "id":                str(notif.id),
            "notification_type": notif.notification_type,
            "title":             notif.title,
            "body":              notif.body,
            "is_read":           notif.is_read,
            "created_at":        notif.created_at.isoformat(),
            "data":              notif.data or {},
            "sender_id":         str(notif.sender_id) if notif.sender_id else None,
            "sender_username":   notif.sender.username if notif.sender else None,
            "sender_name":       (notif.sender.first_name or notif.sender.username) if notif.sender else None,
            "sender_avatar":     notif.sender.avatar_url if notif.sender else None,
        }

        async_to_sync(channel_layer.group_send)(
            user_group(str(notif.recipient_id)),
            {"type": "notification.new", "notification": payload},
        )
    except Exception:
        pass  # never let WS errors break the HTTP request


def push(recipient, notif_type, title, body, sender=None, trip=None, action_url=None, data=None):
    """Create a Notification record and push it over WebSocket. Returns the created instance."""
    notif = Notification.objects.create(
        recipient         = recipient,
        sender            = sender,
        notification_type = notif_type,
        title             = title,
        body              = body,
        action_url        = action_url,
        trip              = trip,
        data              = data or {},
    )
    _ws_push(notif)
    return notif


def push_many(recipients, notif_type, title, body, sender=None, trip=None, action_url=None, data=None):
    """Bulk-create the same notification for multiple recipients (excludes sender)."""
    objs = [
        Notification(
            recipient         = r,
            sender            = sender,
            notification_type = notif_type,
            title             = title,
            body              = body,
            action_url        = action_url,
            trip              = trip,
            data              = data or {},
        )
        for r in recipients
        if r != sender
    ]
    created = Notification.objects.bulk_create(objs)
    for notif in created:
        _ws_push(notif)
