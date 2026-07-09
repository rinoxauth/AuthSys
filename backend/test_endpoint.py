import requests
import json

urls = {
    "Render": "https://authsys-vtdu.onrender.com/api/v1/client/init",
    "Vercel": "https://auth-sys-7xqx.vercel.app/api/v1/client/init"
}

payload = {
    "app_secret": "d439bc498e7e0e7d4b80746a05b0447a7bae41eac2ec32dc7dec329a30a87372",
    "version": "1.0.0",
    "app_name": "Rinox",
    "hwid": "test_hwid"
}

for name, url in urls.items():
    try:
        print(f"Testing {name} ({url})...")
        r = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        print(f"Status Code: {r.status_code}")
        print(f"Response: {r.text}\n")
    except Exception as e:
        print(f"Failed: {e}\n")
