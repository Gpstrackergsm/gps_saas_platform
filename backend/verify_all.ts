const API_URL = 'http://localhost:4000/api';

async function run() {
    try {
        console.log('1. Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test_e2e_verify_user@example.com',
                password: 'password123'
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('   Logged in successfully. Token received.');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('2. Adding a device...');
        const deviceId = `dev_${Date.now()}`;
        const addDeviceRes = await fetch(`${API_URL}/devices`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                deviceId: deviceId,
                name: 'Verification Device'
            })
        });
        if (!addDeviceRes.ok) throw new Error(`Add device failed: ${await addDeviceRes.text()}`);
        console.log('   Device added.');

        console.log('3. Fetching devices...');
        const devicesRes = await fetch(`${API_URL}/devices`, { headers });
        if (!devicesRes.ok) throw new Error(`Fetch devices failed: ${await devicesRes.text()}`);
        const devices = await devicesRes.json();
        const device = devices.find((d: any) => d.device_id === deviceId);
        if (!device) throw new Error('Device not found in list');
        console.log('   Device found in list:', device);

        console.log('4. Creating a new tenant (Admin check)...');
        const newTenantName = `Tenant_${Date.now()}`;
        const createTenantRes = await fetch(`${API_URL}/admin/tenants`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: newTenantName,
                adminEmail: `admin_${Date.now()}@example.com`,
                adminPassword: 'password123'
            })
        });
        if (!createTenantRes.ok) throw new Error(`Create tenant failed: ${await createTenantRes.text()}`);
        console.log('   Tenant created successfully.');

        console.log('✅ All checks passed!');
        process.exit(0);
    } catch (err: any) {
        console.error('❌ Verification failed:', err.message);
        process.exit(1);
    }
}

run();
