# 🛠️ GpsSaasPlatform - Troubleshooting & Session Report (Feb 5, 2026)

This report documents the critical issues encountered and resolved during the setup of the mobile app and simulator. **Read this first if you encounter connection or data issues.**

## 🚨 Critical Configuration Rules

### 1. Network Configuration (Mobile App)
The mobile app cannot connect to `localhost`. It must use your machine's local IP address.
*   **Correct IP**: `192.168.1.125` (Your current Mac IP)
*   **Central Config**: All API URLs are defined in:
    *   `mobile/constants/Config.ts`

### 💡 Why does this happen when I change WiFi?
Your computer's address (IP) is assigned by your Router.
*   **WiFi A** might give you `192.168.1.125`
*   **WiFi B** might give you `192.168.11.109`

When you switch WiFi, **your IP changes**. The app on your phone is still looking for the *old* IP, so it fails.
**Solution**: Always check your new IP (`ifconfig`) and update `Config.ts`.

### 2. Port Configuration (Simulator & Backend)
The Backend TCP Server listens on **Port 5001**. The Simulator must send data to this exact port.

*   **Backend Listener**: `backend/src/tcpServer.ts` -> `const PORT = 5001;`
*   **Simulator Sender**: `backend/src/simulator.ts` -> `const PORT = 5001;`

**❌ The Bug We Fixed**: The simulator was configured to send to port **5000**, causing it to run silently without any data reaching the backend.
**✅ Status**: Fixed in `simulator.ts`.

---

## 📉 Issue Log & Fixes

### Issue 1: "No script URL provided" (Mobile)
**Symptoms**: Red screen on mobile app launch.
**Cause**:
1.  Metro Bundler not running.
2.  Backend server not running.
**Fix**:
Run the following in separate terminals:
1.  `npm start` (in `/mobile`)
2.  `bash start_all.sh` (in root)

### Issue 2: App Login Failure
**Symptoms**: Network Error / Axios Error.
**Cause**: App trying to connect to `localhost` or wrongful IP.
**Fix**:
*   Verified IP: `192.168.11.109`
*   Verified Backend running on port 4000.

### Issue 3: Vehicle Menu Not Loading
**Symptoms**: Infinite loading or empty list in "Ma Flotte".
**Cause**: File `files/app/vehicles/index.tsx` had a **hardcoded old IP** (`192.168.11.105`).
**Fix**:
Updated code to use centralized config:
```typescript
import { API_URL } from '../../constants/Config';
```

### Issue 4: "No script URL provided" (Red Screen on Phone)
**Symptoms**: You see a red screen saying "No script URL provided" on your physical iPhone.
**Cause**: The phone cannot reach the Metro Bundler on your Mac.
**Fix**:
1.  **Check WiFi**: Ensure your iPhone and Mac are on the **same WiFi network**.
2.  **Shake the Device**: Shake your phone to open the Developer Menu.
3.  **Configure Bundler**:
    *   Tap **"Configure Bundler"** (or similar).
    *   Enter: `192.168.1.125:8081`
4.  **Reload**: Tap "Reload" or "Reload JS".

### Issue 5: Vehicle Not Moving (Real-time Updates Failed)
**Symptoms**: Simulator running, logs showing activity, but app/web dashboard showed old frozen data.
**Cause**: **Port Mismatch**. Simulator sending to 5000, Backend listening on 5001.
**Fix**:
Updated `backend/src/simulator.ts`:
```typescript
const PORT = 5001; // Was 5000
```

### Issue 5: Vehicle Moving but ACC OFF ("Crazy" State)
**Symptoms**: Vehicle speed > 0 but status shows "Parked" or "ACC OFF".
**Cause**: Simulator was not sending ACC status, and Parser defaulted it to false.
**Fix**:
1.  Updated `parser/tk103.ts` to read 6th parameter.
2.  Updated `simulator.ts` to send ACC=1 when speed > 5.

---

## 🚀 How to Start Everything Correctly

1.  **Start Backend & Simulator**:
    ```bash
    ./start_all.sh
    ```
    *Checks for Docker/DB -> Starts Backend (4000) -> Starts Simulator -> Starts Web (3000)*

2.  **Start Mobile App**:
    ```bash
    cd mobile
    npm start
    ```

3.  **Verify**:
    *   **Mobile**: Reload app, check "Ma Flotte".
    *   **Web**: http://localhost:3000
