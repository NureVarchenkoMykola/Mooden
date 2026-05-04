const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors()); 
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/user', userRoutes);

// Статистика (винести пізніше)
app.get('/api/stats', (req, res) => {
    res.json({ students: "2.4K", hours: "123,456", tasks: "228" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Mooden API запущено на порту ${PORT}`);
});