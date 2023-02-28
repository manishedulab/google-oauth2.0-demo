const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { OAuth2Client } = require("google-auth-library");
const ejs = require("ejs");
const jwt = require("jsonwebtoken");
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('ioredis')
require('dotenv').config()
const app = express();


const client = redis.createClient({
  host: process.env.HOST,
  port: 6379,
  legacyMode: true,
});
client.on('connect', () => {
  console.log('Connected to Redis');
});
client.on('error', (err) => {
  console.error('Error connecting to Redis:', err);
});

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET=process.env.CLIENT_SECRET
const gclient = new OAuth2Client(CLIENT_ID,CLIENT_SECRET);

app.set("view engine", "ejs");


passport.use(
  new GoogleStrategy(
    {
      clientID:CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      accessType: "offline",
      passReqToCallback: true,
      prompt: "consent",
      scope: ["openid","profile", "email" ],
    },
    function (req,accessToken, refreshToken,id_token,profile, cb) {
      // console.log('refreshToken', refreshToken)
      // console.log("access token", accessToken);
      // console.log("profile", profile);
      // console.log("id_token", id_token);
      // profile.id_token = accessToken;
      
      return cb(null, profile,id_token);
    }
  )
);
passport.serializeUser(function (user, cb) {
  cb(null, user);
});
passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});



app.use(require("cookie-parser")());
app.use(express.json());

// Session middleware with RedisStore
app.use(
  session({
    store: new RedisStore({ client: client }),
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());


const ensureAuthenticated = function (req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect("/login");
};

app.get("/home", ensureAuthenticated, function (req, res) {
  res.render("home", { user: req.user });
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/good", ensureAuthenticated, function (req, res) {
  res.send("welcome to the good <br/><a href='/home'> Back to Home</a>");
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["openid","profile", "email"],
    accessType: "offline",
    prompt: "consent",
  })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async function (req, res) {
    const idToken = req.authInfo.id_token;
    // console.log("authInfo=====> " ,req.res)
    const payload = await verifyIdToken(idToken);
    if (!payload) {
      return res.redirect("/login");
    }
    req.session.userId = payload.sub;
    res.redirect("/home");
  }
);

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/home");
  });
});

const verifyIdToken = async (token) => {
  try {
    const ticket = await gclient.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    console.error(error);
    return null;
  }
};

app.listen(process.env.PORT, () =>
  console.log("listening on port http://localhost:3000/home,")
);
