// TODO: Implement removing items from a playlist.
// TODO: Implement pausing and stopping playback.
// TODO: Implement skip to next song.
// TODO: Implement skip to previous song.

const express = require("express");
const bodyParser = require("body-parser");
const querystring = require("node:querystring");
const axios = require("axios");
const { log } = require("node:console");

const app = express();
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

const client_id = "30d5140203ce42c88337910fc2b6aef1";
const client_secret = "b214294c05ef41debf2ba2f0cbc8b8c7";
const redirect_uri = "http://localhost:3000/callback";
const stateKey = "spotify_auth_state";
var back_url = "/";
let access_token = "";
let token_type = "";
let token_response = {};
let code = '';

let is_playing = false;

var user = {};
let currentPlaylist = {};
let currentlyPlayingSong = {};
var playlists = {};
let playlist_songs = {};
let currentPlaylistID = '';
let currentPlaylistURI = '';

// TODO: Implement finding top element, song, album or artist and send it to search.ejs
let search_top_element = [];
let search_songs = [];
let search_artists = [];
let search_albums = [];
let search_playlists = [];
let search_shows = [];
let search_episodes = [];
let search_audiobooks = [];


app.get("/", function (req, res) {
  res.render("index", { is_playing: is_playing });
});

app.get("/login", function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  var scope = "user-read-private user-read-email playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state user-read-currently-playing";

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
      is_playing: is_playing
    });
  } catch (error) {
    console.log("Cannot go to profile page. Redirecting to login page.");
    back_url = "/profile";
    res.redirect("/login");
  }
});

app.get("/callback", function (req, res) {
  code = req.query.code || null;
  fetchData();
  res.redirect(back_url);
});

app.get("/playlist", async function (req, res) {

  await isPlaying();

  try {
    res.render("playlist.ejs", { items: playlists.items , is_playing: is_playing, playlist_id: currentPlaylist.id});
  } catch (error) {
    back_url = "/playlist";
    res.redirect("/login");
  }
});

app.post("/playlist", async function (req, res) {

  console.log("button is pressed");

  currentPlaylistURI = req.body.playlist_uri;
  let currentPlaylistID = req.body.playlist_id;

  const skipButton = req.body.skipButton; // Get the value of the submitted button

  console.log("URI of the playlist: " + currentPlaylistURI);
  console.log("ID of the playlist: " + currentPlaylistID);

  currentPlaylist = await getPlaylist(currentPlaylistID);
  console.log("ID of the playlist: " + currentPlaylistID);

  if (!is_playing) {
    await playPlaylistSongs(currentPlaylistURI);
  } else {
    await pausePlayback();
  }

  if (skipButton === 'previous') {
    // Previous button was pressed, handle accordingly
    await skipToPreviousSong();
    await startPlayback();
  } else if (skipButton === 'next') {
    // Next button was pressed, handle accordingly
    await skipToNextSong();
    await startPlayback();
  }

  await isPlaying();

  res.redirect("/playlist");

});

// BUG: It goes to login screen after playing or pausing a song from a playlist. It means that there's an error. FIXED✅
app.get("/playlist/:playlistID", async function(req, res) {
  currentPlaylistID = req.params.playlistID;

  console.log("This is the playlist id: " + currentPlaylistID);

  await isPlaying();
  currentlyPlayingSong = await getCurrentlyPlayingSong();

    // Fetch the playlist songs based on the playlistID
    fetchPlaylistSongs(currentPlaylistID)
    .then((playlistSongs) => {

      playlist_songs = playlistSongs;

      res.render("playlist_songs", { playlistSongs: playlistSongs , is_playing: is_playing, current_song_id: currentlyPlayingSong.id, current_playlist_id: currentPlaylistID});
    })
    .catch((error) => {
      console.log(error);
      res.redirect("/login");
    });
    
});

app.post("/playlist/:playlistID", async function(req, res) {
  var song_uri = req.body.playlist_song_button;

  await isPlaying();

  if (playlist_songs) {

    const song_uris = playlist_songs.map((song) => song.track.uri);

    console.log("All URIs of the songs:", song_uris);
    console.log("URI of the song:", song_uri);

    if (!is_playing) {
      await playSong(song_uris, song_uri);
    } else {
      await pausePlayback();
    }

    currentlyPlayingSong = await getCurrentlyPlayingSong();
  }

  await isPlaying();

  res.redirect("/playlist/" + currentPlaylistID);

});

// Searching screen

app.post("/search", async function (req, res) {
  
  let query = req.body.searchQuery;

  const songURI = req.body.playSongButton;
  const artistURI = req.body.playArtistButton;
  const albumURI = req.body.playAlbumButton;
  const playlistURI = req.body.playPlaylistButton;
  const showURI = req.body.playShowButton;
  const episodeURI = req.body.playEpisodeButton;
  const audiobookURI = req.body.playAudiobookButton;

  console.log(query);

  await search(query);

  res.redirect('/search');

  console.log(songURI);

  // TODO: Add a check to stop if something plays. If nothing plays play.

  if (songURI) {
    // Logic for playing a song
    await playSingleSong(songURI);
  } else if (artistURI) {
    // Logic for playing an artist
    await playArtist(artistURI);
  } else if (albumURI) {
    // Logic for playing a playlist
    await playAlbum(albumURI);
  } else if (playlistURI) {
    // Logic for playing an album
    await playPlaylistSongs(playlistURI);
  } else if (showURI) {
    // Logic for playing a show
    await playShow(showURI);
  } else if (episodeURI) {
    // Logic for playing an episode
    // await playEpisode(episodeURI);
  } else if (audiobookURI) {
    // Logic for playing an audiobook
    // await playAudiobook(audiobookURI);
  }

  await isPlaying();

});

app.get("/search", function (req, res) {
  res.render("search", {is_playing: is_playing, songs: search_songs, artists: search_artists, albums: search_albums, playlists: search_playlists, shows: search_shows, episodes: search_episodes, audiobooks: search_audiobooks});
});

async function fetchToken() {
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

// Gets the data for the playlist and playlist songs
async function fetchData() {
  fetchToken()
    .then((response) => {
      if (response.status === 200) {

        token_response = response.data;

        const { access_token, token_type } = token_response;
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

            let first_playlist_uri = response.data.items[0].uri

            console.log("This is the uri: " + first_playlist_uri);

            // playSong();

            // console.log("THE PLAYLIST ID: " + playlist_id);
            // console.log("href from playslist: " + playlist_songs_href);
            // console.log(playlists.items);
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

async function getPlaylist(playlistID) {
  const { access_token, token_type } = token_response;

  return axios
    .get(`https://api.spotify.com/v1/playlists/${playlistID}`, {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
      params: {
        limit: 50,
      },
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      throw error;
    });
}

// Fetch the playlist songs based on the playlistID, access_token, and token_type
async function fetchPlaylistSongs(playlistID) {

  const { access_token, token_type } = token_response;

  return axios
    .get(`https://api.spotify.com/v1/playlists/${playlistID}/tracks`, {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
      params: {
        limit: 50,
      },
    })
    .then((response) => {

      playlist_songs = response.data.items;

      // console.log("href for songs: " + response.data.href);
      // console.log("name of the second track: " + playlist_songs[1].track.name);
      // console.log("All songs in the playlist: " + playlist_songs);

      return response.data.items;
    })
    .catch((error) => {
      throw error;
    });
}

async function getCurrentlyPlayingSong() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios
  .get(`https://api.spotify.com/v1/me/player/currently-playing`, {
    headers: headers,
    params: {
      limit: 50,
    },
  })
  .then((response) => {

    if (response.data.context) {
      console.log("You are now playing a " + response.data.context.type); //Song, artist, album etc.
    }

  console.log("You are now playing " + response.data.item.name); // Name of the song.

    return response.data.item;
  })
  .catch((error) => {
    throw error;
  });

}

async function isPlaying() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios
  .get(`https://api.spotify.com/v1/me/player`, {
    headers: headers,
    params: {
      limit: 50,
    },
  })
  .then((response) => {
    is_playing = response.data.is_playing;

    console.log("Is playing is: " + is_playing); 

    return response.data.is_playing;
  })
  .catch((error) => {
    throw error;
  });

}


async function getDevice() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios.get('https://api.spotify.com/v1/me/player/devices', {
    headers: headers
  })
  .then((response) => {
    return response.data.devices[0];
  })
  .catch((error) => {
    throw error;
  });
}

async function playSong(playlist_song_uris, song_uri) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  const data = {
    "offset": {
      "uri": song_uri
    },
    "uris": playlist_song_uris
  };

  return axios.put(`https://api.spotify.com/v1/me/player/play`, data, {
    headers: headers,
    params: {
      limit: 50,
    },
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });

}

async function playSingleSong(song_uri) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
    'Content-Type': 'application/json'
  };

  const data = {
    uris: [song_uri], // Wrap the song_uri in an array
    offset: { position: 0 }
  };

  return axios.put('https://api.spotify.com/v1/me/player/play', data, {
    headers: headers,
    params: {
      limit: 50
    }
  })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      throw error;
    });
}

async function playArtist(artist_uri) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
    'content-type': 'application/json'
  };

  const data = {
    "context_uri": artist_uri,
  };

  return axios.put(`https://api.spotify.com/v1/me/player/play`, data, {
    headers: headers,
    params: {
      limit: 50,
    },
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });

}

async function playAlbum(album_uri) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
    'content-type': 'application/json'
  };

  const data = {
    "context_uri": album_uri,
  };

  return axios.put(`https://api.spotify.com/v1/me/player/play`, data, {
    headers: headers,
    params: {
      limit: 50,
    },
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });

}

async function playPlaylistSongs(playlist_uri) {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  const data = {
    "context_uri": playlist_uri,
    "offset": {
        "position": 0
    },
  };

  return axios.put(`https://api.spotify.com/v1/me/player/play`, data, {
    headers: headers,
    params: {
      limit: 50,
    },
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });

}

async function playShow(show_uri) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
    'content-type': 'application/json'
  };

  const data = {
    "context_uri": show_uri,
  };

  return axios.put(`https://api.spotify.com/v1/me/player/play`, data, {
    headers: headers,
    params: {
      limit: 50,
    },
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });

}

async function playEpisode(episode_uri) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
    'content-type': 'application/json'
  };

  console.log(episode_uri);

  const data = {
    "context_uri": episode_uri,
  };

  return axios.put(`https://api.spotify.com/v1/me/player/play`, data, {
    headers: headers,
    params: {
      limit: 50,
    },
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });

}

async function playAudiobook(audiobook_uri) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
    'content-type': 'application/json'
  };

  const data = {
    "context_uri": audiobook_uri,
  };

  return axios.put(`https://api.spotify.com/v1/me/player/play`, data, {
    headers: headers,
    params: {
      limit: 50,
    },
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });

}






async function startPlayback() {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  if (!is_playing) {
    return axios.put(`https://api.spotify.com/v1/me/player/play`, null, {
      headers: headers,
      params: {
        limit: 50,
      },
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      throw error;
    });
  }
}

async function pausePlayback() {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  console.log("paused song");

  if (is_playing) {
    return axios
    .put('https://api.spotify.com/v1/me/player/pause', null, {
      headers: headers,
      params: {
        limit: 50,
      },
    });
  }

}

async function skipToPreviousSong() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  console.log("previous song");

  if (is_playing) {
    return axios.post('https://api.spotify.com/v1/me/player/previous', null, {
      headers: headers,
      params: {
        limit: 50,
      },
    })
    .catch((error) => {
      console.log(error);
    });
  }

}

async function skipToNextSong() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  console.log("next song");

  if (is_playing) {
    return axios.post('https://api.spotify.com/v1/me/player/next', null, {
      headers: headers,
      params: {
        limit: 50,
      },
    })
    .catch((error) => {
      console.log(error);
    });
  }
}

async function search(query) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  const params = {
    q: query,
    type: ['album', 'artist', 'playlist', 'track', 'show', 'episode', 'audiobook'].join(','),
    limit: 5
  };

  console.log("Search a song");

  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: headers,
      params: params,
    });

    search_songs = response.data.tracks.items;
    search_artists = response.data.artists.items;
    search_albums = response.data.albums.items;
    search_playlists = response.data.playlists.items;
    search_shows = response.data.shows.items;
    search_episodes = response.data.episodes.items;
    search_audiobooks = response.data.audiobooks.items;

    console.log(search_songs[0].name);

    console.log(search_songs[0].popularity);
    console.log(search_artists[0].popularity);
    console.log(search_albums[0]);

    return response.data;
  } catch (error) {
    console.error(error);
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
