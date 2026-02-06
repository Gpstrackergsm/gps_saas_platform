import { pool } from './db';

const migrateSimPhone = async () => {
    try {
        console.log('Migrating devices table (sim_phone)...');

        // Check if column exists
        const [columns] = await pool.query<any>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'gps_platform'}' 
            AND TABLE_NAME = 'devices' 
            AND COLUMN_NAME = 'sim_phone'
        `);

        if (columns.length === 0) {
            console.log('Adding sim_phone column...');
            // adding unique constraint
            await pool.query(`
                ALTER TABLE devices 
                ADD COLUMN sim_phone VARCHAR(20) UNIQUE
            `);
            console.log('✅ Column sim_phone added.');
        } else {
            console.log('ℹ️ Column sim_phone already exists.');
        }

        console.log('🎉 Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrateSimPhone();
