"""
What a trip needs before anyone else can see it.

Kept in one place because the rules are enforced twice on purpose:

  * TripCreateSerializer — so the normal create path rejects a bad payload
    with per-field errors the form can point at.
  * TripPublishView — so a draft that was assembled some other way (a partial
    create followed by PATCHes, a fixture, the admin) still can't go public
    half-finished. The serializer guards one door; publish guards the room.

Drafts are deliberately allowed to be incomplete — that's what a draft is.
The gate is publication.
"""

from datetime import date

MIN_TITLE_LEN       = 5
MIN_DESCRIPTION_LEN = 20
MIN_SPOTS           = 2      # "group travel" needs someone other than the chief
MAX_SPOTS           = 100


def _blank(value):
    return value is None or not str(value).strip()


def missing_for_publish(trip):
    """
    Return {field: message} for everything that would make `trip` unfit to
    publish. Empty dict means it's good to go.
    """
    problems = {}

    if _blank(trip.title):
        problems["title"] = "Give the trip a title."
    elif len(trip.title.strip()) < MIN_TITLE_LEN:
        problems["title"] = f"Title must be at least {MIN_TITLE_LEN} characters."

    if _blank(trip.destination):
        problems["destination"] = "Say where the trip is going."

    if _blank(trip.description):
        problems["description"] = "Add a description so travellers know what this trip is."
    elif len(trip.description.strip()) < MIN_DESCRIPTION_LEN:
        problems["description"] = (
            f"Description must be at least {MIN_DESCRIPTION_LEN} characters."
        )

    if _blank(trip.meeting_point):
        problems["meeting_point"] = "Set a meeting point — it becomes the departure check-in."

    if trip.date_start is None:
        problems["date_start"] = "Pick a start date."
    if trip.date_end is None:
        problems["date_end"] = "Pick an end date."
    if trip.date_start and trip.date_end and trip.date_end < trip.date_start:
        problems["date_end"] = "The end date can't be before the start date."
    if trip.date_start and trip.date_start < date.today():
        problems["date_start"] = "The start date is in the past."

    if trip.spots_total is None or trip.spots_total < MIN_SPOTS:
        problems["spots_total"] = f"A group trip needs at least {MIN_SPOTS} spots."
    elif trip.spots_total > MAX_SPOTS:
        problems["spots_total"] = f"That's more than {MAX_SPOTS} spots — is it right?"

    if trip.entry_price is None or trip.entry_price < 0:
        problems["entry_price"] = "Price can't be negative. Use 0 for a free trip."

    if not trip.tags.exists():
        problems["tags"] = "Pick at least one tag so the trip can be found."

    return problems
