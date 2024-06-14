const express = require("express");
const sql = require("mssql");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config({
  path: "/Users/ayushthapaliya/Desktop/AWS key/untitled folder/root.env",
});

let myinfo = [];

const app = express();
const port = process.env.PORT || 2000;

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

app.use(bodyParser.json());

const corsOptions = {
  origin: ["http://localhost:5173", "https://ayushthapaliya.com"],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200, // For Safari and older browsers
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function connectAndQuery() {
  try {
    const poolConnection = await sql.connect(config);

    console.log("Reading rows from the Table...");
    const resultSet = await poolConnection
      .request()
      .query(`SELECT * FROM dbo.infoContact`);

    myinfo = resultSet.recordset;

    poolConnection.close();
  } catch (err) {
    console.error(err.message);
  }
}

(async () => {
  await connectAndQuery();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
})();

app.get("/data", (req, res) => {
  res.json(myinfo);
});

app.post("/submit", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).send("All fields are required");
  }

  try {
    const poolConnection = await sql.connect(config);
    await poolConnection
      .request()
      .input("name", sql.VarChar, name)
      .input("email", sql.VarChar, email)
      .input("subject", sql.VarChar, subject)
      .input("message", sql.VarChar, message)
      .query(
        "INSERT INTO dbo.infoContact (name, email, subject, message) VALUES (@name, @email, @subject, @message)"
      );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Message From Employer",
      text: `Contact Info:
      Name: ${name}
      Email: ${email}
      Subject: ${subject}
      Message: ${message}`,
      replyTo: email,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.error("Error sending email:", error);
      }
    });

    res.status(200).send("Form submitted successfully");
    poolConnection.close();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error saving data");
  }
});

app.use((err, req, res, next) => {
  console.error("An error occurred:", err);
  res.status(500).send("Internal Server Error");
});
