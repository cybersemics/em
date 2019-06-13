# em (prototype)

> em is a thinking tool.
> The features of em mirror the features of your mind—from the interconnectedness of ideas, to multiple contexts, to focus, and more.

https://em-proto.web.app

# Development

## Tunneling Localhost

Localhost can be tunneled to a public url for mobile testing purposes using ngrok.

To allow logins, the ngrok domain must be added to [Firebase Authorized Domains](https://console.firebase.google.com/u/0/project/em-proto/authentication/providers).

```sh
ngrok http 3333
```
