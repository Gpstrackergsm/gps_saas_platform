import { pool } from './db';
import bcrypt from 'bcryptjs';

const seedUsers = async () => {
    try {
        console.log('Seeding users...');

        // 1. Create Default Tenant
        // Use INSERT IGNORE or check existence
        await pool.execute('INSERT IGNORE INTO tenants (name) VALUES (?)', ['Main Company']);

        const [tenants] = await pool.query<any>('SELECT id FROM tenants WHERE name = ?', ['Main Company']);
        const tenantId = tenants[0].id;

        // 2. Admin User
        const adminEmail = 'gsmkhalid@msn.com';
        const adminPass = await bcrypt.hash('password123', 10);

        const [admins] = await pool.query<any>('SELECT * FROM users WHERE email = ?', [adminEmail]);
        if (admins.length === 0) {
            await pool.execute(
                'INSERT INTO users (email, password_hash, tenant_id, role) VALUES (?, ?, ?, ?)',
                [adminEmail, adminPass, tenantId, 'admin']
            );
            console.log(`✅ Created Admin: ${adminEmail}`);
        } else {
            await pool.execute('UPDATE users SET role = ? WHERE email = ?', ['admin', adminEmail]);
            console.log(`✅ Updated Admin Role: ${adminEmail}`);
        }

        // 3. Client User
        const clientEmail = 'ltdukone@gmail.com';
        const clientPass = await bcrypt.hash('password123', 10);

        const [clients] = await pool.query<any>('SELECT * FROM users WHERE email = ?', [clientEmail]);
        if (clients.length === 0) {
            await pool.execute(
                'INSERT INTO users (email, password_hash, tenant_id, role) VALUES (?, ?, ?, ?)',
                [clientEmail, clientPass, tenantId, 'user']
            );
            console.log(`✅ Created Client: ${clientEmail}`);
        } else {
            await pool.execute('UPDATE users SET role = ? WHERE email = ?', ['user', clientEmail]);
            console.log(`✅ Updated Client Role: ${clientEmail}`);
        }

        console.log('🎉 Seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seedUsers();
