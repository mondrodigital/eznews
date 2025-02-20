import dotenv from 'dotenv';
import Redis from 'ioredis';
import path from 'path';

// Load environment variables from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testRedis() {
  if (!process.env.REDIS_URL) {
    console.error('Error: REDIS_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Testing Redis connection...');
  const redis = new Redis(process.env.REDIS_URL);

  try {
    // Test setting a value
    const testKey = 'test:connection';
    const testValue = { timestamp: Date.now(), message: 'Redis connection test' };
    
    console.log('\nSetting test value...');
    await redis.set(testKey, JSON.stringify(testValue));
    
    // Test getting the value back
    console.log('Retrieving test value...');
    const retrievedValue = await redis.get(testKey);
    
    if (!retrievedValue) {
      throw new Error('Failed to retrieve test value');
    }
    
    console.log('\nTest successful!');
    console.log('Retrieved value:', JSON.parse(retrievedValue));
    
    // Clean up test key
    console.log('\nCleaning up test data...');
    await redis.del(testKey);
    
    // List all keys (for debugging)
    console.log('\nCurrent keys in database:');
    const keys = await redis.keys('*');
    console.log(keys);
    
  } catch (error) {
    console.error('\nError testing Redis connection:', error);
    process.exit(1);
  } finally {
    // Close Redis connection
    await redis.quit();
  }
}

testRedis(); 