const express = require('express')
const app = express()
const cors = require('cors')
const ObjectId = require('mongodb').ObjectId; 
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGO_URI);
const mongoose = require('mongoose')
const bodyParser = require("body-parser");
require('dotenv').config()
app.use(bodyParser.urlencoded({ extended: false }));


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


mongoose.connect(process.env.MONGO_URI);
mongoose.set('returnOriginal', false)

const exr = new mongoose.Schema({
  username: String,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
})

const Exs = new mongoose.model('exs', exr)

app.post('/api/users', (req, res) => {
  const un = req.body.username
  Exs.create({ username: un }, (e0, r0) => {
    e0 ? console.log(e0)
      : Exs.findOne({ username: un },
        '-__v -log',
        (e1, r1) => {
          e1 ? console.log(e1)
            : res.json(r1)
        })
  })
})

app.post('/api/users/:_id/exercises', (req, res, n) => {
  const id = req.params._id
  let date = req.body.date
  const r1 = {}
  const r = /^\d{4}-\d{2}-\d{2}$/
  //  && date.length == 0
  if (date ==undefined) { date = new Date().toDateString() }
  else if (r.test(date)) { date = new Date(String(date)).toDateString() }
  else {
    return res.json({ error: 'incorrect date format' })
  }
  Exs.update(
    { _id: id },
    {
      $push: {
        log: {
          description: req.body.description,
          duration: req.body.duration,
          date: date
        }
      }
    },
    (e0, r0) => {
      e0 ? console.log('ERROR: -->  ' + e0)
        : Exs.find(
          { _id: id },
          'username log',
          (e0, r0) => {
            e0 ? console.log('ERROR: -->  ' + e0)
              :
              r1._id = r0[0]._id
            r1.username = r0[0].username
            r1.description = r0[0].log[r0[0].log.length - 1].description
            r1.duration = r0[0].log[r0[0].log.length - 1].duration
            r1.date = r0[0].log[r0[0].log.length - 1].date
            res.json(r1)
          })
    })

})

app.get('/api/users',async(req,res)=>{

  try{
    await client.connect();
    const db = client.db('C1').collection('exs')

    const us=db.find({})

    const ar=[]
    await us.forEach(i=>ar.push(i));
    res.json(ar)
  } finally {
    await client.close();
  }

})

app.get('/api/users/:_id/logs', async (req, res) => {

  const id = new ObjectId(req.params._id)
  let {from,to,limit}=req.query
  if(limit !=undefined && limit.length >0)limit=Number(limit)

  try {
    await client.connect();
    const db = client.db('C1').collection('exs')
    const ms = db.find({ _id: id }).project({__v:0,'log._id':0})
    let a 
    for await (const doc of ms) {
      a=doc
    }

    // from
    if(typeof from=='string'){
      from=new Date(from)
      a.log=a.log.filter(d=>new Date(d.date) > from)
    }

    // to
    if(typeof to=='string'){
      to=new Date(to)
      a.log=a.log.filter(d=>new Date(d.date) < to)
    }

    // limit
    if(typeof limit =='number'){
      let s=[]
      for(let t=0;t<limit&&t<a.log.length;t++){
        s.push(a.log[t])
      }
      a.log=s
    }

    // count
    a.count=a.log.length
    res.json(a);
  } finally {
    await client.close();
  }

})
