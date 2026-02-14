import socket
import time
import math
from datetime import datetime

HOST = '127.0.0.1'
PORT = 5001
IMEI = '359586018966098'

# Advanced Trajectory: Oulad Ziane -> Casa Port (Approx)
WAYPOINTS = [
    (33.5685, -7.5857), # Start: Gare Routière
    (33.5702, -7.5878), # Moving North-West
    (33.5731, -7.5896), # Intersection
    (33.5780, -7.5950), # Boulevard
    (33.5825, -7.6020), # Near Center
    (33.5880, -7.6080), # Port Approach
    (33.5935, -7.6115), # Casa Port Station
]

current_point_idx = 0
progress = 0.0
SPEED_FACTOR = 0.10 

# Scenario State Machine
SCENARIO_step = 0
SCENARIO_cycle = 0

def interpolate(p1, p2, t):
    lat = p1[0] + (p2[0] - p1[0]) * t
    lng = p1[1] + (p2[1] - p1[1]) * t
    return lat, lng

def get_bearing(lat1, lon1, lat2, lon2):
    dLon = (lon2 - lon1)
    y = math.sin(dLon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLon)
    brng = math.degrees(math.atan2(y, x))
    return (brng + 360) % 360

def format_coord(coord, is_lat):
    absolute = abs(coord)
    degrees = int(absolute)
    minutes = (absolute - degrees) * 60
    if is_lat:
        formatted = f"{degrees:02d}{minutes:07.4f}"
        direction = 'N' if coord >= 0 else 'S'
    else:
        formatted = f"{degrees:03d}{minutes:07.4f}"
        direction = 'E' if coord >= 0 else 'W'
    return formatted, direction

def send_update(sock, lat, lng, speed, course, acc_on, door_open, alarm_type=None):
    now = datetime.now()  # Changed from utcnow() to now() for local time
    date_str = now.strftime("%d%m%y")
    time_str = now.strftime("%H%M%S")
    
    lat_str, lat_dir = format_coord(lat, True)
    lon_str, lon_dir = format_coord(lng, False)
    
    # Construct Status Hex (32-bit typically)
    # Bit 0: ACC (1=On)
    # Bit 1: Door (1=Open)
    status_int = 0
    if acc_on: status_int |= 1
    if door_open: status_int |= 2
    
    # If alarm is present, some protocols put it here or use specific commands
    # For *HQ, alarms are often separate or specific bits. 
    # But for our parser test, we also look for keywords if Standard, but we are sending HQ.
    # Let's map SOS to a specific bit if we were advanced, but for now we rely on the parser 
    # possibly seeing it in a different field or we just trigger 'help me' via standard packet sometimes?
    # Actually, our HQ parser looks for specific bits? No, I commented out the specific drill down.
    # Let's stick to valid *HQ and maybe simulate ALARM by sending a STANDARD packet for SOS?
    # User asked to test "all possibilities".
    
    if alarm_type == 'sos':
         # Send Standard SOS Packet instead of HQ to test variation
         # imei:...,help me, ...
         packet = f"imei:{IMEI},help me,{date_str}{time_str},,F,{time_str},A,{lat_str},{lat_dir},{lon_str},{lon_dir},{speed},;"
    else:
        # Standard HQ Packet
        status_hex = f"{status_int:08X}"
        packet = f"*HQ,{IMEI},V1,{time_str},A,{lat_str},{lat_dir},{lon_str},{lon_dir},{speed:.2f},{course:.2f},{date_str},{status_hex}#"
    
    print(f"Sending: {packet} (Lat: {lat:.5f}, ACC: {acc_on}, Alarm: {alarm_type})")
    sock.sendall(packet.encode('utf-8'))

def main():
    global current_point_idx, progress, SCENARIO_step, SCENARIO_cycle
    
    print(f"Connecting to {HOST}:{PORT}...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((HOST, PORT))
        # Login
        s.sendall(f"(0{IMEI}BP05)".encode('utf-8'))
        time.sleep(1)

        while True:
            # Determine logic based on scenario cycle
            # 0-50: Normal Driving
            # 51-60: Stop & Engine Off
            # 61-65: SOS Alarm
            # 66-something: Resume
            
            SCENARIO_cycle = (SCENARIO_cycle + 1) % 100
            
            acc_on = True
            door_open = False
            alarm = None
            speed = 40.0
            
            p1 = WAYPOINTS[current_point_idx]
            p2 = WAYPOINTS[current_point_idx + 1]
            lat, lng = interpolate(p1, p2, progress)
            course = get_bearing(p1[0], p1[1], p2[0], p2[1])

            if 40 <= SCENARIO_cycle < 45:
                # Idling (Traffic / Stop light) - Reduced to 5 cycles (10s)
                # Verify "Ralenti (Conso)"
                speed = 0.0
                acc_on = True 
            elif 45 <= SCENARIO_cycle < 50:
                # Parked - Reduced to 5 cycles (10s)
                speed = 0.0
                acc_on = False # Engine Off
                # Dont advance progress
            elif 50 <= SCENARIO_cycle < 52:
                # SOS Event! - Reduced to 2 cycles
                speed = 0.0
                acc_on = True
                alarm = 'sos'
            else:
                # Driving
                progress += SPEED_FACTOR
                if progress >= 1.0:
                    progress = 0.0
                    current_point_idx = (current_point_idx + 1) % (len(WAYPOINTS) - 1)

            send_update(s, lat, lng, speed, course, acc_on, door_open, alarm)
            
            time.sleep(2) 

    except Exception as e:
        print(f"Connection error: {e}")
        time.sleep(5)
        main()

if __name__ == '__main__':
    main()
