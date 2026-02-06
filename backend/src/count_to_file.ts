import { pool } from './db';
import fs from 'fs';
import path from 'path';

const checkData = async () => {
    try {
        const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM positions');
        const count = rows[0].count;
        console.log(`Count: ${count}`);
        fs.writeFileSync(path.join(__dirname, '../count.txt'), `COUNT=${count}`);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        fs.writeFileSync(path.join(__dirname, '../count.txt'), `ERROR=${error}`);
        process.exit(1);
    }
};

checkData();
