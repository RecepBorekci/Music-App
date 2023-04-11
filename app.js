const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.set("view engine", "ejs");
app.set("views");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", function (req, res) {
  res.render("index");
});
app.get("/playlist", function (req, res) {
  res.render("playlist");
});
app.get("/profile", function (req, res) {
  res.render("profile");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
