
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const UserSettings = require('./userSettingsModel');				
const dotenv = require('dotenv');
dotenv.config();

console.log('MONGODB_URI:', process.env.MONGODB_URI);
				

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const clientId = process.env.EBAY_APP_ID;
const clientSecret = process.env.EBAY_CERT_ID;
const redirectUri = process.env.EBAY_REDIRECT_URI;

const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

app.get('/auth', (req, res) => {
  const authUrl = `https://auth.sandbox.ebay.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope`;
  res.redirect(authUrl);
});

let storedAccessToken = '';
let storedRefreshToken = '';

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const response = await axios.post('https://api.sandbox.ebay.com/identity/v1/oauth2/token', null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedCredentials}`
      },
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }
    });

    const { access_token, refresh_token } = response.data;
    // Store the access token and refresh token for future use
    storedAccessToken = access_token;
    storedRefreshToken = refresh_token;
    res.send('Access token received');
  } catch (error) {
    // Handle error
    res.status(500).send('Error obtaining access token');
  }
});

app.get('/refresh', async (req, res) => {
  try {
    const response = await axios.post('https://api.sandbox.ebay.com/identity/v1/oauth2/token', null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedCredentials}`
      },
      params: {
        grant_type: 'refresh_token',
        refresh_token: storedRefreshToken,
        scope: 'https://api.ebay.com/oauth/api_scope'
      }
    });

    const { access_token, refresh_token: newRefreshToken } = response.data;
    // Update the stored access token and refresh token with the new values
    storedAccessToken = access_token;
    storedRefreshToken = newRefreshToken;
    res.send('Access token refreshed');
  } catch (error) {
    // Handle error
    res.status(500).send('Error refreshing access token');
  }
});

// Add the API routes here

// Route to get eBay categories
app.get('/api/categories', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 3) {
    return res.status(400).send('Search query must be at least 3 characters');
  }

  try {
    const response = await axios.get('https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/0/get_categories_by_keyword', {
      headers: {
        'Authorization': `Bearer ${storedAccessToken}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      },
      params: {
        q
      }
    });

    const categories = response.data.categories;
    res.json(categories);
  } catch (error) {
    // Handle error
    res.status(500).send('Error fetching categories');
  }
});
          
// Route to create an eBay listing
app.post('/api/create-listing', async (req, res) => {
  const listingData = req.body;
  try {
    // Process the listing data and send it to eBay
    // Use the eBay Inventory API to create a listing
    res.send('Listing created');
  } catch (error) {
    // Handle error
    res.status(500).send('Error creating listing');
  }
});

// Route to get user settings
app.get('/api/settings', async (req, res) => {
  const { userId } = req.params;
  try {
    const userSettings = await UserSettings.findOne({ userId });
    res.json(userSettings.settings);
  } catch (error) {
    // Handle error
    res.status(500).send('Error fetching settings');
  }
});

// Route to update user settings
app.put('/api/settings/update', async (req, res) => {
  const { userId, settings } = req.body;
  try {
    await UserSettings.findOneAndUpdate({ userId }, { settings }, { upsert: true });
    res.send('Settings saved');
  } catch (error) {
    // Handle error
    res.status(500).send('Error saving settings');
  }
});

// Route to import policies
app.get('/api/import-policies', async (req, res) => {
  try {
    const response = await axios.get('https://api.sandbox.ebay.com/sell/account/v1/privilege', {
      headers: {
        'Authorization': `Bearer ${storedAccessToken}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
});

const policies = response.data;
    res.json(policies);
  } catch (error) {
    // Handle error
    res.status(500).send('Error fetching policies');
  }
});

// Multer configuration for image uploads
const upload = multer({ dest: 'uploads/' });

// Route to upload images
app.post('/api/upload-image', upload.array('images', 12), async (req, res) => {
  try {
    // Process the uploaded images and send them to eBay
    // You can access the uploaded images using req.files
    res.send('Images uploaded');
  } catch (error) {
    // Handle error
    res.status(500).send('Error uploading images');
  }
});
                  
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
				