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

let user = {};
let currentPlaylist = {};
let currentlyPlayingSong = {};
var playlists = {};
let playlist_songs = {};
let currentPlaylistID = '';
let currentPlaylistURI = '';
let currentlyPlayingID = '';
let currentSongURI = '';

// TODO: Implement finding top element, song, album or artist and send it to search.ejs
let search_top_element = [];
let search_songs = [];
let search_artists = [];
let search_albums = [];
let search_playlists = [];
let search_shows = [];
let search_episodes = [];
let search_audiobooks = [];

const artistAlbumsRandomNumber = Math.floor(Math.random() * 10);
const artistTopSongsRandomNumber = Math.floor(Math.random() * 10);
const artistRelatedArtistRandomNumber = Math.floor(Math.random() * 10);

// const top_artists = [];
// const top_songs = [];
// const artist_songs = [];
// const artist_albums = [];
// const related_artists = [];

app.route("/").get(async function (req, res) {

  const top_artists = await fetchUserTopArtists();
  const top_songs = await fetchUserTopSongs();
  const artist_albums =  await fetchArtistAlbums(top_artists[artistAlbumsRandomNumber].id);
  const artist_top_songs = await fetchArtistTopSongs(top_artists[artistTopSongsRandomNumber].id);
  const related_artists =   await fetchArtistRelatedArtists(top_artists[artistRelatedArtistRandomNumber].id);

  const artistToRelateTo = top_artists[artistRelatedArtistRandomNumber];

  // const fetchedTopArtists = await fetchUserTopArtists();
  // const fetchedTopSongs = await fetchUserTopSongs();

  // if (top_artists.length === 0) {
  //   top_artists.push(...fetchedTopArtists);
  // }

  // if (top_songs.length === 0) {
  //   top_songs.push(...fetchedTopSongs);
  // }

  // TODO: Followers count work beautifully here. There's a bug in main screen that shows all followers as 0 fix it with this endpoint.
  // await fetchArtist(fetchedTopArtists[0].id);

  // await fetchArtistAlbums(fetchedTopArtists[artistAlbumsRandomNumber].id);

  // await fetchArtistTopSongs(fetchedTopArtists[artistTopSongsRandomNumber].id);

  // await fetchArtistRelatedArtists(fetchedTopArtists[artistRelatedArtistRandomNumber].id);

  res.render("index", {
     is_playing: is_playing, 
     currently_playing_id: currentlyPlayingID,
     top_artists: top_artists, 
     top_songs: top_songs, 
     artist_albums: artist_albums, 
     artist_top_songs: artist_top_songs, 
     related_artists: related_artists, 
     artistToRelateTo: artistToRelateTo
    });
});

app.get("/login", function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  var scope = "user-read-private user-read-email playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state user-read-currently-playing user-top-read user-follow-read user-library-read";

  console.log(redirect_uri);

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

app.get("/callback", function (req, res) {
  code = req.query.code || null;
  fetchUserPlaylists();

  back_url = "/profile";

  console.log(back_url);

  res.redirect(back_url);
});

app.get("/profile", async function profile(req, res) {
  try {

    const response = await fetchFollowedArtists();
    const followedCount = response.artists.total;
    const followedArtists = response.artists.items;

    const savedSongResponse = await fetchSavedSongs();
    const savedAlbumResponse = await fetchSavedAlbums();

    const savedAlbumCount = savedAlbumResponse.total;
    const savedAlbums = savedAlbumResponse.items;

    const savedSongCount = savedSongResponse.total;
    const savedSongs = savedSongResponse.items;

    await isPlaying();

    res.render("profile.ejs", {
      profilePicture:
        user.images.length != 0
          ? user.images[0].url
          : "https://static8.depositphotos.com/1009634/988/v/450/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg",
      username: user.display_name,
      email: user.email,
      followers: user.followers.total,
      is_playing: is_playing,
      currently_playing_id: currentlyPlayingID,
      followed_count: followedCount,
      followed_artists: followedArtists,
      saved_album_count: savedAlbumCount,
      saved_albums: savedAlbums,
      saved_song_count: savedSongCount,
      saved_songs: savedSongs
    });

  } catch (error) {
    console.log("Cannot go to profile page. Redirecting to login page.");
    back_url = "/profile";
    res.redirect("/login");
  }
});

app.route("/playlist")
  .get(async function (req, res) {
    await isPlaying();

    try {
      res.render("playlist.ejs", {
        items: playlists.items,
        is_playing: is_playing,
        current_playlist_uri: currentPlaylistURI
      });
    } catch (error) {
      back_url = "/playlist";
      res.redirect("/login");
    }
  })
  .post(async function (req, res) {
    console.log("button is pressed");

    const clickedPlaylistURI = req.body.playlist_uri;

    if (currentPlaylistURI === clickedPlaylistURI) {
      // Pause the playback
      await pausePlayback();
      currentPlaylistURI = null; // Reset currentPlaylistURI
    } else {
      currentPlaylistURI = clickedPlaylistURI;
      await playPlaylistSongs(currentPlaylistURI);
    }

    res.redirect("/playlist");
  });



// BUG: It goes to login screen after playing or pausing a song from a playlist. It means that there's an error. FIXED✅

app.route("/playlist/:playlistID")
.get(async function(req, res) {

  await isPlaying();

  currentPlaylistID = req.params.playlistID;

  console.log("This is the playlist id: " + currentPlaylistID);

  currentlyPlayingSong = await getCurrentlyPlayingSong();

  try {
    // Fetch the playlist songs based on the playlistID
    playlist_songs = await fetchPlaylistSongs(currentPlaylistID);
    res.render("playlist_songs", { playlistSongs: playlist_songs, is_playing: is_playing, current_song_id: currentlyPlayingSong.id, current_playlist_id: currentPlaylistID });
  } catch (error) {
    console.log(error);
    res.redirect("/login");
  }
})
.post(async function(req, res) {
  const clickedSongURI = req.body.playlist_song_button;

  if (playlist_songs) {
    const song_uris = playlist_songs.map((song) => song.track.uri);

    console.log("All URIs of the songs:", song_uris);
    console.log("URI of the song:", clickedSongURI);

    if (currentSongURI === clickedSongURI) {
      // Pause the playback
      await pausePlayback();
      currentSongURI = null; // Reset currentSongURI
    } else {
      currentSongURI = clickedSongURI;
      await playSong(song_uris, clickedSongURI);
    }
  }

  res.redirect("/playlist/" + currentPlaylistID);
});

// Searching screen
app.route("/search")
.get(async function (req, res) {

  await isPlaying();

  console.log(currentlyPlayingID);

  res.render("search", {
    is_playing: is_playing,
    currently_playing_id: currentlyPlayingID,
    songs: search_songs,
    artists: search_artists,
    albums: search_albums,
    playlists: search_playlists,
    shows: search_shows,
    episodes: search_episodes,
    audiobooks: search_audiobooks
  });
})
.post(async function (req, res) {
  
  let query = req.body.searchQuery;

  console.log(query);

  await search(query);

  res.redirect('/search');

});

app.route("/artist/:artistID")
.get(async function(req, res) {

  let artistID = req.params.artistID;

  const artist = await fetchArtist(artistID);
  const artist_top_songs = await fetchArtistTopSongs(artistID);
  const artist_albums = await fetchArtistAlbums(artistID);
  const artist_similar_artists = await fetchArtistRelatedArtists(artistID);


  res.render("artist_page", {
    is_playing: is_playing,
    artist: artist,
    artist_top_songs: artist_top_songs,
    artist_albums: artist_albums,
    artist_similar_artists: artist_similar_artists
  });
})

app.route("/play")
  .post(async function (req, res) {
    const songURI = req.body.playSongButton;
    const artistURI = req.body.playArtistButton;
    const albumURI = req.body.playAlbumButton;
    const playlistURI = req.body.playPlaylistButton;
    const showURI = req.body.playShowButton;
    const episodeURI = req.body.playEpisodeButton;
    const audiobookURI = req.body.playAudiobookButton;
    const clickedItemID = req.body.currentlyPlayingId; // Get the ID of the clicked item

    // Check if the clicked item is the currently playing item
    const isCurrentlyPlaying = currentlyPlayingID === clickedItemID;

    if (isCurrentlyPlaying) {
      // Pause the playback
      await pausePlayback();
      currentlyPlayingID = null; // Reset currentlyPlayingID
    } else {
      if (songURI) {
        // Logic for playing a song
        await playSingleSong(songURI);
        currentlyPlayingID = clickedItemID; // Update currentlyPlayingID with the selected song's ID
      } else if (artistURI) {
        // Logic for playing an artist
        await playArtist(artistURI);
        currentlyPlayingID = clickedItemID; // Update currentlyPlayingID with the selected artist's ID
      } else if (albumURI) {
        // Logic for playing an album
        await playAlbum(albumURI);
        currentlyPlayingID = clickedItemID; // Update currentlyPlayingID with the selected album's ID
      } else if (playlistURI) {
        // Logic for playing a playlist
        await playPlaylistSongs(playlistURI);
        currentlyPlayingID = clickedItemID; // Update currentlyPlayingID with the selected playlist's ID
      } else if (showURI) {
        // Logic for playing a show
        await playShow(showURI);
        currentlyPlayingID = clickedItemID; // Update currentlyPlayingID with the selected show's ID
      } else if (episodeURI) {
        // Logic for playing an episode
        // await playEpisode(episodeURI);
        currentlyPlayingID = clickedItemID; // Update currentlyPlayingID with the selected episode's ID
      } else if (audiobookURI) {
        // Logic for playing an audiobook
        // await playAudiobook(audiobookURI);
        currentlyPlayingID = clickedItemID; // Update currentlyPlayingID with the selected audiobook's ID
      }
    }

    await isPlaying();

    res.redirect('/search');
  });

app.route("/playHome")
.post(async function(req, res) {

  const artist_uri = req.body.artist_uri;
  const song_uri = req.body.song_uri;
  const album_uri = req.body.album_uri;
  const clickedItemID = req.body.currentlyPlayingId;

      // Check if the clicked item is the currently playing item
      const isCurrentlyPlaying = currentlyPlayingID === clickedItemID;

  if (album_uri) {
    playAlbum(album_uri);
    currentlyPlayingID = clickedItemID;
  } else if (artist_uri) {
    playArtist(artist_uri);
    currentlyPlayingID = clickedItemID;
  } else if (song_uri) {
    playSingleSong(song_uri);
    currentlyPlayingID = clickedItemID;
  }

  res.redirect("/");

});

app.route("/playProfile")
.post(async function(req, res) {

  const artist_uri = req.body.artist_uri;
  const song_uri = req.body.song_uri;
  const album_uri = req.body.album_uri;
  const clickedItemID = req.body.currentlyPlayingId;

      // Check if the clicked item is the currently playing item
      const isCurrentlyPlaying = currentlyPlayingID === clickedItemID;

  if (album_uri) {
    playAlbum(album_uri);
    currentlyPlayingID = clickedItemID;
  } else if (artist_uri) {
    playArtist(artist_uri);
    currentlyPlayingID = clickedItemID;
  } else if (song_uri) {
    playSingleSong(song_uri);
    currentlyPlayingID = clickedItemID;
  }

  res.redirect("/profile");

});


app.route("/startPlayback")
.post(async function(req, res) {

  if (is_playing) {
    pausePlayback();
  }
  else {
    startPlayback();
  }

  await isPlaying();
  
  res.redirect("/playlist");
})

app.route("/skip")
.post(async function(req, res) {

  const skipButton = req.body.skipButton; // Get the value of the submitted button

  if (skipButton === 'previous') {
    // Previous button was pressed, handle accordingly
    await skipToPreviousSong();
    await startPlayback();
  } else if (skipButton === 'next') {
    // Next button was pressed, handle accordingly
    await skipToNextSong();
    await startPlayback();
  }

  res.redirect("/playlist");
})

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

async function fetchUser() {
  const { access_token, token_type } = token_response;

  try {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `${token_type} ${access_token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function fetchPlaylists(user) {
  try {

    const { access_token, token_type } = token_response;

    const response = await axios.get(
      `https://api.spotify.com/v1/users/${user.id}/playlists`,
      {
        headers: {
          Authorization: `${token_type} ${access_token}`,
        },
        params: {
          limit: 50,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error('Failed to fetch playlists');
  }
}


// Gets the data for the playlist and playlist songs
async function fetchUserPlaylists() {
  try {
    const response = await fetchToken();

    if (response.status === 200) {
      token_response = response.data;

      user = await fetchUser();

      playlists = await fetchPlaylists(user);

    } else {
      console.log(response);
    }
  } catch (error) {
    console.log(error);
  }
}


async function fetchMarkets() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios
  .get(`https://api.spotify.com/v1/markets`, {
    headers: headers,
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });
} 

async function fetchUserTopArtists() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios
  .get(`https://api.spotify.com/v1/me/top/artists`, {
    headers: headers,
    params: {
      limit: 10,
    },
  })
  .then((response) => {

    console.log(response.data.items[0].followers);


    console.log(response.data.href);

    return response.data.items;
  })
  .catch((error) => {
    throw error;
  });
} 

async function fetchUserTopSongs() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios
  .get(`https://api.spotify.com/v1/me/top/tracks`, {
    headers: headers,
    params: {
      limit: 10,
    },
  })
  .then((response) => {

    console.log(response.data.href);

    return response.data.items;
  })
  .catch((error) => {
    throw error;
  });
} 

async function fetchArtist(artist_id) {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios
  .get(`https://api.spotify.com/v1/artists/${artist_id}`, {
    headers: headers,
  })
  .then((response) => {

    // TODO: Followers count work beautifully here. There's a bug in main screen that shows all followers as 0 fix it with this endpoint.
    console.log("followers count: " + response.data.followers.total);

    return response.data;
  })
  .catch((error) => {
    throw error;
  });
} 

async function fetchArtistAlbums(artist_id) {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios
  .get(`https://api.spotify.com/v1/artists/${artist_id}/albums`, {
    headers: headers,
    params: {
      limit: 10,
    },
  })
  .then((response) => {

    console.log(response.data.items[0].uri);

    return response.data.items;
  })
  .catch((error) => {
    throw error;
  });
} 

async function fetchArtistTopSongs(artist_id) {

  const { access_token, token_type } = token_response;

  const markets = await fetchMarkets();

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios
  .get(`https://api.spotify.com/v1/artists/${artist_id}/top-tracks`, {
    headers: headers,
    params: {
      market: "TR"
    }
  })
  .then((response) => {

    console.log(response.data.tracks[0].name);

    return response.data.tracks;
  })
  .catch((error) => {
    throw error;
  });
} 

async function fetchArtistRelatedArtists(artist_id) {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  return axios
  .get(`https://api.spotify.com/v1/artists/${artist_id}/related-artists`, {
    headers: headers,
  })
  .then((response) => {

    console.log(response.data.artists[0].name);

    return response.data.artists;
  })
  .catch((error) => {
    throw error;
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

async function playSong(playlist_song_uris, clickedSongURI) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  const data = {
    "offset": {
      "uri": clickedSongURI
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

async function playSingleSong(clickedSongURI) {
  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
    'Content-Type': 'application/json'
  };

  const data = {
    uris: [clickedSongURI], // Wrap the clickedSongURI in an array
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

    // console.log(search_songs[0].name);

    // console.log(search_songs[0].popularity);
    // console.log(search_artists[0].popularity);
    // console.log(search_albums[0]);

    return response.data;
  } catch (error) {
    console.error(error);
  }
}


async function fetchFollowedArtists() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  const params = {
    type: 'artist',
    limit: 5
  }

  return axios.get(`https://api.spotify.com/v1/me/following`, {
    headers: headers,
    params: params,
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });


}

async function fetchSavedAlbums() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  const params = {
    limit: 5
  }

  return axios.get(`https://api.spotify.com/v1/me/albums`, {
    headers: headers,
    params: params,
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
  });

}

async function fetchSavedSongs() {

  const { access_token, token_type } = token_response;

  const headers = {
    Authorization: `${token_type} ${access_token}`,
  };

  const params = {
    limit: 5
  }

  return axios.get(`https://api.spotify.com/v1/me/tracks`, {
    headers: headers,
    params: params,
  })
  .then((response) => {
    return response.data;
  })
  .catch((error) => {
    throw error;
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
