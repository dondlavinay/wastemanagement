import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const municipalitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  address: String,
  profileImage: String,
  municipalId: String,
  workerId: String,
  role: { 
    type: String, 
    enum: ['admin', 'worker'], 
    default: 'worker'
  }
}, { timestamps: true });

municipalitySchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

municipalitySchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model('Municipality', municipalitySchema);