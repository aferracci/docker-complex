const keys = require('./keys');
const redis = require('redis');

console.log("Initializing.....");

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const sub = redisClient.duplicate();

function fib(index) {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
}

sub.on("message", (channel, message) => {
  console.log("channel: " + channel);
  console.log("message: " + message);
  redisClient.hset('values', message, fib(parseInt(message)));
});
sub.subscribe('insert');
console.log("Initialized!");
