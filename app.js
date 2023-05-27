const express = require("express");
const bodyParser = require("body-parser");
const querystring = require("node:querystring");
const axios = require("axios");
const { log } = require("node:console");

const app = express();
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

const client_id = "30d5140203ce42c88337910fc2b6aef1";
const client_secret = "b214294c05ef41debf2ba2f0cbc8b8c7";
const redirect_uri = "http://localhost:3000/callback";
const stateKey = "spotify_auth_state";
var back_url = "/";

var user = {};
var playlists = {};
let playlist_id = '';
let playlist_songs = {};

app.get("/", function (req, res) {
  res.render("index.ejs");
});

app.get("/login", function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  var scope =
    "user-read-private user-read-email playlist-read-private playlist-read-collaborative";

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

app.get("/profile", function profile(req, res) {
  try {
    res.render("profile.ejs", {
      profilePicture:
        user.images.length != 0
          ? user.images[0].url
          : "https://static8.depositphotos.com/1009634/988/v/450/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg",
      username: user.display_name,
      email: user.email,
      followers: user.followers.total,
    });
  } catch (error) {
    console.log("Cannot go to profile page. Redirecting to login page.");
    back_url = "/profile";
    res.redirect("/login");
  }
});

app.get("/callback", function (req, res) {
  const code = req.query.code || null;
  fetchData(code);
  res.redirect(back_url);
});

app.get("/playlist", function (req, res) {
  try {
    // if (playlist_id !== '' || playlist_id !== null) {
    //   res.render("playlist.ejs", { playlistID: playlist_id, items: playlists.items });
    // }
    res.render("playlist.ejs", { items: playlists.items });
  } catch (error) {
    back_url = "/playlist";
    res.redirect("/login");
  }
});

app.get("/playlist/:playlistID", function(req, res) {
  res.render("playlist_songs", {playlistSongs: playlist_songs})
});

async function fetchData(code) {
  fetchToken(code)
    .then((response) => {
      if (response.status === 200) {
        const { access_token, token_type } = response.data;
        axios
          .get("https://api.spotify.com/v1/me", {
            headers: {
              Authorization: `${token_type} ${access_token}`,
            },
          })
          .then((response) => {
            //user = `${JSON.stringify(response.data, null, 2)}`;
            user = response.data;
            userId = user.id;
          })
          .catch((error) => {
            console.log(error);
          });
        axios
          .get(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            headers: {
              Authorization: `${token_type} ${access_token}`,
            },
            params: {
              limit: 50,
            },
          })
          .then((response) => {
            playlists = response.data;
            let playlist_songs_href = response.data.items[1].tracks.href; // First playlist songs.

            playlist_id = playlists.items[0].id;

            console.log("THE PLAYLIST ID: " + playlist_id);
            console.log("href from playslist: " + playlist_songs_href);
            console.log(playlists.items);
            axios
              .get(playlist_songs_href, {
                headers: {
                  Authorization: `${token_type} ${access_token}`,
                },
                params: {
                  limit: 50,
                },
              }).then((response) => {
                  console.log("href for songs: " + response.data.href);

                  playlist_songs = response.data.items;

                  console.log("name of the second track: " + playlist_songs[1].track.name);

                  console.log("All songs in the playlist: " + playlist_songs);
              })
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        console.log(response);
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

async function fetchToken(code) {
  return axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: querystring.stringify({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirect_uri,
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${new Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
  });
}

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
