/**
 * Test Qdrant Cloud Connection
 * Run this to verify your Qdrant Cloud setup before ingesting documents
 */

require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');
const aiConfig = require('../config/ai.config');

async function testConnection() {
  console.log('\n========================================');
  console.log('🔍 TESTING QDRANT CLOUD CONNECTION');
  console.log('========================================\n');

  // Check configuration
  console.log('📋 Configuration:');
  console.log(`   URL: ${aiConfig.vectorDB.url}`);
  console.log(`   API Key: ${aiConfig.vectorDB.apiKey ? '✓ Set (hidden)' : '✗ Not set'}`);
  console.log(`   Collection: ${aiConfig.vectorDB.collectionName}\n`);

  if (aiConfig.vectorDB.url === ':memory:') {
    console.log('⚠️  WARNING: You are using in-memory mode');
    console.log('   This is NOT recommended for production use.');
    console.log('   Please set up Qdrant Cloud for better performance.\n');
    console.log('📖 See QDRANT_CLOUD_SETUP.md for instructions\n');
    return;
  }

  if (!aiConfig.vectorDB.url.startsWith('http://') && !aiConfig.vectorDB.url.startsWith('https://')) {
    console.log('❌ ERROR: Invalid QDRANT_URL format');
    console.log('   URL must start with http:// or https://');
    console.log('   Example: https://xyz.region.cloud.qdrant.io:6333\n');
    return;
  }

  if (!aiConfig.vectorDB.apiKey) {
    console.log('⚠️  WARNING: No QDRANT_API_KEY set');
    console.log('   Most Qdrant Cloud instances require an API key.\n');
  }

  try {
    console.log('🔌 Attempting connection...');

    const client = new QdrantClient({
      url: aiConfig.vectorDB.url,
      apiKey: aiConfig.vectorDB.apiKey,
      checkCompatibility: false, // Skip version check for cloud compatibility
    });

    // Test connection by getting collections
    const collections = await client.getCollections();
    console.log('✅ Connection successful!\n');

    console.log(`📊 Found ${collections.collections.length} collection(s):`);
    collections.collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Check if our collection exists
    const ourCollection = collections.collections.find(
      col => col.name === aiConfig.vectorDB.collectionName
    );

    if (ourCollection) {
      console.log(`\n✅ Collection "${aiConfig.vectorDB.collectionName}" exists`);

      const info = await client.getCollection(aiConfig.vectorDB.collectionName);
      console.log(`   Points: ${info.points_count}`);
      console.log(`   Vector Size: ${info.config.params.vectors.size}`);
      console.log(`   Distance: ${info.config.params.vectors.distance}`);
    } else {
      console.log(`\n📝 Collection "${aiConfig.vectorDB.collectionName}" does not exist yet`);
      console.log('   It will be created when you run the ingestion script.');
    }

    console.log('\n========================================');
    console.log('✅ QDRANT CLOUD IS READY!');
    console.log('========================================\n');
    console.log('Next step: Run document ingestion');
    console.log('   node scripts/ingestDocuments.js --clear\n');

  } catch (error) {
    console.log('❌ CONNECTION FAILED!\n');
    console.error('Error:', error.message);

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 This looks like an authentication error.');
      console.log('   Check your QDRANT_API_KEY in the .env file.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('timeout')) {
      console.log('\n💡 This looks like a network/DNS error.');
      console.log('   Check your QDRANT_URL in the .env file.');
      console.log('   Make sure you can access the URL from your browser.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection refused.');
      console.log('   The Qdrant instance might not be running.');
      console.log('   Verify the URL is correct and the service is active.');
    }

    console.log('\n📖 See QDRANT_CLOUD_SETUP.md for setup instructions\n');
    process.exit(1);
  }
}

// Run test
testConnection();
