/**
 * Il server è responsabile per la gestione delle richieste HTTP, il routing delle richieste verso i rispettivi endpoint e l'interazione con il database.
 *
 * Utilizza il framework Express.js per creare un'applicazione web e configurare le varie funzionalità. Viene utilizzata la libreria pg per la connessione
 * e l'interazione con il database PostgreSQL. Il server gestisce anche la sessione degli utenti utilizzando il modulo express-session per il controllo dell'autenticazione
 * e la memorizzazione delle informazioni di sessione.
 *
 * Le principali funzionalità sono la gestione delle richieste per l'autenticazione degli utenti, l'ottenimento delle notizie, l'iscrizione alla newsletter,
 * la generazione delle notizie tramite l'esecuzione dell'apposito script, il controllo dei voti degli utenti e il recupero dei dati meteorologici.
 *
 * Serve il file JavaScript necessari per il funzionamento del front-end.
 */

// Moduli utilizzati
require("dotenv").config();
const express = require("express");
const { Client } = require("pg");
const session = require("express-session");
const bcrypt = require("bcrypt");
const axios = require("axios");
const { exec } = require("child_process");
const { error } = require("console");

// Configurazione dati DB tramite variabili di ambiente (file .env memorizzato in locale)
const pgConfig = {
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
};

// Creazione web app Express e configurazione
const app = express();

app.use(
  express.static("public", {
    setHeaders: function (res, path, stat) {
      if (path.endsWith(".js")) {
        res.set("Content-Type", "text/javascript");
      }
    },
  })
);

app.use(
  session({
    secret: "suskeysus420",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.json());

// Le notizie estrapolate dal DB vengono salvate in array
let latestNews = [];
let allNews;

// Dati meteo
let weatherData = "";

// Query sul DB per le notizie
async function fetchAllNews() {
  allNews = [];
  const client = new Client(pgConfig);
  try {
    console.log("\n[fetchAllNews] Connecting to the database...");
    await client.connect();
    const query = "SELECT * FROM news ORDER BY unique_id DESC";
    console.log("[fetchAllNews] Querying the database...");
    const result = await client.query(query);
    allNews = result.rows;
    latestNews = allNews.slice(0, 4).reverse();
  } catch (error) {
    console.error("[fetchAllNews] Error during retrieval from DB:", error);
  } finally {
    console.log("[fetchAllNews] Closing database connection...");
    await client.end();
  }
}

// Inserisce un nuovo user nel DB
async function saveUserToDB(email, firstName, lastName, hashedPassword, newsletter) {
  const client = new Client(pgConfig);
  try {
    console.log("\n[saveUserToDB] Connecting to the database...");
    await client.connect();
    const query = "INSERT INTO users (email, first_name, last_name, password, newsletter) VALUES ($1, $2, $3, $4, $5)";
    console.log("[saveUserToDB] Executing query on the database...");
    await client.query(query, [email, firstName, lastName, hashedPassword, newsletter]);
    console.log("\n[saveUserToDB] User inserted!");
  } catch (error) {
    console.error("[saveUserToDB] Error during database insertion:", error);
    throw new Error("Internal server error");
  } finally {
    console.log("[saveUserToDB] Closing database connection...");
    await client.end();
  }
}

// Controlla se l'utente è già nel DB
async function isUserInDB(email) {
  const client = new Client(pgConfig);
  try {
    console.log("\n[isUserInDB] Connecting...");
    await client.connect();
    const query = "SELECT email FROM users";
    console.log("[isUserInDB] Querying the database...");
    const result = await client.query(query);
    console.log(result.rows);
    return result.rows.some((row) => {
      console.log(row.email + " == " + email);
      return row.email == email;
    });
  } catch (error) {
    console.error("[isUserInDB] Error during retrieval from DB:", error);
    throw new Error("Internal server error");
  } finally {
    console.log("[isUserInDB] Disconnecting...");
    await client.end();
  }
}

// Ottieni dati meteo
async function getWeather(lat, lon) {
  const apiKey = "1c1c8bb4564fa4482b830ffbe7daed37";
  const url = `https://api.openweathermap.org/data/2.5/weather`;
  const params = {
    lat: lat,
    lon: lon,
    appid: apiKey,
    units: "metric",
  };

  console.log(params);

  console.log("[getWeather] Getting weather for " + lat + ", " + lon + " ...");

  try {
    const response = await axios.get(url, { params });
    const data = response.data;
    weatherData += data.name + ", " + data.weather[0].description + " " + data.main.temp + "°C";
    console.log("Weather Data: " + weatherData);
  } catch (error) {
    console.error("Error getting weather data:", error);
  }
}

fetchAllNews().catch((error) => {
  console.error("Error during news fetch:", error);
});

// Serve i file .js necessari al front-end
app.get("/newsApp.js", (req, res) => {
  res.type("application/javascript").sendFile(__dirname + "/newsApp.js");
});

app.get("/weather.js", (req, res) => {
  res.type("application/javascript").sendFile(__dirname + "/weather.js");
});

app.get("/client-archive.js", (req, res) => {
  res.type("application/javascript").sendFile(__dirname + "/client-archive.js");
});

app.get("/client-index.js", (req, res) => {
  res.type("application/javascript").sendFile(__dirname + "/client-index.js");
});

app.get("/client-subscribe.js", (req, res) => {
  res.type("application/javascript").sendFile(__dirname + "/client-subscribe.js");
});

app.get("/client-topNews.js", (req, res) => {
  res.type("application/javascript").sendFile(__dirname + "/client-topNews.js");
});

app.get("/dateTime.js", (req, res) => {
  res.type("application/javascript").sendFile(__dirname + "/dateTime.js");
});

app.get("/client-admin.js", (req, res) => {
  res.type("application/javascript").sendFile(__dirname + "/client-admin.js");
});

app.get("/newsGenerator.js", (req, res) => {
  res.type("application/javascript").sendFile(__dirname + "/newsGenerator.js");
});

// ROUTE DEGLI ENDPOINT

// Elimina un utente dal DB
app.post("/unsubscribe", async (req, res) => {
  const { email } = req.body;

  const client = new Client(pgConfig);
  try {
    await client.connect();
    const query = "DELETE FROM users WHERE email = $1";
    await client.query(query, [email]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error unsubscribing user:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await client.end();
  }
});

// Avvia lo script di generazione notizie
app.post("/newsGenerator", (req, res) => {
  const apiKey = req.body.apiKey;
  console.log("\n[/newsGenerator] Received API key:", apiKey);

  const childProcess = exec(`node newsGenerator.js ${apiKey}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[/newsGenerator] Error executing newsGenerator.js: ${error.message}`);
      res.status(500).send("[/newsGenerator] Error executing newsGenerator.js");
    } else {
      fetchAllNews().catch((error) => {
        res.status(500).send("[/newsGenerator] Error during news fetch:", error);
      });
      console.log("[/newsGenerator] newsGenerator.js executed!");
    }
  });

  childProcess.stdout.on("data", (data) => {
    console.log(data);
    res.write(data);
  });

  childProcess.stderr.on("data", (data) => {
    console.log("[/newsGenerator] Error during execution:");
    console.error(data);
    res.write(data);
  });

  childProcess.on("close", () => {
    exec("php newsletter.php", (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
    res.end();
  });
});

// Ritorna alla homepage le ultime notizie e lo stato di login
app.get("/index", (req, res) => {
  const response = {
    loggedIn: req.session.loggedIn,
    latestNews: latestNews,
  };
  res.json(response);
});

// Ritorna tutte le notizie all'archivio
app.get("/archive", (req, res) => {
  res.json(allNews);
});

// Ritorna le ultime notizie da votare alla pagina TopNews
app.get("/topnews", (req, res) => {
  res.json(latestNews);
});

// Gestione iscrizione nuovo utente
app.post("/subscribe", async (req, res) => {
  const { email, firstName, lastName, password, newsletter } = req.body;

  try {
    if (await isUserInDB(email)) {
      return res.status(409).send("Email already used");
    }

    bcrypt.hash(password, 10, async (err, hashedPassword) => {
      if (err) {
        console.error("Error during password hashing:", err);
        return res.sendStatus(500);
      }

      await saveUserToDB(email, firstName, lastName, hashedPassword, newsletter);
      req.session.loggedIn = true;
      req.session.email = email;

      res.json({ success: true });
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Gestione login utente non esistente
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const client = new Client(pgConfig);
  console.log("\n[/login] Connecting...");
  await client.connect();
  const query = "SELECT * FROM users WHERE email = ($1)";
  console.log("[/login] Querying the database...");
  const result = await client.query(query, [email]);
  console.log(result.rows[0]);

  try {
    if (result.rows[0]) {
      const storedPassword = result.rows[0].password;
      bcrypt.compare(password, storedPassword, (err, resultCompare) => {
        if (err) {
          console.error("Error in password verification:", err);
          return res.sendStatus(500);
        }
        console.log("\n", result.rows);
        if (resultCompare) {
          console.log("\nRES:true");
          req.session.loggedIn = true;
          req.session.userId = result.rows[0].email;

          const { email, first_name, last_name } = result.rows[0];
          res.json({ loggedIn: true, email, firstName: first_name, lastName: last_name });
        } else {
          console.log("\nRES:false");
          res.json({ loggedIn: false });
        }
      });
    } else {
      console.log("Not registered!");
      res.json({ loggedIn: false });
    }
  } catch (error) {
    console.error("Error during user login:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    console.log("[/login] Disconnecting...");
    await client.end();
  }
});

// Controlla se l'utente ha già votato
app.post("/checkvote", async (req, res) => {
  const { email } = req.body;
  console.log("\n[/checkvote] email:", email);
  const query = `SELECT has_voted_today FROM users WHERE email = $1`;

  const client = new Client(pgConfig);

  try {
    console.log("\n[/checkvote] Connecting...");
    await client.connect();
    console.log("[/checkvote] Querying the database...");
    const result = await client.query(query, [email]);

    if (result.rows.length > 0) {
      const hasVotedToday = result.rows[0].has_voted_today;
      res.json({ hasVotedToday });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error checking vote:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    console.log("[/checkvote] Disconnecting...");
    await client.end();
  }
});

// Invia i voti selezionati dall'utente al DB
app.post("/submitvotes", async (req, res) => {
  const votes = req.body;
  const queryUpdateNews = `UPDATE news SET score = score + $1 WHERE unique_id = $2`;
  const queryUpdateUser = `UPDATE users SET has_voted_today = true WHERE email = $1`;

  const client = new Client(pgConfig);

  try {
    console.log("\n[/submitvotes] Connecting...");
    await client.connect();

    const promises = votes.map(async (vote) => {
      const { email, newsId, score } = vote;
      const valuesUpdateNews = [score, newsId];
      const valuesUpdateUser = [email];

      console.log("\n[/submitvotes] News " + newsId + " Adding " + score);

      await client.query(queryUpdateNews, valuesUpdateNews);
      await client.query(queryUpdateUser, valuesUpdateUser);
    });

    await Promise.all(promises);
    await fetchAllNews();

    res.json({ message: "Votes submitted successfully" });
  } catch (error) {
    console.error("Error submitting votes:", error);
    res.status(500).json({ error: "Error submitting votes. Please try again later." });
  } finally {
    console.log("[/submitvotes] Disconnecting...");
    await client.end();
  }
});

// Una volta generate nuove notizie, tutti gli utenti devono poter votare
app.get("/resetVote", async (req, res) => {
  const query = `UPDATE users SET has_voted_today = false`;

  const client = new Client(pgConfig);

  try {
    console.log("\n[/resetVote] Connecting...");
    await client.connect();
    console.log("[/resetVote] Querying the database...");
    await client.query(query);
    console.log("[/resetVote] Vote reset successful");
    res.sendStatus(200);
  } catch (error) {
    console.error("[/resetVote] Error resetting vote:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    console.log("[/resetVote] Disconnecting...");
    await client.end();
  }
});

// Serve index.html come pagina iniziale
app.get("/", (req, res) => {
  res.sendFile("index.html");
});

// Ritorna le notizie in ordine di voto decrescente
app.get("/gettopnews", (req, res) => {
  const sortedNews = allNews.sort((a, b) => b.score - a.score);
  const topNews = sortedNews.slice(0, 5);
  res.json(topNews);
});

// Richiede dati meteo se non presenti
app.post("/weather", async (req, res) => {
  const { lat, lon } = req.body;
  if (weatherData == "") {
    await getWeather(lat, lon);
  }
  res.send(weatherData);
});

// Server listening su porta 51555
const PORT = 51555;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
