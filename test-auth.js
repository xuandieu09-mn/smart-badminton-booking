// Test script to check authentication
// Run this in browser console when at http://localhost:5174

console.log('🔍 Checking Authentication Status...\n');

// 1. Check token
const token = localStorage.getItem('token');
console.log('1. Token exists:', !!token);
if (token) {
  console.log('Token:', token.substring(0, 50) + '...');
}

// 2. Check user data
const userStr = localStorage.getItem('user');
if (userStr) {
  const user = JSON.parse(userStr);
  console.log('2. User data:', user);
  console.log('   - Role:', user.role);
  console.log('   - Email:', user.email);
  console.log('   - Name:', user.name);
  
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    console.error('❌ ERROR: Current user role is', user.role, 'but needs STAFF or ADMIN!');
  } else {
    console.log('✅ User has correct role:', user.role);
  }
} else {
  console.error('❌ No user data found in localStorage');
}

// 3. Test API call
console.log('\n3. Testing /bookings endpoint...');
if (token) {
  fetch('http://localhost:3000/api/bookings', {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ API Response:', data);
    console.log('   Total bookings:', data.total);
    console.log('   CONFIRMED bookings:', data.bookings.filter(b => b.status === 'CONFIRMED').length);
  })
  .catch(err => {
    console.error('❌ API Error:', err);
  });
}

console.log('\n📋 Instructions if not logged in:');
console.log('1. Go to: http://localhost:5174/auth/login');
console.log('2. Login with:');
console.log('   Email: staff@badminton.com');
console.log('   Password: Staff@123');
console.log('3. Return to: http://localhost:5174/staff/checkin');
