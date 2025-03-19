const session = require("express-session");
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const axios = require("axios");
const path = require("path");

require("dotenv").config();

const connectDB = require('../config/connectmongo');
const restoreSessionMiddleware = require("../middlewares/restoreSession");

// Short Functions
function sanitizeString(str) {
  return str.replace(/[.#$\[\]]/g, "");
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

// ==========================================================================================================

router.post("/products", async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "Invalid product IDs" });
    }

    const db = await connectDB();
    const productsCollection = db.collection("products");

    const products = await productsCollection
      .find({ p_id: { $in: productIds } })
      .toArray();

    if (products.length === 0) {
      return res.status(404).json({ message: "Products not found" });
    }

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// ==========================================================================================================

router.get("/cart/", async (req, res) => {
  if (!req.session.user || !req.session.user.email)
    return res.status(401).json({ message: "User not authenticated" });

  const email = req.session.user.email;

  try {
    const db = await connectDB();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email: email });

    if (!user || !user.fullName) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ cart: user.cart || {} });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/cart/items", async (req, res) => {
  if (!req.session.user || !req.session.user.email)
    return res.status(401).json({ redirect: 'auth', message: 'Unauthorized' });

  const email = req.session.user.email;

  try {
    const { productId } = req.body;

    if (!email || !productId) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.cart && user.cart[productId]) {
      return res.json({ message: "Product is already in cart" });
    } else {
      await usersCollection.updateOne(
        { email: email },
        { $set: { [`cart.${productId}`]: { qty: 1 } } }
      );
    }

    return res.json({ message: "Product added to cart successfully!" });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cart/items/", async (req, res) => {
  const email = req.session.user.email;

  try {
    const { productId, action } = req.body;

    if (!email || !productId || !["increase", "decrease"].includes(action)) {
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    const db = await connectDB();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.cart || !user.cart[productId]) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    let qty = user.cart[productId].qty;
    if (action === "increase") {
      qty += 1;
    } else if (action === "decrease" && qty > 1) {
      qty -= 1;
    }

    await usersCollection.updateOne(
      { email: email },
      { $set: { [`cart.${productId}.qty`]: qty } }
    );
    return res.json({ message: "Cart updated successfully", qty });
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cart/items/", async (req, res) => {
  if (!req.session.user || !req.session.user.email)
    return res.status(401).json({ message: "User not authenticated" });


  const email = req.session.user.email;
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  try {
    const db = await connectDB();
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.cart || !user.cart[productId]) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    await usersCollection.updateOne(
      { email: email },
      { $unset: { [`cart.${productId}`]: "" } }
    );

    return res.json({ message: "Product removed from cart successfully!" });
  } catch (error) {
    console.error("Error removing from cart:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;

// ==========================================================================================================
