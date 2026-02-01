const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken) {
  try {
    console.log('Verifying token with client ID:', process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    console.log('Token verification successful');
    
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    throw error;
  }
}

module.exports = { verifyGoogleToken }; 