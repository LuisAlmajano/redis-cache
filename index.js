// Start Redis server with >redis-server command from the console

const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");

const PORT = process.env.PORT || 5555;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient(REDIS_PORT);

redisClient.connect();
redisClient.on("connect", () => {
  console.log("Connected to Redis!");
});

const app = express();

// Set response
function setResponse(username, repos) {
  return `<h2>${username} has ${repos} repos</h2>`;
}

// Make request to Github to fetch data
async function getRepos(req, res, next) {
  try {
    const { username } = req.params;

    console.log(`Fetching data for user: ${username}`);

    const response = await fetch(`https://api.github.com/users/${username}`);

    const data = await response.json();

    const repos = data.public_repos;

    // Set data to Redis with expiration in 30 secs
    await redisClient.setEx(username, 30, JSON.stringify(repos));
    console.log(`Set ${repos} for user ${username} in Redis`);

    res.send(setResponse(username, repos));
  } catch (error) {
    console.error(
      "Something happened while trying to store data in Redis -",
      error
    );
    res.status(500);
  }
}

// Cache middleware
async function cache(req, res, next) {
  try {
    const { username } = req.params;
    console.log("Username: ", username);

    // Check if we have a cache hit
    const cachedResult = await redisClient.get(username);
    if (cachedResult) {
      console.log("Redis cache hit!");
      res.send(setResponse(username, cachedResult));
    } else {
      next();
    }
  } catch (error) {
    console.error(
      "Something happened while trying to retrieve data from Redis -",
      error
    );
    res.status(500);
  }
}

// Get request with Cache middleware
app.get("/repos/:username", cache, getRepos);

app.listen(PORT, () => {
  console.log(`App listening on ${PORT}`);
});
