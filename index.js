const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9wjmbrb.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const usersCollection = client.db("SummerCampDB").collection("users");
        const classesCollection = client.db("SummerCampDB").collection("classes");



        //users related apis
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            console.log('existingUser', existingUser);
            if (existingUser) {
                return res.send({ message: 'This User Already Exist!' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        //admin apis
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //instructor apis
        app.get('/users/instructors', async (req, res) => {
            const query = { role: 'instructor' };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        //classes related apis
        app.get('/classes', async (req, res) => {
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await classesCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/classes/approved_classes', async (req, res) => {
            const query = { status: 'Approved' };
            const result = await classesCollection.find(query).toArray();
            res.send(result);
        })


        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = {
                projection: { className: 1, image: 1, instructorName: 1, email: 1, availableSeat: 1, price: 1, status: 1, enrolled_students: 1 },
            };
            const result = await classesCollection.findOne(query, options);
            res.send(result);
        })

        app.post('/classes', async (req, res) => {
            const classData = req.body;
            const result = await classesCollection.insertOne(classData);
            res.send(result);
        })

        app.patch('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedStatus = req.body;
            console.log(updatedStatus);
            const updateDoc = {
                $set: {
                    status: updatedStatus.status
                }
            }
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.put('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const getFeedback = req.body;
            console.log(getFeedback);
            const updateDoc = {
                $set: {
                    feedback: getFeedback.feedback
                }
            }
            const result = await classesCollection.updateOne(filter, updateDoc);
            res.send(result)
        })












        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Summer Camp Server is Running...')
})

app.listen(port, () => {
    console.log(`Summer Camp is running on PORT: ${port}`)
})