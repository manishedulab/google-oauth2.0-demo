const { OAuth2Client } = require('google-auth-library');

const oAuth2Client = new OAuth2Client(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Function to get a new access token with the saved refresh token
async function getAccessToken(refreshToken) {
  const { tokens } = await oAuth2Client.refreshToken(refreshToken);

  return tokens.access_token;
}

// Your existing route that requires authentication
app.get('/protected-route', async (req, res) => {
  try {
    // Check if the user is authenticated
    if (!req.isAuthenticated()) {
      res.redirect('/login');
    } else {
      // If the user is authenticated, use their existing access token to access the protected resource
      const accessToken = req.user.accessToken;
      // Your code to use the access token to access the protected resource goes here
      // ...
      
      // If the access token has expired, use the refresh token to get a new access token
      const expiryDate = new Date(req.user.expiryDate);
      if (expiryDate <= new Date()) {
        const newAccessToken = await getAccessToken(req.user.refreshToken);
        req.user.accessToken = newAccessToken;
        req.user.expiryDate = new Date(new Date().getTime() + 3600000).toISOString();
        // Your code to use the new access token to access the protected resource goes here
        // ...
      }

      res.send('Protected resource accessed successfully');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while accessing the protected resource');
  }
});