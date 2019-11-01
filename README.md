# em

**em** is a general purpose, multi-hierarchical writing app. The user views and navigates their thoughtspace hierarchically (*a la* outliner), yet thoughts (nodes) may belong to many contexts (parents). 

**em**'s user experience is designed to mirror the properties of the conceptual mind, including focal constraint, contextuality, nonlinearity, and associative connections.

https://emtheapp.com

![em screenshot](https://emtheapp.com/wp-content/uploads/2019/07/em-autofocus.gif)

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
