const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});
pgClient.on('error', () => console.log('Lost PG connection'));

pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(err => console.log(err));

// Redis Client Setup
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
redisClient.on("error", function(err){
  console.log("Redis Error: " + err);
});
const redisPublisher = redisClient.duplicate();
const sub = redisPublisher.duplicate();
// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi');
});

app.get('/values/all', async (req, res) => {
  console.log("/values/all");
  const values = await pgClient.query('SELECT * from values');
  console.log("values: " + values.rows);
  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  console.log("/values/all");
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
    console.log("values: " + err);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  console.log("inserting index: " + index);
  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  sub.on("message", (channel, message) => {
    console.log("channel: " + channel);
    console.log("message: " + message);
    redisClient.hset('values', message, fib(parseInt(message)));
  });
  res.send({ working: true });
});

app.listen(5000, err => {
  console.log('Listening');
});
