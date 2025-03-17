const cookieParser = require("cookie-parser");
const session = require("express-session");
const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cookieParser());

// ENVIRONMENT VARIABLE - SERVER DOMAIN
require("dotenv").config();

app.use(express.static(path.join(__dirname, "public")));
app.use(cors({ origin: process.env.SERVER_ADDRESS, credentials: true }));
app.use(
  session({
    secret: process.env.SECRET_COOKIE_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 5 * 60 * 1000 }, // 5 min session
  })
);

// Middleware
const { stringify } = require("querystring");
const authentication = require("./routes/auth");
const profileRoutes = require("./routes/user");
const homepageRoutes = require("./routes/client");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");
const aboutRoutes = require("./routes/about");
const querryRoutes = require("./routes/querry");
const mailerRoutes = require("./routes/mailer/nodemailer");

// Use routes with a base path
app.use("/api", cartRoutes);
app.use("/api", profileRoutes);
app.use("/api", authentication);
app.use("/api", homepageRoutes);
app.use("/api", orderRoutes);
app.use("/api", aboutRoutes);
app.use("/api", querryRoutes);
app.use("/api/mail/send", mailerRoutes);

// Pages Requests
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/auth", (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    res.sendFile(path.join(__dirname, "private_pages", "login.html"));
  }
});

app.get("/auth/new", (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    res.sendFile(path.join(__dirname, "private_pages", "register.html"));
  }
});

app.get("/auth/edit", (req, res) => {
  res.sendFile(path.join(__dirname, "private_pages", "edit-profile.html"));
});

// =========== Server Assets ================
// CSS
app.get("/auth/assets/css/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "private_assets/css", filename);
  res.sendFile(filePath);
});

// IMGS
app.get("/auth/assets/imgs/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "private_assets/imgs", filename);
  res.sendFile(filePath);
});
// JS
app.get("/auth/assets/js/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "private_assets/js", filename);

  res.sendFile(filePath);
});

// ==========================================

// Serve Database Imgs
app.get("/api/images/:filename", (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, "private_assets/database_imgs", filename);

  const allowedOrigin = process.env.SERVER_ADDRESS;

  const referer = req.get("Referer") || "";
  const origin = req.get("Origin") || "";

  if (!referer.startsWith(allowedOrigin) && !origin.startsWith(allowedOrigin)) {
    return res.status(403).json({ message: "Forbidden: Direct access not allowed" });
  }

  res.set("Content-Type", "image/jpeg");
  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({ message: "Image not found" });
    }
  });
});

// ----------------------------------------------------------------

// 404 Error Page
app.use((req, res) => {
  const url = req.originalUrl;
  res.set("X-Requested-URL", url);
  res.status(404).sendFile(__dirname + "/private_pages/404.html");
});


// Start Server
app.listen(process.env.PORT || 3000, () =>
  console.log(`Server running on ${process.env.SERVER_ADDRESS}`)
);


