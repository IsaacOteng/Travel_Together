import asyncio

from django.test import TestCase

from consumers.base import AuthDeadlineMixin


class _FakeSocket(AuthDeadlineMixin):
    """Minimal stand-in exercising just the deadline behaviour."""

    AUTH_DEADLINE_SECONDS = 0.01

    def __init__(self):
        self.user       = None
        self.sent       = []
        self.closed_with = None

    async def send_json(self, payload):
        self.sent.append(payload)

    async def close(self, code=None):
        self.closed_with = code


class AuthDeadlineTests(TestCase):
    """
    Sockets are accepted before authentication so we can return a structured
    error. That makes an unauthenticated socket free to open, so it must not be
    free to keep.
    """

    def test_socket_that_never_authenticates_is_closed(self):
        async def run():
            sock = _FakeSocket()
            sock.start_auth_deadline()
            await asyncio.sleep(0.05)
            return sock

        sock = asyncio.new_event_loop().run_until_complete(run())
        self.assertEqual(sock.closed_with, AuthDeadlineMixin.AUTH_TIMEOUT_CLOSE_CODE)
        self.assertEqual(sock.sent[-1]["detail"], "Authentication timed out.")

    def test_authenticated_socket_is_left_alone(self):
        async def run():
            sock = _FakeSocket()
            sock.start_auth_deadline()
            sock.user = object()            # auth succeeded…
            sock.cancel_auth_deadline()     # …so the consumer disarms the timer
            await asyncio.sleep(0.05)
            return sock

        sock = asyncio.new_event_loop().run_until_complete(run())
        self.assertIsNone(sock.closed_with)
        self.assertEqual(sock.sent, [])

    def test_disconnect_before_the_deadline_leaves_no_stray_timer(self):
        async def run():
            sock = _FakeSocket()
            sock.start_auth_deadline()
            task = sock._auth_deadline_task
            sock.cancel_auth_deadline()     # what disconnect() calls
            await asyncio.sleep(0.05)
            return sock, task

        sock, task = asyncio.new_event_loop().run_until_complete(run())
        self.assertTrue(task.cancelled() or task.done())
        self.assertIsNone(sock.closed_with)
