from django.urls import path
from apps.chat.views import (
    ConversationListView,
    ConversationDetailView,
    MessageListView,
    MessageDetailView,
    MessagePinView,
    MarkReadView,
    MuteView,
    ChatMediaUploadView,
    SupportConversationView,
)

urlpatterns = [
    # Conversations
    path("",
         ConversationListView.as_view(),
         name="conversation-list"),

    # Must precede the <uuid> route below so "support" is never parsed as an id.
    path("support/",
         SupportConversationView.as_view(),
         name="support-conversation"),
    path("<uuid:conversation_id>/",
         ConversationDetailView.as_view(),
         name="conversation-detail"),

    # Messages
    path("<uuid:conversation_id>/messages/",
         MessageListView.as_view(),
         name="message-list"),
    path("<uuid:conversation_id>/messages/<uuid:message_id>/",
         MessageDetailView.as_view(),
         name="message-detail"),
    path("<uuid:conversation_id>/messages/<uuid:message_id>/pin/",
         MessagePinView.as_view(),
         name="message-pin"),

    # Media upload
    path("<uuid:conversation_id>/upload/",
         ChatMediaUploadView.as_view(),
         name="chat-media-upload"),

    # Conversation actions
    path("<uuid:conversation_id>/read/",
         MarkReadView.as_view(),
         name="conversation-read"),
    path("<uuid:conversation_id>/mute/",
         MuteView.as_view(),
         name="conversation-mute"),
]
