const session = require("express-session");
const { MongoClient } = require("mongodb");
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const axios = require("axios");
const path = require("path");

require("dotenv").config();

const sendNodeMail = require('./mailer/nodemailer');
const { orderPlacedTemplate } = require('./mailer/mailtemplates');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        return client.db("NexaEaseDB");
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
        throw err;
    }
}

// Short Functions
function sanitizeString(str) {
    return str.replace(/[.#$\[\]]/g, "");
}

function capitalizeWords(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

// ==========================================================================================================

// Submit Order Route
router.post("/place-order", async (req, res) => {
    if (!req.session.user || !req.session.user.email)
        return res.status(401).json({ message: "User not authenticated" });

    const email = req.session.user.email;

    function generateOrderNumber(userId) {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const options = { timeZone, year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
        const now = new Intl.DateTimeFormat('en-US', options).format(new Date()).split(", ");
        const [date, time] = now;
        const [month, day, year] = date.split("/");
        const compactDate = `${day}${month}${year}`;
        const currentTime = time.replace(":", "");
        const userIdSuffix = userId.toString().slice(-6).toUpperCase(); // Last 6 chars of user_id

        return `NE${compactDate}${currentTime}${userIdSuffix}`;
    }

    try {
        const db = await connectDB();
        const usersCollection = db.collection("users");
        const productsCollection = db.collection("products");
        const ordersCollection = db.collection("orders");

        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });

        if (!user.cart || Object.keys(user.cart).length === 0) {
            return res.status(400).json({ error: "Cart is empty" });
        }

        const cartItems = await Promise.all(
            Object.entries(user.cart).map(async ([productId, details]) => {
                const product = await productsCollection.findOne({ p_id: productId });
                if (product) {
                    return {
                        p_id: productId,
                        p_name: product.p_name,
                        quantity: details.qty,
                        price: product.s_price
                    };

                }
                return null;
            })
        );

        const validCartItems = cartItems.filter(item => item !== null);
        if (validCartItems.length === 0) {
            return res.status(400).json({ error: "No valid products in cart" });
        }

        const totalAmount = validCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const formattedDate = new Date().toLocaleString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
            day: "numeric",
            month: "long",
            year: "numeric",
            hour12: false,
        });

        const newOrder = {
            orderNumber: generateOrderNumber(user._id),
            user_id: user._id,
            email: user.email,
            items: validCartItems,
            total: totalAmount,
            status: "Pending",
            createdAt: formattedDate,
        };

        const result = await ordersCollection.insertOne(newOrder);

        await usersCollection.updateOne({ _id: user._id }, { $set: { cart: {} } });

        try {
            await sendNodeMail(email, "NexaEase - Your Order Has Been Placed Successfully!",orderPlacedTemplate(newOrder));
            console.log(`Order Confirmation Sent To ${email} Successfully`);
        } catch (error) {
            console.log(error)
        }

        res.status(201).json({ message: "Order placed successfully!", orderId: result.insertedId });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;

