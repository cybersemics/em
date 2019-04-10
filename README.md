# em (prototype)

## Tunneling Localhost

Localhost can be tunneled to a public url for testing purposes using ngrok.

To allow logins, the ngrok domain must be added to [Firebase Authorized Domains](https://console.firebase.google.com/u/0/project/em-proto/authentication/providers).

```sh
ngrok http 3333
```

## Known Issues

- Does not idenfity item with trimmed item: `Names` and `Names `
- Not case-insensitive: `Names` and `names`
- <a> tags do not have hrefs
- Multiline leaf nodes wrap around bullet instead of indenting
- URL's do not link
- '/' not double encoded in 'from' query string
  e.g. Content%2FDomains (below), is a single item, but its escaped '/' get interpreted as an intersection divider when encoded in the 'from' query string).
  http://localhost:3000/Journals?from=%F0%9F%93%9C%20Philosophy%2FContent%2FDomains%2FSemantics
