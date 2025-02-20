import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testKV() {
  try {
    console.log('Testing KV connection...');
    console.log('KV URL:', process.env.KV_REST_API_URL ? 'Set' : 'Not set');
    console.log('KV Token:', process.env.KV_REST_API_TOKEN ? 'Set' : 'Not set');
    
    const { kv } = await import('@vercel/kv');
    
    // Try to set and get a test value
    const testKey = 'test:connection';
    const testValue = { timestamp: new Date().toISOString() };
    
    console.log('\nSetting test value...');
    await kv.set(testKey, testValue);
    
    console.log('Getting test value...');
    const retrieved = await kv.get(testKey);
    
    console.log('\nTest value retrieved:', retrieved);
    
    if (retrieved) {
      console.log('\n✅ KV connection successful!');
    } else {
      console.log('\n❌ KV connection failed - value not retrieved');
    }
    
    // Clean up
    await kv.del(testKey);
    
  } catch (error) {
    console.error('\n❌ KV connection error:', error);
    process.exit(1);
  }
}

testKV(); 