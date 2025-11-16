import express from 'express';
import QRCode from '../models/QRCode.js';
import Citizen from '../models/Citizen.js';
import Waste from '../models/Waste.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Generate QR code for citizen
router.post('/generate', auth, async (req, res) => {
  try {
    const citizen = await Citizen.findById(req.user.id);
    if (!citizen) {
      return res.status(404).json({ message: 'Citizen not found' });
    }

    // Check if QR code already exists
    let qrCodeDoc = await QRCode.findOne({ citizenId: citizen._id });
    
    if (!qrCodeDoc) {
      // Generate new QR code
      const qrCodeValue = citizen.qrCode || `WW${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      // Calculate total waste collected
      const wasteData = await Waste.aggregate([
        { $match: { userId: citizen._id, status: 'collected' } },
        { $group: { _id: null, totalWeight: { $sum: '$weight' } } }
      ]);
      
      const totalWaste = wasteData.length > 0 ? wasteData[0].totalWeight : 0;
      
      qrCodeDoc = new QRCode({
        citizenId: citizen._id,
        qrCode: qrCodeValue,
        houseId: citizen.houseId || `HOUSE_${citizen._id.toString().slice(-6)}`,
        citizenName: citizen.name,
        citizenEmail: citizen.email,
        citizenPhone: citizen.phone,
        citizenAddress: citizen.address,
        totalWasteCollected: totalWaste,
        iotData: {
          sensorId: `IOT_${citizen._id.toString().slice(-8)}`,
          currentWeight: Math.floor(Math.random() * 50) + 10, // Mock IoT data
          lastReading: new Date(),
          batteryLevel: Math.floor(Math.random() * 30) + 70,
          status: 'active'
        }
      });
      
      await qrCodeDoc.save();
      
      // Update citizen with QR code if not exists
      if (!citizen.qrCode) {
        citizen.qrCode = qrCodeValue;
        await citizen.save();
      }
    }

    res.json(qrCodeDoc);
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get QR code details by scanning
router.get('/scan/:qrCode', async (req, res) => {
  try {
    const { qrCode } = req.params;
    
    const qrCodeDoc = await QRCode.findOne({ qrCode, isActive: true })
      .populate('citizenId', 'name email phone address profileImage');
    
    if (!qrCodeDoc) {
      return res.status(404).json({ message: 'QR code not found or inactive' });
    }

    // Get latest waste collection data
    const wasteData = await Waste.aggregate([
      { $match: { userId: qrCodeDoc.citizenId._id, status: 'collected' } },
      { $group: { 
          _id: null, 
          totalWeight: { $sum: '$weight' },
          lastCollection: { $max: '$collectedAt' }
        } 
      }
    ]);

    const recentWaste = await Waste.find({ 
      userId: qrCodeDoc.citizenId._id 
    }).sort({ createdAt: -1 }).limit(5);

    // Update total waste collected
    if (wasteData.length > 0) {
      qrCodeDoc.totalWasteCollected = wasteData[0].totalWeight;
      qrCodeDoc.lastCollectionDate = wasteData[0].lastCollection;
      await qrCodeDoc.save();
    }

    // Mock IoT sensor update
    qrCodeDoc.iotData.currentWeight = Math.floor(Math.random() * 50) + 10;
    qrCodeDoc.iotData.lastReading = new Date();
    qrCodeDoc.iotData.batteryLevel = Math.max(20, qrCodeDoc.iotData.batteryLevel - Math.floor(Math.random() * 5));
    await qrCodeDoc.save();

    const response = {
      citizen: {
        id: qrCodeDoc.citizenId._id,
        name: qrCodeDoc.citizenName,
        email: qrCodeDoc.citizenEmail,
        phone: qrCodeDoc.citizenPhone,
        address: qrCodeDoc.citizenAddress,
        profileImage: qrCodeDoc.citizenId.profileImage
      },
      houseId: qrCodeDoc.houseId,
      qrCode: qrCodeDoc.qrCode,
      wasteData: {
        totalCollected: qrCodeDoc.totalWasteCollected,
        lastCollection: qrCodeDoc.lastCollectionDate,
        recentWaste: recentWaste
      },
      iotSensor: qrCodeDoc.iotData,
      lastUpdated: qrCodeDoc.updatedAt
    };

    res.json(response);
  } catch (error) {
    console.error('Scan QR code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get citizen's QR code
router.get('/my-qr', auth, async (req, res) => {
  try {
    const qrCodeDoc = await QRCode.findOne({ citizenId: req.user.id });
    
    if (!qrCodeDoc) {
      return res.status(404).json({ message: 'QR code not found. Please generate one first.' });
    }

    res.json(qrCodeDoc);
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update IoT sensor data (for IoT devices)
router.patch('/iot-update/:qrCode', async (req, res) => {
  try {
    const { qrCode } = req.params;
    const { currentWeight, batteryLevel, status } = req.body;
    
    const qrCodeDoc = await QRCode.findOne({ qrCode });
    
    if (!qrCodeDoc) {
      return res.status(404).json({ message: 'QR code not found' });
    }

    qrCodeDoc.iotData.currentWeight = currentWeight || qrCodeDoc.iotData.currentWeight;
    qrCodeDoc.iotData.batteryLevel = batteryLevel || qrCodeDoc.iotData.batteryLevel;
    qrCodeDoc.iotData.status = status || qrCodeDoc.iotData.status;
    qrCodeDoc.iotData.lastReading = new Date();
    
    await qrCodeDoc.save();

    res.json({ message: 'IoT data updated successfully', iotData: qrCodeDoc.iotData });
  } catch (error) {
    console.error('IoT update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;