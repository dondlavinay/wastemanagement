import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔍 Checking backend health...');

// 1. Check .env file
if (!fs.existsSync('.env')) {
  console.log('❌ .env file missing - creating default...');
  const defaultEnv = `PORT=3001
MONGODB_URI=mongodb+srv://dondlavinayd111_db_user:ven123@vekatsih.rqgsbzi.mongodb.net/wastewise?retryWrites=true&w=majority&connectTimeoutMS=30000&socketTimeoutMS=30000
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development`;
  fs.writeFileSync('.env', defaultEnv);
  console.log('✅ .env file created');
}

// 2. Check node_modules
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
  }
}

// 3. Check uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
  console.log('✅ Uploads directory created');
}

// 4. Test MongoDB connection
console.log('🔗 Testing MongoDB connection...');
try {
  const testConnection = `
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connection successful');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
`;
  fs.writeFileSync('test-db.js', testConnection);
  execSync('node test-db.js', { stdio: 'inherit' });
  fs.unlinkSync('test-db.js');
} catch (error) {
  console.error('❌ MongoDB connection test failed');
}

console.log('🎉 Backend health check complete!');
console.log('Run: npm run dev');