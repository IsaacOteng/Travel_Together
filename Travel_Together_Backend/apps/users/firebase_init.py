import json
import os

import firebase_admin
from firebase_admin import credentials

_app = None


def get_firebase_app():
    global _app
    if _app is not None:
        return _app

    service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")

    if service_account_json:
        cred = credentials.Certificate(json.loads(service_account_json))
    elif service_account_path and os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
    else:
        # Google Cloud / Cloud Run: use Application Default Credentials
        cred = credentials.ApplicationDefault()

    _app = firebase_admin.initialize_app(cred)
    return _app
