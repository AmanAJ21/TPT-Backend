const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const TransportEntry = require('../models/TransportEntry');
const connectDB = require('../config/database');

const seedUsers = [
  {
    email: '2710amanj@gmail.com',
    password: 'amanaman',
    uniqueid: 'USER001',
    profile: {
      ownerName: 'Aman',
      companyName: 'DGT',
      mobileNumber: '1234567890',
      address: 'Pune-44',
      gstNumber: '29CCCCC2222C3Z7',
      panNumber: 'CCCCC2222C'
    },
    bank: {
      bankName: 'ICICI Bank',
      accountHolderName: 'Aman',
      accountNumber: '456789123456789',
      ifscCode: 'ICIC0001234',
      bankBranchName: 'Pune'
    },
    role: 'user'
  }
];

const createTransportEntries = (userId) => {
  const entries = [];
  const statuses = [
    ...Array(10).fill('COMPLETED'),
    ...Array(10).fill('IN_PROGRESS'),
    ...Array(5).fill('PENDING'),
    ...Array(5).fill('CANCELLED')
  ];

  const vehicles = ['MH12AB1234', 'MH14CD5678', 'GJ01EF9012', 'KA03GH3456', 'RJ14IJ7890', 'UP16KL2345', 'DL08MN6789', 'TN09OP1234', 'AP28QR5678', 'WB19ST9012'];
  const routes = [
    { from: 'Mumbai', to: 'Pune' },
    { from: 'Delhi', to: 'Jaipur' },
    { from: 'Bangalore', to: 'Chennai' },
    { from: 'Ahmedabad', to: 'Surat' },
    { from: 'Kolkata', to: 'Bhubaneswar' },
    { from: 'Hyderabad', to: 'Vijayawada' },
    { from: 'Pune', to: 'Nashik' },
    { from: 'Chennai', to: 'Coimbatore' },
    { from: 'Jaipur', to: 'Udaipur' },
    { from: 'Surat', to: 'Vadodara' }
  ];

  for (let i = 0; i < 30; i++) {
    const route = routes[i % routes.length];
    const vehicle = vehicles[i % vehicles.length];
    const status = statuses[i];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - (30 - i)); // Spread entries over last 30 days

    entries.push({
      date: baseDate,
      vehicleNo: vehicle,
      from: route.from,
      to: route.to,
      transportBillData: {
        bill: Math.floor(Math.random() * 10000) + 5000,
        ms: `MS${String(i + 1).padStart(3, '0')}`,
        gstno: '29ABCDE1234F1Z5',
        otherDetail: `Transport details for ${route.from} to ${route.to}`,
        srno: i + 1,
        lrno: 1000 + i,
        lrDate: baseDate,
        invoiceNo: `INV${String(i + 1).padStart(4, '0')}`,
        consignorConsignee: `Consignor ${i + 1} / Consignee ${i + 1}`,
        handleCharges: Math.floor(Math.random() * 1000) + 500,
        detention: Math.floor(Math.random() * 500),
        freight: Math.floor(Math.random() * 5000) + 2000,
        total: Math.floor(Math.random() * 8000) + 4000,
        status: status
      },
      ownerData: {
        contactNo: 9876543210 + i,
        ownerNameAndAddress: `Owner ${i + 1}, Address Line ${i + 1}, City ${i + 1}`,
        panNo: `ABCDE${String(1234 + i).slice(-4)}F`,
        driverNameAndMob: `Driver ${i + 1} - ${9876543210 + i}`,
        licenceNo: `DL${String(123456789 + i)}`,
        chasisNo: `CH${String(1000000 + i)}`,
        engineNo: `EN${String(500000 + i)}`,
        insuranceCo: `Insurance Co ${(i % 3) + 1}`,
        policyNo: `POL${String(100000 + i)}`,
        policyDate: baseDate,
        srno: i + 1,
        lrno: 1000 + i,
        packages: Math.floor(Math.random() * 50) + 10,
        description: `Goods description for entry ${i + 1}`,
        wtKgs: Math.floor(Math.random() * 5000) + 1000,
        remarks: `Remarks for entry ${i + 1}`,
        brokerName: `Broker ${(i % 5) + 1}`,
        brokerPanNo: `BROKE${String(1234 + i).slice(-4)}F`,
        lorryHireAmount: Math.floor(Math.random() * 10000) + 5000,
        accNo: 123456789 + i,
        otherChargesHamliDetentionHeight: Math.floor(Math.random() * 1000),
        totalLorryHireRs: Math.floor(Math.random() * 12000) + 6000,
        advAmt1: Math.floor(Math.random() * 3000) + 1000,
        advDate1: baseDate,
        neftImpsIdno1: `NEFT${String(100000 + i)}`,
        advAmt2: Math.floor(Math.random() * 2000),
        advDate2: baseDate,
        neftImpsIdno2: `IMPS${String(200000 + i)}`,
        advAmt3: Math.floor(Math.random() * 1000),
        advDate3: baseDate,
        neftImpsIdno3: `UPI${String(300000 + i)}`,
        balanceAmt: Math.floor(Math.random() * 2000),
        otherChargesHamaliDetentionHeight: `Other charges description ${i + 1}`,
        deductionInClaimPenalty: `Deduction details ${i + 1}`,
        finalNeftImpsIdno: `FINAL${String(400000 + i)}`,
        finalDate: baseDate,
        deliveryDate: new Date(baseDate.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000)) // Random delivery within 7 days
      },
      userId: userId
    });
  }

  return entries;
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await TransportEntry.deleteMany({});

    // Create new users
    console.log('👥 Creating seed users...');
    const createdUsers = await User.create(seedUsers);

    console.log(`✅ Successfully created ${createdUsers.length} users:`);
    createdUsers.forEach(user => {
      console.log(`   - ${user.profile.ownerName} (${user.email}) - ${user.role}`);
    });

    // Create transport entries for the main user
    const mainUser = createdUsers.find(user => user.email === '2710amanj@gmail.com');
    if (mainUser) {
      console.log('🚛 Creating transport entries...');
      const transportEntries = createTransportEntries(mainUser._id);

      // Create entries one by one to avoid duplicate ID conflicts
      const createdEntries = [];
      for (let i = 0; i < transportEntries.length; i++) {
        const entry = new TransportEntry(transportEntries[i]);
        const savedEntry = await entry.save();
        createdEntries.push(savedEntry);
        console.log(`   ✓ Created entry ${i + 1}/30 - ${savedEntry.transportBillData.status}`);
      }

      console.log(`✅ Successfully created ${createdEntries.length} transport entries:`);
      console.log(`   - 10 COMPLETED entries`);
      console.log(`   - 10 IN_PROGRESS (in transit) entries`);
      console.log(`   - 5 PENDING entries`);
      console.log(`   - 5 CANCELLED entries`);
    }

    console.log('🎉 Database seeding completed successfully!');

    // Display login credentials
    console.log('\n📋 Login Credentials:');
    console.log('Main User:');
    console.log('  Email: 2710amanj@gmail.com');
    console.log('  Password: amanaman');
    console.log('  Unique ID: USER001');

  } catch (error) {
    console.error('❌ Error seeding database:', error);

    if (error.name === 'ValidationError') {
      console.error('Validation errors:');
      Object.values(error.errors).forEach(err => {
        console.error(`  - ${err.path}: ${err.message}`);
      });
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the seed function
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedUsers };