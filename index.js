const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
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
        const selectedClassesCollection = client.db("SummerCampDB").collection("selected_classes");
        const paymentCollection = client.db("SummerCampDB").collection("payments");



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

            // if (req.decoded.email !== email) {
            //     res.send({ admin: false })
            // }

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


        //selected_class collection apis
        app.get('/selected_classes', async (req, res) => {
            // const email = req.query.email;
            // if(!email){
            //     res.send([])
            // }

            // const decodedEmail = req.decoded.email;
            // if(email !== decodedEmail){
            //     return res.status(401).send({error: true, message: 'Forbidden access!'})
            // }

            // else{
            //     const query = { email: email };
            //     const result = await cartCollection.find(query).toArray();
            //     res.send(result);
            // }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await selectedClassesCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/selected_classes', async (req, res) => {
            const selected_class = req.body;
            console.log(selected_class);
            const result = await selectedClassesCollection.insertOne(selected_class);
            res.send(result);
        })

        app.delete('/selected_classes/:id', async(req, res)=>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id)};
            const result = await selectedClassesCollection.deleteOne(query);
            res.send(result);
        })

        // create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card'],
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        //payment related apis
        app.get('/payments', async (req, res) => {
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const options = {
                // sort matched documents in descending order by rating
                sort: { "date": -1 },
              };
            const result = await paymentCollection.find(query, options).toArray();
            res.send(result);
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);
            const id = payment.selectedClassId;
            const query = { _id:  new ObjectId(id)}
            const deleteResult = await selectedClassesCollection.deleteOne(query);
            res.send({ insertResult, deleteResult });
            //res.send({ insertResult });
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