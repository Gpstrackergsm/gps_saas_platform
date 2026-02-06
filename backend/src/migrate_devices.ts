import { pool } from './db';

const migrateDevices = async () => {
    try {
        console.log('Migrating devices table...');

        // Check if column exists
        const [columns] = await pool.query<any>(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'gps_platform'}' 
            AND TABLE_NAME = 'devices' 
            AND COLUMN_NAME = 'tenant_id'
        `);

        if (columns.length === 0) {
            console.log('Adding tenant_id column...');
            await pool.query(`
                ALTER TABLE devices 
                ADD COLUMN tenant_id INT,
                ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            `);
            console.log('✅ Column tenant_id added.');
        } else {
            console.log('ℹ️ Column tenant_id already exists.');
        }

        console.log('🎉 Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrateDevices();
