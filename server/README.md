em websocket server

## Build

```sh
npm run build
```

## Usage

em will automatically connect to the websocket server when running on the specified host and port.

```sh
npm run start
```

With timestamps:

```sh
LOG_TIMESTAMPS=1 npm run start
```

Defaults:

- `process.env.LOG_TIMESTAMPS` - Unset
- `process.env.HOST` - localhost
- `process.env.POST` - 8080

Start script defaults:

- `process.env.YPERSISTENCE` - .thoughts.level
- `process.env.YPERMISSIONS` - .permissions.level
- `process.env.DB_DOCLOGMETA` - .doclogmeta.level
