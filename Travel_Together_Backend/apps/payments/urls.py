from django.urls import path
from . import views

urlpatterns = [
    path("trips/<uuid:trip_id>/initiate/", views.InitiatePaymentView.as_view(), name="payment-initiate"),
    path("verify/<str:reference>/",        views.VerifyPaymentView.as_view(),    name="payment-verify"),
    path("payout-method/",                 views.PayoutMethodView.as_view(),     name="payout-method"),
    path("webhook/",                       views.PaystackWebhookView.as_view(),  name="payment-webhook"),
]
