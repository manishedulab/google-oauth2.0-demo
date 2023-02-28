const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const ejs = require("ejs");
const jwt = require("jsonwebtoken");
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('ioredis')

const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  legacyMode: true,
});
client.on('connect', () => {
  console.log('Connected to Redis');
});
client.on('error', (err) => {
  console.error('Error connecting to Redis:', err);
});

const app = express();

app.set("view engine", "ejs");


passport.use(
  new GoogleStrategy(
    {
      clientID:
        "581667473293-rs803e6inh5uqec9qrcobp9d8asoaojo.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: "http://localhost:3000/auth/google/callback",
      accessType: "offline",
      passReqToCallback: true,
      prompt: "consent",
      scope: ["openid","profile", "email" ],
    },
    function (req,accessToken, refreshToken,id_token,profile, cb) {
      console.log('refreshToken', refreshToken)
      console.log("access token", accessToken);
      console.log("profile", profile);
      console.log("id_token", id_token);
      // profile.id_token = accessToken;
      
      return cb(null, profile);
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
  if (req.isAuthenticated()) {
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
  res.send("<a href='/home'> Back to Home</a>");
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["openid","profile", "email"],
    accessType: "offline",
    prompt: "consent",
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
  // console.log("google user authenticated=====>",req.user)
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

app.listen(3000, () =>
  console.log("listening on port http://localhost:3000/home,")
);
