const mongoose = require('mongoose');

const transportEntrySchema = new mongoose.Schema({
  // Unique Entry ID (auto-generated)
  id: {
    type: String,
    unique: true,
    sparse: true // Allows null/undefined during creation, but enforces uniqueness when present
  },
  
  // Basic Information
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  vehicleNo: {
    type: String,
    required: [true, 'Vehicle number is required'],
    trim: true,
    uppercase: true,
    maxlength: [20, 'Vehicle number cannot be more than 20 characters']
  },
  from: {
    type: String,
    required: [true, 'From location is required'],
    trim: true,
    maxlength: [100, 'From location cannot be more than 100 characters']
  },
  to: {
    type: String,
    required: [true, 'To location is required'],
    trim: true,
    maxlength: [100, 'To location cannot be more than 100 characters']
  },

  // Transport Bill Data
  transportBillData: {
    bill: {
      type: Number,
      default: 0
    },
    ms: {
      type: String,
      trim: true,
      maxlength: [50, 'MS cannot be more than 50 characters']
    },
    gstno: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [15, 'GST number cannot be more than 15 characters']
    },
    otherDetail: {
      type: String,
      trim: true,
      maxlength: [500, 'Other details cannot be more than 500 characters']
    },
    srno: {
      type: Number,
      default: 0
    },
    lrno: {
      type: Number,
      default: 0
    },
    lrDate: {
      type: Date,
      default: Date.now
    },
    invoiceNo: {
      type: String,
      trim: true,
      maxlength: [50, 'Invoice number cannot be more than 50 characters']
    },
    consignorConsignee: {
      type: String,
      trim: true,
      maxlength: [200, 'Consignor/Consignee cannot be more than 200 characters']
    },
    handleCharges: {
      type: Number,
      default: 0,
      min: [0, 'Handle charges cannot be negative']
    },
    detention: {
      type: Number,
      default: 0,
      min: [0, 'Detention cannot be negative']
    },
    freight: {
      type: Number,
      default: 0,
      min: [0, 'Freight cannot be negative']
    },
    total: {
      type: Number,
      default: 0,
      min: [0, 'Total cannot be negative']
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING'
    }
  },

  // Owner Data
  ownerData: {
    contactNo: {
      type: Number,
      default: 0
    },
    ownerNameAndAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Owner name and address cannot be more than 500 characters']
    },
    panNo: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [10, 'PAN number cannot be more than 10 characters']
    },
    driverNameAndMob: {
      type: String,
      trim: true,
      maxlength: [100, 'Driver name and mobile cannot be more than 100 characters']
    },
    licenceNo: {
      type: String,
      trim: true,
      maxlength: [50, 'License number cannot be more than 50 characters']
    },
    chasisNo: {
      type: String,
      trim: true,
      maxlength: [50, 'Chassis number cannot be more than 50 characters']
    },
    engineNo: {
      type: String,
      trim: true,
      maxlength: [50, 'Engine number cannot be more than 50 characters']
    },
    insuranceCo: {
      type: String,
      trim: true,
      maxlength: [100, 'Insurance company cannot be more than 100 characters']
    },
    policyNo: {
      type: String,
      trim: true,
      maxlength: [50, 'Policy number cannot be more than 50 characters']
    },
    policyDate: {
      type: Date,
      default: Date.now
    },
    srno: {
      type: Number,
      default: 0
    },
    lrno: {
      type: Number,
      default: 0
    },
    packages: {
      type: Number,
      default: 0,
      min: [0, 'Packages cannot be negative']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    wtKgs: {
      type: Number,
      default: 0,
      min: [0, 'Weight cannot be negative']
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot be more than 500 characters']
    },
    brokerName: {
      type: String,
      trim: true,
      maxlength: [100, 'Broker name cannot be more than 100 characters']
    },
    brokerPanNo: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Broker PAN number cannot be more than 10 characters']
    },
    lorryHireAmount: {
      type: Number,
      default: 0,
      min: [0, 'Lorry hire amount cannot be negative']
    },
    accNo: {
      type: Number,
      default: 0
    },
    otherChargesHamliDetentionHeight: {
      type: Number,
      default: 0,
      min: [0, 'Other charges cannot be negative']
    },
    totalLorryHireRs: {
      type: Number,
      default: 0,
      min: [0, 'Total lorry hire cannot be negative']
    },
    advAmt1: {
      type: Number,
      default: 0,
      min: [0, 'Advance amount 1 cannot be negative']
    },
    advDate1: {
      type: Date,
      default: Date.now
    },
    neftImpsIdno1: {
      type: String,
      trim: true,
      maxlength: [50, 'NEFT/IMPS ID 1 cannot be more than 50 characters']
    },
    advAmt2: {
      type: Number,
      default: 0,
      min: [0, 'Advance amount 2 cannot be negative']
    },
    advDate2: {
      type: Date,
      default: Date.now
    },
    neftImpsIdno2: {
      type: String,
      trim: true,
      maxlength: [50, 'NEFT/IMPS ID 2 cannot be more than 50 characters']
    },
    advAmt3: {
      type: Number,
      default: 0,
      min: [0, 'Advance amount 3 cannot be negative']
    },
    advDate3: {
      type: Date,
      default: Date.now
    },
    neftImpsIdno3: {
      type: String,
      trim: true,
      maxlength: [50, 'NEFT/IMPS ID 3 cannot be more than 50 characters']
    },
    balanceAmt: {
      type: Number,
      default: 0,
      min: [0, 'Balance amount cannot be negative']
    },
    otherChargesHamaliDetentionHeight: {
      type: String,
      trim: true,
      maxlength: [200, 'Other charges description cannot be more than 200 characters']
    },
    deductionInClaimPenalty: {
      type: String,
      trim: true,
      maxlength: [200, 'Deduction description cannot be more than 200 characters']
    },
    finalNeftImpsIdno: {
      type: String,
      trim: true,
      maxlength: [50, 'Final NEFT/IMPS ID cannot be more than 50 characters']
    },
    finalDate: {
      type: Date,
      default: Date.now
    },
    deliveryDate: {
      type: Date,
      default: Date.now
    }
  },

  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Helper function to get financial year
function getFinancialYear(date = new Date()) {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Financial year starts from April (month 4)
  if (currentMonth >= 4) {
    // April to March of next year: FY 2024-25
    return `${currentYear}-${String(currentYear + 1).slice(-2)}`;
  } else {
    // January to March: FY 2023-24
    return `${currentYear - 1}-${String(currentYear).slice(-2)}`;
  }
}

// Pre-save middleware to generate unique ID
transportEntrySchema.pre('save', async function(next) {
  if (!this.id) {
    // Generate unique ID format: TE-FY2024-25-XXXX
    const financialYear = getFinancialYear(this.date || new Date());
    const prefix = `TE-FY${financialYear}-`;
    
    // Find the highest sequence number for this financial year
    const lastEntry = await this.constructor.findOne({
      id: { $regex: `^TE-FY${financialYear}-` }
    }).sort({ id: -1 });
    
    let sequence = 1;
    if (lastEntry) {
      const parts = lastEntry.id.split('-');
      const lastSequence = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
    
    this.id = `${prefix}${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Indexes for better query performance
transportEntrySchema.index({ id: 1 }); // Index for custom ID
transportEntrySchema.index({ userId: 1 });
transportEntrySchema.index({ vehicleNo: 1 });
transportEntrySchema.index({ from: 1, to: 1 });
transportEntrySchema.index({ 'transportBillData.status': 1 });
transportEntrySchema.index({ 'transportBillData.invoiceNo': 1 });
transportEntrySchema.index({ date: -1 });
transportEntrySchema.index({ createdAt: -1 });

// Text search index for search functionality
transportEntrySchema.index({
  id: 'text', // Include custom Entry ID in text search
  vehicleNo: 'text',
  from: 'text',
  to: 'text',
  'transportBillData.invoiceNo': 'text',
  'ownerData.ownerNameAndAddress': 'text'
});

module.exports = mongoose.model('TransportEntry', transportEntrySchema);