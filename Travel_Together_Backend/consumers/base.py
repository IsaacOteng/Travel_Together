"""
Shared consumer behaviour.

Every WebSocket in this project uses the same handshake: the socket is accepted
unauthenticated, and the client's first frame must be
`{"type": "auth", "token": "<access token>"}`. Accepting first is deliberate it
lets us send a structured error the client can act on, rather than a bare close.

The cost is that an accepted-but-unauthenticated socket is free to hold open, so
these must not be allowed to accumulate.
"""

import asyncio


class AuthDeadlineMixin:
    """
    Closes a socket that never authenticates.

    Without this, anyone can open sockets and hold them indefinitely: they cost a
    channel-layer slot and a worker connection each, and no authentication is
    required to get one. A client that is genuinely connecting sends its auth
    frame immediately (the token is already in hand before the socket opens), so
    a short deadline costs a real user nothing.

    Consumers call `start_auth_deadline()` at the end of connect(),
    `cancel_auth_deadline()` once authenticated, and `cancel_auth_deadline()`
    again in disconnect() so the timer never outlives the socket.
    """

    #: Seconds a socket may stay open without authenticating.
    AUTH_DEADLINE_SECONDS = 10

    #: WebSocket close code sent when the deadline expires. 4008 is in the
    #: private-use range; clients treat it the same as an auth failure.
    AUTH_TIMEOUT_CLOSE_CODE = 4008

    def start_auth_deadline(self):
        self._auth_deadline_task = asyncio.ensure_future(self._auth_deadline())

    def cancel_auth_deadline(self):
        task = getattr(self, "_auth_deadline_task", None)
        if task and not task.done():
            task.cancel()
        self._auth_deadline_task = None

    async def _auth_deadline(self):
        try:
            await asyncio.sleep(self.AUTH_DEADLINE_SECONDS)
        except asyncio.CancelledError:
            return
        if getattr(self, "user", None) is None:
            try:
                await self.send_json({
                    "type":   "error",
                    "detail": "Authentication timed out.",
                })
            except Exception:
                pass    # socket may already be gone nothing to tell the client
            await self.close(code=self.AUTH_TIMEOUT_CLOSE_CODE)
