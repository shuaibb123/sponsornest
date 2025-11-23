const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dns = require("dns").promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: "http://localhost:3001" })); // Adjust frontend URL
app.use(express.json());

// Hunter.io API Key (Hardcoded)
const HUNTER_API_KEY = "ae759b422e049c0350941bc6ce6514d1f721527a";

// List of common personal email domains
const webmailProviders = new Set([
  "gmail.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "zoho.com",
  "zohomail.com",
  "protonmail.com",
  "proton.me",
  "yandex.com",
  "yandex.ru",
  "ya.ru",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "mail.com",
  "email.com",
  "tutanota.com",
  "tuta.io",
  "hushmail.com",
  "fastmail.com",
  "fastmail.fm",
  "lycos.com",
  "rediffmail.com",
  "rediff.com",
  "runbox.com",
  "mail.ru",
  "bk.ru",
  "list.ru",
  "inbox.ru",
]);

// Function to check if domain has MX records (valid email domain)
async function hasMXRecords(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

// Function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

app.post("/validate-email", async (req, res) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res
      .status(400)
      .json({ valid: false, message: "Invalid email format." });
  }

  const domain = email.split("@")[1];

  // Check if the email belongs to a personal domain
  if (webmailProviders.has(domain)) {
    return res.status(400).json({
      valid: false,
      message:
        "Personal email addresses are not allowed. Use a business email.",
    });
  }

  // Ensure domain has MX records (valid business email domain)
  if (!(await hasMXRecords(domain))) {
    return res.status(400).json({
      valid: false,
      message: "Invalid business email. Domain has no mail servers.",
    });
  }

  try {
    const response = await axios.get(
      "https://api.hunter.io/v2/email-verifier",
      {
        params: { email, api_key: HUNTER_API_KEY },
      }
    );

    const data = response.data.data;
    console.log("Hunter API Response:", JSON.stringify(data, null, 2));

    // Hunter API checks
    if (
      data.webmail ||
      data.disposable ||
      data.role ||
      data.result !== "deliverable" ||
      data.score < 90
    ) {
      return res.status(400).json({
        valid: false,
        message:
          "Invalid or untrusted business email. Please use a valid company email.",
      });
    }

    return res.status(200).json({ valid: true, message: "Email is valid." });
  } catch (error) {
    console.error("Hunter API Error:", error.response?.data || error.message);
    return res
      .status(500)
      .json({ valid: false, message: "Server error, try again later." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
