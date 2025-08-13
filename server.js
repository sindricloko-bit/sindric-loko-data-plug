const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Set up the Paystack secret key from Render's environment variables
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
    console.error("PAYSTACK_SECRET_KEY is not set in environment variables.");
    process.exit(1);
}

// Serve static files. This should be a robust approach for your file structure.
// This assumes all your static files (like index.html, CSS, JS, etc.) are in a folder called 'public'.
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to handle payment initialization
app.post('/initialize-payment', async (req, res) => {
    try {
        const { email, amount, phone_number } = req.body;
        
        // Amount must be in kobo/pesewas (amount * 100)
        const paystackAmount = amount * 100;
        
        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email: email,
            amount: paystackAmount,
            metadata: {
                custom_fields: [
                    {
                        display_name: "Phone Number",
                        variable_name: "phone_number",
                        value: phone_number
                    }
                ]
            },
            callback_url: 'https://sindric-loko-data-plug.onrender.com' // Your app's public URL
        }, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error initializing payment:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to initiate payment', details: error.response ? error.response.data : error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});