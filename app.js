const express = require("express");
const bodyParser = require("body-parser");
const querystring = require("node:querystring");
const axios = require("axios");

const app = express();
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

var user = {};
var playlists = {};
var playlist_id = "";
var playlist_songs = {};
const client_id = "30d5140203ce42c88337910fc2b6aef1";
const client_secret = "b214294c05ef41debf2ba2f0cbc8b8c7";
const redirect_uri = "http://localhost:3000/callback";
const stateKey = "spotify_auth_state";
var back_url = "/";

app.get("/", function (req, res) {
  res.render("index.ejs");
});

app.get("/playlist", function (req, res) {
  try {
    res.render("playlist.ejs", { items: playlists.items });
  } catch (error) {
    back_url = "/playlist";
    res.redirect("/login");
  }
});

app.get("/playlist_songs", function (req, res) {
  res.render("playlists_songs");
});

app.get("/playlist/:playlist", function (req, res) {
  const playlistId = req.params.playlist; // Retrieve the playlist ID from the URL

  const code = req.query.code || null;
  fetchData(code, () => {
    // Fetch and process playlist songs
    fetchPlaylistSongs(playlistId, () => {
      // Render the playlist songs page with the fetched playlist songs
      res.render("playlist_songs.ejs", {
        playlistSongs: playlist_songs,
      });
    });
  });
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
    console.log("Cannot go to the profile page. Redirecting to the login page.");
    back_url = "/profile";
    res.redirect("/login");
  }
});

app.get("/callback", function (req, res) {
  const code = req.query.code || null;
  fetchData(code, () => {
    // Render the profile page with the fetched user data
    res.render("profile.ejs", {
      profilePicture: user.images.length !== 0
        ? user.images[0].url
        : "https://static8.depositphotos.com/1009634/988/v/450/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg",
      username: user.display_name,
      email: user.email,
      followers: user.followers.total
    });
  });
  res.redirect(back_url);
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

function fetchData(code, callback) {
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
            playlist_id = playlists.items[0].id;
            axios
              .get(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, {
                headers: {
                  Authorization: `${token_type} ${access_token}`,
                },
                params: {
                  limit: 50,
                },
              })
              .then((response) => {
                playlist_songs = response.data.items;
                console.log(playlists.items);
                console.log(playlist_songs);

                // Handle the playlist tracks response here
                const playlistTracks = response.data.items;
                console.log(playlistTracks);

                callback();
              })
              .catch((error) => {
                console.log(error);
              });
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
      Authorization: `Basic ${Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
  });
}

async function fetchPlaylistSongs(playlistId, callback) {
  const response = await axios.get(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
      params: {
        limit: 50,
      },
    }
  );

  if (playlistId === response.data.id) {
    playlist_songs = response.data.items;
    callback();
  } else {
    console.log("IDs do not match.");
  }
  
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
