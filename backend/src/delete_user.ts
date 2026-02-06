import { pool } from './db';

const deleteUser = async () => {
    const email = 'aitelmaatikhalid@gmail.com';
    try {
        console.log(`Searching for user: ${email}`);
        const [users] = await pool.query<any>('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found.');
            process.exit(0);
        }

        const user = users[0];
        console.log(`Found user ID: ${user.id}, Tenant ID: ${user.tenant_id}`);

        // 1. Delete User
        await pool.query('DELETE FROM users WHERE id = ?', [user.id]);
        console.log('✅ User deleted.');

        // 2. Delete Tenant (if it exists)
        if (user.tenant_id) {
            await pool.query('DELETE FROM tenants WHERE id = ?', [user.tenant_id]);
            console.log('✅ Tenant deleted.');
        }

        console.log('🎉 Cleanup complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Deletion failed:', err);
        process.exit(1);
    }
};

deleteUser();
