# Survey App (q)

Single-folder app (frontend + backend) deployed to `q.gcc3.com`.

## Development

```bash
npm install

# Terminal 1 - backend API (port 3001)
npm run dev:server

# Terminal 2 - frontend dev server (port 5173)
npm run dev:client
```

## Deploy

```bash
./setup.sh    # first time: install + build
./start.sh    # start with pm2
./restart.sh  # git pull + rebuild + restart
```
