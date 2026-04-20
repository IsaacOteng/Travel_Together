import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Import consumers after setting the env var
from consumers.location import LocationConsumer
from consumers.chat import ChatConsumer
from consumers.alerts import AlertsConsumer
from consumers.notifications import NotificationsConsumer

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/trips/<uuid:trip_id>/locations/", LocationConsumer.as_asgi()),
            path("ws/trips/<uuid:trip_id>/alerts/",    AlertsConsumer.as_asgi()),
            path("ws/chat/<uuid:conversation_id>/",    ChatConsumer.as_asgi()),
            path("ws/notifications/",                  NotificationsConsumer.as_asgi()),
        ])
    ),
})
