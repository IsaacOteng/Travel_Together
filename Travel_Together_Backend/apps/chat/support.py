"""
The Travel Together thread the one conversation each user has with the team.

Everything that the platform itself needs to say to a user lands here: an
announcement from an admin, an acknowledgement that a report was received, and
each subsequent status change on that report. It is deliberately a real
Conversation rather than a separate notifications surface, because the place a
user already checks for "did anyone reply to me" is the chat list. A report that
disappears into an admin queue with no return path is the failure this exists to
prevent.

Invariants this module owns, so nothing else has to know them:

  • Exactly one SUPPORT conversation per user (enforced by the get_or_create on
    a single ConversationMember, not by a unique constraint the table also
    holds group chats).
  • Only the user is a member. Admins post into it via `post_official` without
    joining, so the thread never leaks which staff member is handling a case and
    a departing admin doesn't leave a ghost membership behind.
  • Every message from the team has sender=NULL and is_official=True. The pair
    is what the client keys off to render the Travel Together identity.
"""

from django.conf import settings
from django.db import transaction

from .models import Conversation, ConversationMember, Message

SUPPORT_NAME = "Travel Together"

#: The logo shown as the thread's avatar. Frontend-relative so it is served by
#: the SPA rather than R2 the support avatar must render even when object
#: storage is down, since that is exactly when people come here to complain.
SUPPORT_AVATAR_URL = getattr(settings, "SUPPORT_AVATAR_URL", "/official_logo_nobg.png")


def get_support_conversation(user, create=True):
    """
    The user's Travel Together thread. Returns None only when create=False and
    the thread does not exist yet.
    """
    conv = (
        Conversation.objects
        .filter(type=Conversation.Type.SUPPORT, memberships__user=user)
        .order_by("created_at")
        .first()
    )
    if conv or not create:
        return conv

    with transaction.atomic():
        conv = Conversation.objects.create(
            type      = Conversation.Type.SUPPORT,
            name      = SUPPORT_NAME,
            cover_url = SUPPORT_AVATAR_URL,
        )
        ConversationMember.objects.create(conversation=conv, user=user)
    return conv


def post_official(user, text, *, message_type=Message.MessageType.TEXT,
                  report=None, media_url=None):
    """
    Put a message from the team into `user`'s Travel Together thread.

    `report` attaches the reference card so the client can render status inline
    and link back to the trip. Returns the Message.
    """
    conv = get_support_conversation(user)
    msg = Message.objects.create(
        conversation = conv,
        sender       = None,
        is_official  = True,
        message_type = message_type,
        text         = text,
        media_url    = media_url,
        report_id    = report.id if report else None,
    )
    _broadcast(conv, msg)
    return msg


def post_report_card(report):
    """
    The acknowledgement card posted the moment a report is filed.

    Written from the reporter's point of view they are the only member of this
    thread, and the first thing they need is proof the report exists and a
    reference they can quote.
    """
    where = (
        f'your report about "{report.trip.title}"'
        if report.is_about_a_trip else "your report"
    )
    return post_official(
        report.reporter,
        f"We've received {where}. Reference {report.reference_number}. "
        f"Someone from the team will review it and reply here.",
        message_type = Message.MessageType.REPORT_REF,
        report       = report,
    )


#: What the user is told on each transition. Phrased as an outcome rather than a
#: state name "under_review" means nothing to the person who filed it.
_STATUS_TEXT = {
    "under_review": "A member of the team is now reviewing {ref}. We'll come back to you here.",
    "resolved":     "{ref} has been resolved. If anything still feels unfinished, reply here and we'll pick it back up.",
    "dismissed":    "We've closed {ref} without further action. Reply here if you think we've got this wrong we will look again.",
}


def post_status_change(report, status, note=None):
    """Tell the reporter their report moved. No-op for statuses with nothing to say."""
    template = _STATUS_TEXT.get(status)
    if not template:
        return None
    text = template.format(ref=report.reference_number)
    if note:
        text = f"{text}\n\n{note}"
    return post_official(
        report.reporter, text,
        message_type = Message.MessageType.REPORT_REF,
        report       = report,
    )


def _broadcast(conv, msg):
    """
    Push the message down the websocket, and onto the user's notification
    stream so the chat badge moves without a refresh.

    Best-effort by design: an official message that made it into the database
    has been delivered as far as the user is concerned, and the thread loads it
    on next open. A broken channel layer must not fail a report submission.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from consumers.notifications import user_group
        from .serializers import MessageSerializer

        layer = get_channel_layer()
        if not layer:
            return
        data = MessageSerializer(msg).data
        send = async_to_sync(layer.group_send)
        send(f"chat.{conv.id}", {"type": "chat.new_message", "message": data})

        for uid in conv.memberships.values_list("user_id", flat=True):
            send(user_group(str(uid)), {
                "type": "notification.new",
                "notification": {
                    "id":                f"chatmsg-{data['id']}",
                    "notification_type": "chat_message",
                    "title":             SUPPORT_NAME,
                    "body":              (msg.text or "")[:140],
                    "is_read":           False,
                    "created_at":        data["created_at"],
                    "data":              {"conversation_id": str(conv.id)},
                    "sender_id":         None,
                    "sender_username":   SUPPORT_NAME,
                    "sender_avatar":     SUPPORT_AVATAR_URL,
                },
            })
    except Exception:
        pass
