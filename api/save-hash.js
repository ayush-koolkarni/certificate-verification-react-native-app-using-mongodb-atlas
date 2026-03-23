require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(cors()); 
app.use(express.json()); 

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable in your .env file');
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('NAME_OF_YOUR_DATABASE'); // Change this to your desired database name in MongoDB Atlas
  
  cachedDb = db;
  return db;
}

// ROUTE 1: UPLOAD & SECURE (The Blockchain)
app.post('/api/save-hash', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.APP_SECRET_TOKEN}`) {
    return res.status(401).json({ message: 'Unauthorized: Invalid Token' });
  }

  try {
    const { hash: pdfHash, timestamp } = req.body;

    if (!pdfHash) return res.status(400).json({ message: 'PDF Hash is required' });

    const db = await connectToDatabase();
    const collection = db.collection('NAME_OF_YOUR_COLLECTION'); // Change this to your desired collection name in MongoDB Atlas

    // Check if this certificate is already on the blockchain
    const isDuplicate = await collection.findOne({ pdfHash: pdfHash });
    if (isDuplicate) {
      console.log(`⚠️ UPLOAD REJECTED: Certificate already exists on the chain.`);
      return res.status(409).json({ message: 'Certificate already secured' });
    }
    
    const previousBlock = await collection.findOne({}, { sort: { _id: -1 } });
    const previousHash = previousBlock ? previousBlock.blockHash : "0000000000000000000000000000000000000000000000000000000000000000";

    const combinedData = previousHash + pdfHash;
    const newBlockHash = crypto.createHash('sha256').update(combinedData).digest('hex');

    const result = await collection.insertOne({
      pdfHash: pdfHash,           
      previousHash: previousHash, 
      blockHash: newBlockHash,    
      appTimestamp: timestamp,
      serverTimestamp: new Date()
    });

    console.log(`\n🔗 New Block Added to Chain! ID: ${result.insertedId}`);
    return res.status(200).json({ message: 'Success', id: result.insertedId });

  } catch (error) {
    console.error('❌ Database Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ROUTE 2: VERIFICATION CHECK
app.post('/api/verify-hash', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.APP_SECRET_TOKEN}`) {
    return res.status(401).json({ message: 'Unauthorized: Invalid Token' });
  }

  try {
    const { hash } = req.body;

    if (!hash) {
      return res.status(400).json({ message: 'Hash is required for verification' });
    }

    const db = await connectToDatabase();
    const collection = db.collection('saved_hashes');

    // Step 1: Find the block claiming to hold this certificate
    const existingRecord = await collection.findOne({ pdfHash: hash });

    if (!existingRecord) {
      console.log(`\n🚨 VERIFICATION FAILED: Certificate not found in database.`);
      return res.status(200).json({ isLegitimate: false }); 
    }

    // Step 2: The Blockchain Math Check
    // We recreate the exact mathematical conditions from the moment it was saved
    const combinedData = existingRecord.previousHash + existingRecord.pdfHash;
    const recalculatedBlockHash = crypto.createHash('sha256').update(combinedData).digest('hex');

    // Step 3: Compare our math with the sealed blockHash
    if (recalculatedBlockHash === existingRecord.blockHash) {
      console.log(`\n✅ BLOCKCHAIN VERIFIED: Cryptographic math is sound.`);
      console.log(`   ├─ Record ID: ${existingRecord._id}`);
      console.log(`   └─ Status: 100% Authentic`);
      return res.status(200).json({ isLegitimate: true });
    } else {
      console.log(`\n🚨 BLOCKCHAIN ALERT: Data tampering detected in database!`);
      console.log(`   ├─ Expected: ${existingRecord.blockHash.substring(0, 15)}...`);
      console.log(`   └─ Actual:   ${recalculatedBlockHash.substring(0, 15)}...`);
      return res.status(200).json({ isLegitimate: false });
    }

  } catch (error) {
    console.error('❌ Verification Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// START THE SERVER
app.listen(PORT, () => {
  console.log(`🚀 Certificate server is running at http://localhost:${PORT}`);
});
