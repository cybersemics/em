# em

## A thinking tool

**em** gives you an open space to record your thoughts and organize ideas. The features of **em** mirror the features of your mind—from focus, to multiple contexts, to the interconnectedness of ideas.

![screenshot](https://emtheapp.com/wp-content/uploads/2019/07/em-autofocus.gif)

https://emtheapp.com

## Status

em is currently in Private Beta. Email raine@cybersemics.org to request access.

# Development

## Schema Versions

The version of the data schema is stored in `schemaVersion`, allowing for systematic migrations. See SCHEMA_* constants for specific version information.

## Tunneling Localhost

Localhost can be tunneled to a public url for mobile testing purposes using ngrok.

To allow logins, the ngrok domain must be added to [Firebase Authorized Domains](https://console.firebase.google.com/u/0/project/em-proto/authentication/providers).

```sh
ngrok http 3333
```
