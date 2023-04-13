const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const querystring = require("node:querystring");

const app = express();
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
//app.use(express.static("public"));

app.get("/callback", function (req, res) {
  res.render("index.ejs");
});
app.get("/playlist", function (req, res) {
  res.render("playlist.ejs");
});
app.get("/profile", function (req, res) {
  res.render("profile.ejs");
});

const client_id = "30d5140203ce42c88337910fc2b6aef1";
const client_secret = "b214294c05ef41debf2ba2f0cbc8b8c7";
var redirect_uri = "http://localhost:3000/callback";

app.get("/login", function (req, res) {
  var state = generateRandomString(16);
  var scope = "user-read-private user-read-email";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body:
    "grant_type=client_credentials&client_id=" +
    encodeURIComponent(client_id) +
    "&client_secret=" +
    encodeURIComponent(client_secret),
})
  .then((response) => response.json())
  .then((data) => console.log(data));

app.listen(3000, function () {
  console.log("Server started on port 3000");
});

const generateRandomString = (length) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
