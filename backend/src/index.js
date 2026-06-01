const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const moderatorRoutes = require('./routes/moderatorRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors()); 
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Mooden API запущено на порту ${PORT}`);
});