# em

**em** is a general-purpose, structured, contextual writing app. Thoughts are represented as a graph (i.e. network) and rendered as a hierarchy of adjacency.

**em**'s user experience is designed to mirror the properties of the conceptual mind, including focal constraint, contextuality, nonlinearity, and associative connectivity.

https://emtheapp.com

![em screenshot](https://github.com/cybersemics/em-proto/blob/dev/screenshot.gif?raw=true)

## Status

**em** is currently in Private Beta. Email raine@cybersemics.org to request access.

## Development

### Schema Versions

The version of the data schema is stored in `schemaVersion`, allowing for systematic migrations. See SCHEMA_* constants for specific version information.

### Tunneling Localhost

Localhost can be tunneled to a public url for mobile testing purposes using ngrok.

To allow logins, the ngrok domain must be added to [Firebase Authorized Domains](https://console.firebase.google.com/u/0/project/em-proto/authentication/providers).

```sh
ngrok http 3333
```
