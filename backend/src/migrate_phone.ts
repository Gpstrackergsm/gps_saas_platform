import { pool } from './db';

const migratePhone = async () => {
    try {
        console.log('Migrating users table (phone)...');

        // Check if column exists
        const [columns] = await pool.query<any>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'gps_platform'}' 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'phone'
        `);

        if (columns.length === 0) {
            console.log('Adding phone column...');
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN phone VARCHAR(20)
            `);
            console.log('✅ Column phone added.');
        } else {
            console.log('ℹ️ Column phone already exists.');
        }

        console.log('🎉 Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migratePhone();
