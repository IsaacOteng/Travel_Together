from django.urls import path
from apps.users.views import (
    SendOTPView,
    VerifyOTPView,
    TokenRefreshView,
    GoogleAuthView,
    AppleAuthView,
    FirebaseAuthView,
    LogoutView,
    AccountDeleteView,
    CheckUsernameView,
)

urlpatterns = [
    path("send-otp/",      SendOTPView.as_view(),      name="auth-send-otp"),
    path("verify-otp/",    VerifyOTPView.as_view(),     name="auth-verify-otp"),
    path("token/refresh/", TokenRefreshView.as_view(),  name="auth-token-refresh"),
    path("firebase/",      FirebaseAuthView.as_view(),  name="auth-firebase"),
    path("google/",        GoogleAuthView.as_view(),    name="auth-google"),
    path("apple/",         AppleAuthView.as_view(),     name="auth-apple"),
    path("logout/",        LogoutView.as_view(),        name="auth-logout"),
    path("account/",        AccountDeleteView.as_view(), name="auth-account-delete"),
    path("check-username/", CheckUsernameView.as_view(), name="auth-check-username"),
]
