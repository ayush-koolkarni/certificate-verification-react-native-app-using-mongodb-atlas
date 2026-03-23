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
  const db = client.db('Certify'); 
  
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
    const collection = db.collection('saved_hashes');

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
  // 1. Security Check (Same as the save route)
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

    // 2. Search the database for this exact PDF hash
    const existingRecord = await collection.findOne({ pdfHash: hash });

    // 3. Return the result to the React Native app
    if (existingRecord) {
      console.log(`\n✅ VERIFICATION SUCCESS: Found legitimate certificate in database.`);
      console.log(`   └─ Match ID: ${existingRecord._id}`);
      return res.status(200).json({ isLegitimate: true });
    } else {
      console.log(`\n🚨 VERIFICATION FAILED: Certificate tampered with or not in database.`);
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