// server.js
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/main.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/main.html"));
});

// Initialize Paystack payment
app.post("/initialize-payment", async (req, res) => {
  try {
    const { amount, email, metadata } = req.body;
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // convert to kobo/pesewas
        metadata,
        callback_url: `${process.env.BASE_URL}/payment-success`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

// Paystack webhook
app.post("/webhook", (req, res) => {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash === req.headers["x-paystack-signature"]) {
    const event = req.body;
    if (event.event === "charge.success") {
      const paymentData = event.data;
      const customerName = paymentData.metadata?.customer_name || "Unknown";
      const phoneNumber = paymentData.metadata?.customer_phone || "Unknown";
      const network = paymentData.metadata?.network || "Unknown";
      const plan = paymentData.metadata?.plan || "Unknown";
      const amountPaid = paymentData.amount / 100;

      // Send SMS
      client.messages.create({
        body: `New Data Order:\nCustomer: ${customerName}\nPhone: ${phoneNumber}\nNetwork: ${network}\nPlan: ${plan}\nAmount: GHS ${amountPaid}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.OWNER_PHONE_NUMBER
      }).catch(err => console.error("SMS error:", err));

      // Send WhatsApp
      client.messages.create({
        body: `WhatsApp Alert - New Data Order:\nCustomer: ${customerName}\nPhone: ${phoneNumber}\nNetwork: ${network}\nPlan: ${plan}\nAmount: GHS ${amountPaid}`,
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${process.env.OWNER_PHONE_NUMBER}`
      }).catch(err => console.error("WhatsApp error:", err));

      // Send Email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.OWNER_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD // Use an App Password, not your main password
        }
      });

      const mailOptions = {
        from: process.env.OWNER_EMAIL,
        to: process.env.OWNER_EMAIL,
        subject: "New Data Order Received",
        text: `You have a new data order:\n\nCustomer: ${customerName}\nPhone: ${phoneNumber}\nNetwork: ${network}\nPlan: ${plan}\nAmount: GHS ${amountPaid}`
      };

      transporter.sendMail(mailOptions).catch(err => console.error("Email error:", err));
    }
  }
  res.sendStatus(200);
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});