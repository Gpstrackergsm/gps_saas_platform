import requests
import sys

BASE_URL = "http://localhost:4000/api"

def verify_backend():
    print("1. Registering new user...")
    register_payload = {
        "email": "verify_user@example.com",
        "password": "SecurePassword123!",
        "companyName": "Verification Logistics"
    }
    try:
        reg_resp = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
        if reg_resp.status_code == 201:
            print("   [SUCCESS] User registered.")
        elif reg_resp.status_code == 400 and "User already exists" in reg_resp.text:
            print("   [INFO] User already exists, proceeding to login.")
        else:
            print(f"   [FAIL] Registration failed: {reg_resp.status_code} {reg_resp.text}")
            return
    except Exception as e:
        print(f"   [FAIL] Connection error: {e}")
        return

    print("2. Logging in...")
    login_payload = {
        "email": "verify_user@example.com",
        "password": "SecurePassword123!"
    }
    login_resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    
    if login_resp.status_code == 200:
        data = login_resp.json()
        token = data.get("token")
        if token:
            print("   [SUCCESS] Login successful. Token received.")
        else:
            print("   [FAIL] Login successful but no token in response.")
            return
    else:
        print(f"   [FAIL] Login failed: {login_resp.status_code} {login_resp.text}")
        return

    print("3. Fetching devices (Protected Route)...")
    headers = {"Authorization": f"Bearer {token}"}
    devices_resp = requests.get(f"{BASE_URL}/devices", headers=headers)
    
    existing_devices = set()
    if devices_resp.status_code == 200:
        devices = devices_resp.json()
        print(f"   [SUCCESS] Fetched devices. Count: {len(devices)}")
        existing_devices = {d['device_id'] for d in devices}
    else:
        print(f"   [FAIL] Failed to fetch devices: {devices_resp.status_code} {devices_resp.text}")

    print("4. Registering Test IMEIs (from Universal Parser)...")
    test_imeis = [
        {"deviceId": "1234567", "name": "Standard Tracker"},
        {"deviceId": "123456789012345", "name": "Heartbeat Tracker"},
        {"deviceId": "359586018966098", "name": "HQ Tracker"}
    ]

    for device in test_imeis:
        if device['deviceId'] in existing_devices:
             print(f"   [INFO] Device {device['deviceId']} already exists.")
             continue
             
        print(f"   Adding device: {device['deviceId']}...")
        add_resp = requests.post(f"{BASE_URL}/devices", json=device, headers=headers)
        if add_resp.status_code == 201:
            print(f"   [SUCCESS] Added {device['deviceId']}")
        else:
            print(f"   [FAIL] Could not add {device['deviceId']}: {add_resp.status_code} {add_resp.text}")

    print("   Backend verification COMPLETE.")

if __name__ == "__main__":
    verify_backend()
