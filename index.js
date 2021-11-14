const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// watchplanet-firebase

var serviceAccount = require("./watchplanet-firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



//MiddileWare
app.use(cors());
app.use(express.json());


//--------------   Connection String   ------------------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9pvwh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}
async function run() {
    try {
        //--------------   Database Connect ------------------

        await client.connect();


        //--------------   Connect with Databases   ------------------
        const database = client.db('watchPlanet');
        const offersCollections = database.collection('offers');
        const packagesCollections = database.collection('packages');
        const ordersCollections = database.collection('orders');
        const usersCollection = database.collection('users');
        const reviewCollection = database.collection('review');
        //--------------   Get All Offers   ------------------
        app.get('/offers', async (req, res) => {
            const cursor = offersCollections.find({});
            const offers = await cursor.toArray();
            res.send(offers);
        });

        //--------------   Get All Packages    ------------------
        app.get('/packages', async (req, res) => {
            const cursor = packagesCollections.find({});
            const packages = await cursor.toArray();
            res.send(packages);
        });

        //--------------   Get Package using Id    ------------------
        app.get('/packages/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const package = await packagesCollections.findOne(query);
            res.json(package);
        });
           // DELETE products
        app.delete('/packages/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);

            console.log('deleting user with id ', result);

            res.json(result);
        })

        //--------------   Insert New Package    ------------------
        app.post('/package', async (req, res) => {
            const packageDetails = req.body;
            const result = await packagesCollections.insertOne(packageDetails);
            res.send(result)
        });

        //--------------   Insert New Booking    ------------------
        app.post('/booking', async (req, res) => {
            const orderDetails = req.body;
            const result = await ordersCollections.insertOne(orderDetails);
            res.send(result)
        });


        //--------------   Get All Orders    ------------------
        app.get('/orders', async (req, res) => {
            const cursor = ordersCollections.find({});
            const orders = await cursor.toArray();
            res.send(orders);
        });


        //--------------   Get Order Details Using Email    ------------------
        app.get('/orders/:email', async (req, res) => {
            const email = req.params.email;
            const cursor = await ordersCollections.find({ user: email });
            const orders = await cursor.toArray();
            res.json(orders);
        });


        //--------------   Get Order Details Using Id    ------------------
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollections.deleteOne(query);
            res.json(result);
        });


        //--------------   Update Status Using Id    ------------------
        app.get('/orderUpdate/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: "approved"
                },
            };
            const result = await ordersCollections.updateOne(filter, updateDoc, options);
            res.json(result)
        })
    // review
  app.post("/addReview", async (req, res) => {
    const result = await reviewCollection.insertOne(req.body);
    res.send(result);
  });
          app.post("/addUserInfo", async (req, res) => {
    console.log("req.body");
    const result = await usersCollection.insertOne(req.body);
    res.send(result);
    console.log(result);
  });

    // Admin Access adding to database 

     app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if (user?.role === 'admin') {
            isAdmin = true;
        }
        res.json({ admin: isAdmin });
    })

    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        console.log(result);
        res.json(result);
    });

    app.put('/users', async (req, res) => {
        const user = req.body;
        const filter = { email: user.email };
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result);
    });

    app.put('/users/admin', verifyToken, async (req, res) => {
        const user = req.body;
        const requester = req.decodedEmail;
        if (requester) {
            const requesterAccount = await usersCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: user.email };
                const updateDoc = { $set: { role: 'admin' } };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.json(result);
            }
        }
        else {
            res.status(403).json({ message: 'you do not have access to make admin' })
        }

    })

}
    finally {
        // await client.close();
    }
   
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Server is running");
});

app.listen(port, () => {
    console.log("Server is running on Port", port);
})