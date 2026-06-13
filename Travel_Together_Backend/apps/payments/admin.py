from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(ModelAdmin):
    list_display  = ("user", "trip", "amount", "currency", "status", "created_at")
    list_filter   = ("status", "currency", "created_at")
    search_fields = ("user__email", "trip__title", "paystack_ref")
    readonly_fields = ("created_at", "updated_at")
    ordering      = ("-created_at",)
