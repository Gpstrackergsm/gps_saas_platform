import requests
import json
from datetime import datetime, timedelta

BASE_URL = 'http://localhost:4000/api'
EMAIL = 'verify_user@example.com'
PASSWORD = 'SecurePassword123!'
DEVICE_ID = '359586018966098'

def get_token():
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={'email': EMAIL, 'password': PASSWORD})
        if res.status_code == 200:
            return res.json()['token']
        print(f"Login failed: {res.text}")
        return None
    except Exception as e:
        print(f"Connection failed: {e}")
        return None

def test_history():
    token = get_token()
    if not token:
        return

    headers = {'Authorization': f'Bearer {token}'}
    
    # Get history for the last 24 hours + 2 hours ahead (future proofing timezone)
    end_date = datetime.now() + timedelta(hours=2)
    start_date = end_date - timedelta(hours=26)
    
    params = {
        'start': start_date.strftime('%Y-%m-%d %H:%M:%S'),
        'end': end_date.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    print(f"Fetching history for {DEVICE_ID} from {params['start']} to {params['end']}...")
    
    try:
        res = requests.get(f"{BASE_URL}/devices/{DEVICE_ID}/history", headers=headers, params=params)
        if res.status_code == 200:
            data = res.json()
            print(f"✅ Success! Retrieved {len(data)} history points.")
            if len(data) > 0:
                print(f"Sample point: {data[0]}")
        else:
            print(f"❌ Failed: {res.status_code} - {res.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_history()
