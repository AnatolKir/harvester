// Test Resend email sending directly
// Run with: node scripts/test-resend.js

const RESEND_API_KEY = 're_gNdHFbXs_GQ9VhUqzqmEWHmYGyDjS75dx';

async function testResend() {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'hello@data.highlyeducated.com',
        to: ['rick@highlyeducated.com'],
        subject: 'Welcome to Highly Educated',
        text: 'Your account has been created. Please confirm your email address.',
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Email sent:', data);
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

testResend();