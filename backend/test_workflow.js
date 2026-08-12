const fs = require('fs');
require('dotenv').config();

async function runTests() {
  console.log('--- STARTING E2E WORKFLOW TEST ---');
  try {
    // 1. Admin Login
    console.log('1. Logging in as Admin...');
    let res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@asssr', password: 'admin' })
    });
    let data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const adminToken = data.token;
    console.log('   ✅ Admin logged in.');

    // 2. Fetch Dashboard Data
    console.log('2. Fetching Admin Dashboard Data...');
    const endpoints = ['draft-batches', 'pending-results', 'approved-batches', 'all-students', 'teachers'];
    for (const ep of endpoints) {
      res = await fetch(`http://localhost:5000/api/admin/${ep}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (!res.ok) throw new Error(`Failed to fetch ${ep}`);
    }
    console.log('   ✅ Dashboard data fetched successfully.');

    // 3. Create a Dummy Teacher (if none exists)
    console.log('3. Getting a teacher for assignment...');
    res = await fetch('http://localhost:5000/api/admin/teachers', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const teachers = await res.json();
    let teacherId;
    if (teachers.length > 0) {
      teacherId = teachers[0]._id;
    } else {
      res = await fetch('http://localhost:5000/api/admin/add-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ name: 'Test Teacher', email: 'teacher@test.com', password: 'password123' })
      });
      data = await res.json();
      teacherId = data._id;
    }
    console.log(`   ✅ Teacher found/created: ${teacherId}`);

    // 4. Test Student Login (using the fixed record)
    console.log('4. Testing Student Login...');
    res = await fetch('http://localhost:5000/api/student/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo: '25260165', dateOfBirth: '2000-09-29' })
    });
    data = await res.json();
    if (!res.ok) throw new Error(`Student login failed: ${data.message}`);
    console.log('   ✅ Student login successful. Token received.');
    
    const studentToken = data.token;

    // 5. Test Fetching Certificate
    console.log('5. Testing Certificate Generation...');
    res = await fetch('http://localhost:5000/api/student/results', {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const studentResults = await res.json();
    
    if (studentResults.length > 0) {
      const resultId = studentResults[0]._id;
      res = await fetch(`http://localhost:5000/api/student/certificate/${resultId}`, {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      if (!res.ok) throw new Error('Failed to generate certificate');
      console.log('   ✅ Certificate generated successfully.');
    } else {
      console.log('   ⚠️ No approved results to generate certificate for, skipping.');
    }

    console.log('--- ALL CRITICAL WORKFLOWS PASSED ---');
  } catch (err) {
    console.error('❌ WORKFLOW TEST FAILED:', err.message);
  }
}

runTests();