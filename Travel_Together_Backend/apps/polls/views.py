from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.trips.models import Trip, TripMember
from .models import Poll, PollOption, PollVote
from .serializers import PollSerializer, PollCreateSerializer, CastVoteSerializer, PollVoteSerializer


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_trip_and_membership(trip_id, user):
    try:
        trip = Trip.objects.get(id=trip_id)
    except Trip.DoesNotExist:
        return None, None, Response({"detail": "Trip not found."}, status=404)

    member = TripMember.objects.filter(
        trip=trip, user=user, status=TripMember.Status.APPROVED
    ).first()
    if not member:
        return None, None, Response({"detail": "You are not a member of this trip."}, status=403)

    return trip, member, None


# ─── Poll list + create ───────────────────────────────────────────────────────

class PollListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trip_id):
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        polls = Poll.objects.filter(trip=trip).prefetch_related(
            "options__votes", "votes"
        ).order_by("-created_at")

        return Response(PollSerializer(polls, many=True, context={"request": request}).data)

    def post(self, request, trip_id):
        """Only the chief or a scout can create polls."""
        trip, member, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        if member.role not in (TripMember.Role.CHIEF, TripMember.Role.SCOUT):
            return Response({"detail": "Only the chief or a scout can create polls."}, status=403)

        serializer = PollCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        poll = serializer.save(trip=trip, created_by=request.user)
        return Response(PollSerializer(poll, context={"request": request}).data, status=201)


# ─── Poll detail + delete ─────────────────────────────────────────────────────

class PollDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_poll(self, trip_id, poll_id, user):
        trip, member, err = _get_trip_and_membership(trip_id, user)
        if err:
            return None, None, err
        try:
            poll = Poll.objects.prefetch_related("options__votes", "votes").get(
                id=poll_id, trip=trip
            )
        except Poll.DoesNotExist:
            return None, None, Response({"detail": "Poll not found."}, status=404)
        return poll, member, None

    def get(self, request, trip_id, poll_id):
        poll, _, err = self._get_poll(trip_id, poll_id, request.user)
        if err:
            return err
        return Response(PollSerializer(poll, context={"request": request}).data)

    def delete(self, request, trip_id, poll_id):
        poll, member, err = self._get_poll(trip_id, poll_id, request.user)
        if err:
            return err

        is_creator = poll.created_by_id == request.user.id
        is_chief   = member.role == TripMember.Role.CHIEF
        if not is_creator and not is_chief:
            return Response({"detail": "Only the poll creator or chief can delete this."}, status=403)

        poll.delete()
        return Response(status=204)


# ─── Lock / unlock a poll ─────────────────────────────────────────────────────

class PollLockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id, poll_id):
        trip, member, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err
        if member.role not in (TripMember.Role.CHIEF, TripMember.Role.SCOUT):
            return Response({"detail": "Only the chief or a scout can lock polls."}, status=403)
        try:
            poll = Poll.objects.get(id=poll_id, trip=trip)
        except Poll.DoesNotExist:
            return Response({"detail": "Poll not found."}, status=404)

        poll.is_locked = not poll.is_locked
        poll.save(update_fields=["is_locked"])
        return Response({"is_locked": poll.is_locked})


# ─── Cast / change vote ───────────────────────────────────────────────────────

class VoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id, poll_id):
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        try:
            poll = Poll.objects.prefetch_related("options").get(id=poll_id, trip=trip)
        except Poll.DoesNotExist:
            return Response({"detail": "Poll not found."}, status=404)

        if poll.is_locked:
            return Response({"detail": "This poll is locked."}, status=400)

        if poll.expires_at and timezone.now() > poll.expires_at:
            return Response({"detail": "This poll has expired."}, status=400)

        serializer = CastVoteSerializer(
            data=request.data, context={"poll_type": poll.poll_type}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data

        # Validate option belongs to this poll
        option = None
        if poll.poll_type == Poll.PollType.MULTIPLE_CHOICE:
            try:
                option = poll.options.get(id=data["option_id"])
            except PollOption.DoesNotExist:
                return Response({"detail": "Option not found in this poll."}, status=400)

        vote, created = PollVote.objects.update_or_create(
            poll=poll,
            user=request.user,
            defaults={
                "option":       option,
                "yes_no_value": data.get("yes_no_value"),
                "rating_value": data.get("rating_value"),
                "changed_at":   timezone.now(),
            },
        )

        poll.refresh_from_db()
        return Response(
            PollSerializer(poll, context={"request": request}).data,
            status=201 if created else 200,
        )

    def delete(self, request, trip_id, poll_id):
        """Withdraw a vote."""
        trip, _, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        try:
            poll = Poll.objects.get(id=poll_id, trip=trip)
        except Poll.DoesNotExist:
            return Response({"detail": "Poll not found."}, status=404)

        if poll.is_locked:
            return Response({"detail": "This poll is locked."}, status=400)

        deleted, _ = PollVote.objects.filter(poll=poll, user=request.user).delete()
        if not deleted:
            return Response({"detail": "You have not voted on this poll."}, status=404)

        return Response(status=204)


# ─── Poll results (full voter list, chief/scout only) ─────────────────────────

class PollResultsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trip_id, poll_id):
        trip, member, err = _get_trip_and_membership(trip_id, request.user)
        if err:
            return err

        if member.role not in (TripMember.Role.CHIEF, TripMember.Role.SCOUT):
            return Response({"detail": "Only the chief or a scout can see full results."}, status=403)

        try:
            poll = Poll.objects.prefetch_related("votes__user", "votes__option").get(
                id=poll_id, trip=trip
            )
        except Poll.DoesNotExist:
            return Response({"detail": "Poll not found."}, status=404)

        return Response({
            "poll_id":     str(poll.id),
            "question":    poll.question,
            "total_votes": poll.votes.count(),
            "votes":       PollVoteSerializer(poll.votes.all(), many=True).data,
        })
