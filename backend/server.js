require('dotenv').config();
require('./jobs/cornJobs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { addDummyUsers } = require('./controllers/authController');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const searchRoutes = require('./routes/searchRoutes');
const driveRoutes = require('./routes/driveRoutes');
const diplomaRoutes = require('./routes/diplomaRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ **CORS Configuration**
const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200
};

// ✅ **Apply CORS Middleware**
app.use(cors(corsOptions));

// ✅ **Ensure Preflight Requests Work**
app.options("*", cors(corsOptions));

// ✅ **Other Middleware**
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'uploads')));

// ✅ **Debugging Middleware (Logs Every Request)**
app.use((req, res, next) => {
  console.log('🔹 Request:', req.method, req.path);
  console.log('🔹 Request Body:', req.body);
  next();
});

// ✅ **Auto-Emit Data Updated Middleware**
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(body) {
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      if (req.app.get('io')) {
        req.app.get('io').emit('data_updated');
      }
    }
    return originalJson.call(this, body);
  };
  next();
});

// ✅ **Connect to MongoDB**
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    addDummyUsers();
  })
  .catch((error) => console.error('❌ MongoDB connection error:', error));

// ✅ **Mount Routes**
app.use('/api/search', searchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/diplomas', diplomaRoutes);

// ✅ **Basic Route**
app.get('/', (req, res) => {
  res.send('✅ API is running successfully!');
});

// ✅ **Error Handling Middleware**
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: err.message 
  });
});

// ✅ **404 Handler**
app.use((req, res) => {
  res.status(404).json({ message: '❌ Route not found' });
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔹 WebSocket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔹 WebSocket disconnected:', socket.id);
  });
});

// ✅ **Start Server**
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
