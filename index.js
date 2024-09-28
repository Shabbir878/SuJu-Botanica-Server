const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // Import ObjectId

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x5l5jnh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Utility function to check if a string is a valid ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id) && new ObjectId(id) == id;

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const productCollection = client.db("sujuBotanica").collection("products");
    const cartCollection = client.db("sujuBotanica").collection("carts");
    const paymentCollection = client.db("sujuBotanica").collection("payments");
    const reviewCollection = client.db("sujuBotanica").collection("reviews");
    const categoryCollection = client
      .db("sujuBotanica")
      .collection("categories");

    // Products
    // Fetch all products
    app.get("/allProducts", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    // Fetch product by MongoDB _id (ObjectId)
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;

      // Check if the provided ID is a valid ObjectId
      if (!isValidObjectId(id)) {
        return res.status(400).send({ error: "Invalid product ID" });
      }

      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);

      res.send(result);
    });

    // Add new product
    app.post("/products/addProduct", async (req, res) => {
      const item = req.body;
      const result = await productCollection.insertOne(item);
      res.send(result);
    });

    // Update product by _id (ObjectId)
    app.patch("/products/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;

      if (!isValidObjectId(id)) {
        return res.status(400).send({ error: "Invalid product ID" });
      }

      const filter = { _id: new ObjectId(id) };

      // Prepare the update document
      const updatedDoc = {
        $set: {
          title: item.title,
          details: item.details,
          price: item.price,
          quantity: item.quantity,
          rating: item.rating,
          category: item.category,
          image: item.image,
        },
      };

      const result = await productCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Delete product by _id (ObjectId)
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;

      if (!isValidObjectId(id)) {
        return res.status(400).send({ error: "Invalid product ID" });
      }

      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    // Reviews
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // Payments
    // Payment Intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log(amount, "amount inside the intent");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/payments", async (req, res) => {
      const result = await paymentCollection.find({}).toArray();
      res.send(result); // Send all payments without filtering by email
    });

    // Post Payment Endpoint
    app.post("/payments", async (req, res) => {
      const payment = req.body;

      const paymentResult = await paymentCollection.insertOne(payment);

      // Delete items from the cart based on cartIds
      const query = {
        _id: {
          $in: payment.productIds.map((id) => new ObjectId(id)),
        },
      };

      const deleteResult = await cartCollection.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    });

    // Carts
    app.get("/carts", async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    // POST /carts to add a product to the cart
    app.post("/carts", async (req, res) => {
      const item = req.body;

      // Upsert logic: add if not exists, update if exists
      const query = { productId: item.productId }; // Adjust based on your cart structure
      const update = { $set: item, $setOnInsert: { createdAt: new Date() } }; // Include timestamp if needed
      const options = { upsert: true };

      const result = await cartCollection.updateOne(query, update, options);
      res.send(result);
    });

    // PATCH /carts/:id to update the quantity of a cart item
    app.patch("/carts/:id", async (req, res) => {
      const { id } = req.params; // Grab the cart item ID from URL
      const { quantity } = req.body; // Get the new quantity from the request body

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid cart ID" });
      }

      const query = { _id: new ObjectId(id) };
      const update = { $set: { quantity } };

      const result = await cartCollection.updateOne(query, update);
      res.send(result);
    });

    // DELETE /carts/:id to remove a cart item
    app.delete("/carts/:id", async (req, res) => {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid cart ID" });
      }

      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // Categories
    app.get("/categories", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    app.post("/categories/addCategory", async (req, res) => {
      const { category, description, image } = req.body;

      const existingCategory = await categoryCollection.findOne({ category });
      if (existingCategory) {
        return res.status(400).send({ message: "Category already exists" });
      }
      const newCategory = { category, description, image };
      const result = await categoryCollection.insertOne(newCategory);
      res.send(result);
    });

    // Fetch products by category
    app.get("/products/categories/:categoryName", async (req, res) => {
      const { categoryName } = req.params;

      // Fetch products from the database where the category matches
      const result = await productCollection
        .find({ category: { $regex: new RegExp(categoryName, "i") } }) // Case-insensitive search
        .toArray();

      // If no products are found, return a 404 status
      if (result.length === 0) {
        return res.send(
          { message: `No products found in category: ${categoryName}` },
          404
        );
      }

      // Send the products back to the client
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`SuJu Botanica is running on port: ${port}`);
});
