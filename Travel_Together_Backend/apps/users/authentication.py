from rest_framework_simplejwt.authentication import JWTAuthentication  # noqa: F401

# Standard Bearer token authentication.
# Reads the JWT access token from the Authorization header:
#   Authorization: Bearer <access_token>
# This makes the backend frontend-agnostic — web, mobile, or any other
# client just includes the header; no cookie handling required.
