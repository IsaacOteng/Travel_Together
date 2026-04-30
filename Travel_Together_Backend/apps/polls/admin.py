from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import Poll, PollOption, PollVote


class PollOptionInline(TabularInline):
    model           = PollOption
    extra           = 2
    fields          = ("text", "order", "vote_count")
    readonly_fields = ("vote_count",)

    @display(description="Votes")
    def vote_count(self, obj):
        return obj.votes.count()


@admin.register(Poll)
class PollAdmin(ModelAdmin):
    list_display    = ("question_short", "type_badge", "trip", "created_by", "locked_badge", "vote_count", "created_at")
    list_filter     = ("poll_type", "is_locked")
    search_fields   = ("question", "trip__title", "created_by__email")
    raw_id_fields   = ("trip", "created_by")
    readonly_fields = ("id", "created_at")
    inlines         = [PollOptionInline]

    @display(description="Question")
    def question_short(self, obj):
        return obj.question[:60]

    @display(description="Votes")
    def vote_count(self, obj):
        return obj.votes.count()

    @display(description="Type", label={"yes_no": "default", "multiple_choice": "info", "rating": "warning"})
    def type_badge(self, obj):
        return obj.poll_type

    @display(description="Locked", label={"Locked": "danger", "Open": "success"})
    def locked_badge(self, obj):
        return "Locked" if obj.is_locked else "Open"


@admin.register(PollVote)
class PollVoteAdmin(ModelAdmin):
    list_display    = ("poll", "user", "option", "yes_no_value", "rating_value", "voted_at")
    search_fields   = ("user__email", "poll__question")
    raw_id_fields   = ("poll", "user", "option")
    readonly_fields = ("voted_at",)
    ordering        = ("-voted_at",)
