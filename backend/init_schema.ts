import { connectDB } from './src/db';

async function run() {
    console.log('Starting manual init...');
    try {
        await connectDB();
        console.log('Manual init done. Checking tables...');
        // We can't easily check tables here without importing mysql again, 
        // but connectDB logs success/failure.

        // Keep it alive for a moment to ensure async ops finish if any (though connectDB awaits)
        setTimeout(() => process.exit(0), 1000);
    } catch (err) {
        console.error('Manual init failed:', err);
        process.exit(1);
    }
}

run();
