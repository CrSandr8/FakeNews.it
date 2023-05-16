const axios = require("axios");
const { json } = require("express");
const { Client } = require("pg");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// DB Configuration
const pgConfig = {
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
};

// Cloudinary Configuration
cloudinary.config({
  cloud_name: "dzqwautro",
  api_key: "597269481327486",
  api_secret: "InuLzGq8fcVJqntmJ-GRjcz7yOo",
});

// OpenAI API Calls
const temperature = 1;
const model = "text-davinci-003";
const apiKey = process.env.OPENAI_API_KEY;
console.log(process.env.OPENAI_API_KEY);

let apiUrl = "https://api.openai.com/v1/completions";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${apiKey}`,
};

// GENERATE TITLE
async function generateTitle(category) {
  const params = {
    model: model,
    prompt: "Imagine you are a journalist in a fictional world, . Write a concise title for a " + category + "news: ",
    temperature: temperature,
    max_tokens: 30,
  };
  console.log("\n[generateTitle] API Call...");
  return await axios
    .post(apiUrl, params, { headers: headers })
    .then((response) => {
      const title = response.data.choices[0].text.trim().replace(/["']/g, '');
      console.log("[generateTitle] Title generated!\n---> " + title);
      return title;
    })
    .catch((error) => {
      console.error("[generateTitle] Error during title generation: ", error);
    });
}

// GENERATE CONTENT
async function generateContent(titlePrompt) {
  const contentParams = {
    model: model,
    prompt: "Write the content for the news '" + titlePrompt + "':",
    temperature: temperature,
    max_tokens: 800,
  };
  console.log("\n[generateContent] API Call...");
  return await axios
    .post(apiUrl, contentParams, { headers: headers })
    .then((response) => {
      const content = response.data.choices[0].text.trim();
      console.log("[generateContent] Content generated!\n---> " + content);
      return response.data.choices[0].text.trim().replace(/["']/g, '');
    })
    .catch((error) => {
      console.error("[generateContent] Error during content generation: ", error);
    });
}

// GENERATE IMAGE
async function generateImage(titlePrompt) {
  const imageApiUrl = "https://api.openai.com/v1/images/generations";

  const imageParams = {
    prompt: titlePrompt + ", realistic photograph",
    n: 1,
    size: "1024x1024",
  };
  console.log("\n[generateImage] API Call...");
  return await axios
    .post(imageApiUrl, imageParams, { headers: headers })
    .then((response) => {
      const url = response.data.data[0].url;
      console.log("[generateImage] Image generated!\n---> " + url);
      return response.data.data[0].url;
    })
    .catch((error) => {
      if (error.response) {
        console.log("[generateImage] Avatar error status: ", error.response.status);
        console.log("[generateImage] Avatar error data: ", error.response.data);
      } else {
        console.log("[generateImage] Avatar error message: ", error.message);
      }
    });
}

// INSERT DATA INTO DB
async function insertIntoDB(title, content, category, imageUrl) {
  const client = new Client(pgConfig);
  try {
    console.log("[insertIntoDB] Connecting...");
    await client.connect();

    let query = "INSERT INTO news (title, content, category, imageurl, date) VALUES ($1, $2, $3, $4, $5)";
    const date = new Date().toISOString().split("T")[0];
    const values = [title, content, category, imageUrl, date];
    console.log("[insertIntoDB] Query to insert news...");
    await client.query(query, values);

    console.log("[insertIntoDB] Query to delete null values...");
    query = "DELETE FROM news WHERE imageurl IS NULL";
    await client.query(query);
  } catch (error) {
    console.error("[insertIntoDB] Error during data insertion into DB: ", error);
  } finally {
    console.log("[insertIntoDB] Disconnecting...");
    await client.end();
  }
}

async function createUrl(tempUrl) {
  const timestamp = Date.now();
  console.log("\n[createUrl] Uploading image...");
  const res = cloudinary.uploader.upload(tempUrl, { public_id: "img_" + timestamp });

  res
    .then(() => {
      console.log("[createUrl] Image uploaded!");
    })
    .catch((err) => {
      console.log(err);
    });

  const url = cloudinary.url("img_" + timestamp, {
    width: 256,
    height: 256,
    Crop: "fill",
  });

  console.log("[createUrl] Url created!");
  return url;
}

// CALL ALL FUNCTIONS TO GENERATA NEWS DATA AND INSERT INTO DB
async function generateNewsData(category) {
  try {
    const title = await generateTitle(category);
    const content = await generateContent(title);
    const tempUrl = await generateImage(title);
    const imageUrl = await createUrl(tempUrl);

    await insertIntoDB(title, content, category, imageUrl);
  } catch (error) {
    console.error("Error generating news data:", error);
  }
}

const categories = ["politics", "economy", "science", "sport"];

(async () => {
  for (const category of categories) {
    await generateNewsData(category);
  }
})();
