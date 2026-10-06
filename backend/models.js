const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'organizer', 'event'],
      default: 'user'
    }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
);

// Event Schema
const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      trim: true
    },
    date: {
      type: String,
      required: [true, 'Event date is required']
    },
    time: {
      type: String,
      required: [true, 'Event time is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      default: 0
    },
    seats: {
      type: Number,
      required: [true, 'Available seats is required'],
      min: [0, 'Seats cannot be negative'],
      default: 50
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
      trim: true
    },
    scannerUrl: {
      type: String,
      trim: true
    },
    popularity: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    members: {
      type: String,
      default: '1',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
);

// Registration Schema
const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required']
    },
    name: {
      type: String,
      required: [true, 'Registrant name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Registrant email is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    members: {
      type: String,
      default: '1',
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending'
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Enforce unique registration per user and event
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const Registration = mongoose.model('Registration', registrationSchema);

module.exports = {
  User,
  Event,
  Registration
};
