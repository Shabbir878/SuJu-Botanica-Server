const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

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

    // Fetch product by productId (String)
    app.get("/productByProductId/:productId", async (req, res) => {
      const productId = req.params.productId;

      // Query by productId (a string, not an ObjectId)
      const query = { productId: productId };
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

    // Carts

    // Fetch all cart items
    app.get("/carts", async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    // Add item to cart
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    // Delete cart item by _id (ObjectId)
    app.delete("/carts/:id", async (req, res) => {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).send({ error: "Invalid cart ID" });
      }

      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
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
