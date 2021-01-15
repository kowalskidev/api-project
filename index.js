const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
require("dotenv").config();
const bodyParser = require("body-parser");
const got = require("got");
const multer = require("multer");
const path = require("path");
const helpers = require("./helpers");
const fs = require("fs");
const FormData = require("form-data");

// parse request bodies (req.body)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(bodyParser.json());
app.set("view engine", "ejs");
var tags = [];
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/img/uploads");
  },

  // By default, multer removes file extensions so let's add them back
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

app.get("/", (req, res) => {
  const str = "hello";
  console.log(`${str + "world"}`);
  res.render("index");
});

app.post("/upload", (req, res) => {
  // 'picture' is the name of our file input field in the HTML form
  let upload = multer({
    storage: storage,
    fileFilter: helpers.imageFilter,
  }).single("picture");

  upload(req, res, function (err) {
    // req.file contains information of uploaded file
    // req.body contains information of text fields, if there were any

    if (req.fileValidationError) {
      return res.send(req.fileValidationError);
    } else if (!req.file) {
      return res.send("Please select an image to upload");
    } else if (err instanceof multer.MulterError) {
      return res.send(err);
    } else if (err) {
      return res.send(err);
    }
    console.log(req.file);
    // Display uploaded image for user validation
    res.render("image", { filename: req.file.filename });
  });
});

app.get("/analyzeImage/:filename", (req, res) => {
  const filePath = `public/img/uploads/${req.params.filename}`;
  const formData = new FormData();
  formData.append("image", fs.createReadStream(filePath));
  formData.append("limit", 3);
  const url_categorizer =
    "https://api.imagga.com/v2/categories/personal_photos";
  const url_tags = "https://api.imagga.com/v2/tags";

  (async () => {
    try {
      const response = await got.post(url_tags, {
        body: formData,
        username: process.env.Wit_API_Key,
        password: process.env.Wit_API_Secret,
      });
      const data = JSON.parse(response.body);
      const tag = data.result.tags;
      tags = tag.map((tag) => {
        return tag.tag.en;
      });
      console.log(tags);
      res.redirect(`/gallery/${tags[0]}`);
    } catch (error) {
      console.log(error.response.body);
      res.send(error.response.body);
    }
  })();
});

app.get("/gallery/:tag", (req, res) => {
  const unsplash_url = `https://api.unsplash.com/search/photos?client_id=${process.env.Unsplash_API_Key}&page=1&query=`;

  (async () => {
    try {
      const response = await got(`${unsplash_url + req.params.tag}`);
      const responseJSON = JSON.parse(response.body);
      const data = responseJSON.results;
      let images = data.map((obj) => {
        return {
          regular: obj.urls.regular,
          thumb: obj.urls.thumb,
          tags: obj.tags,
        };
      });
      console.log(images);
      res.render("gallery", {
        images: images,
      });
    } catch (error) {
      console.log(error.response.body);
      res.send(error.response.body);
    }
  })();
});
app.get("/analyzeColors/:filename", (req, res) => {
  console.log(req.params.filename);
  const filePath = `public/img/uploads/${req.params.filename}`;
  const formData = new FormData();
  formData.append("image", fs.createReadStream(filePath));
  // formData.append("limit", 3);

  const url_colors = "https://api.imagga.com/v2/colors";

  (async () => {
    try {
      const response = await got.post(url_colors, {
        body: formData,
        username: process.env.Wit_API_Key,
        password: process.env.Wit_API_Secret,
      });
      console.log(response.body);
      res.send(response.body);
    } catch (error) {
      console.log(error.response.body);
      res.send(error.response.body);
    }
  })();
});

app.listen(PORT, () => {
  console.log(`Server runnning http://localhost:${PORT}`);
});
