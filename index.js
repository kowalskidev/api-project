const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// parse request bodies (req.body)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(bodyParser.json());
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/login", (req, res) => {
  console.log(req.params);
  res.render("index");
});

app.listen(PORT, () => {
  console.log(`Server runnning http://localhost:${PORT}`);
});
