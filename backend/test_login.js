async function testLogin() {
  try {
    const res = await fetch('http://localhost:5000/api/student/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rollNo: '25260165',
        dateOfBirth: '2000-09-29'
      })
    });
    const data = await res.json();
    console.log('Status Code:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

testLogin();