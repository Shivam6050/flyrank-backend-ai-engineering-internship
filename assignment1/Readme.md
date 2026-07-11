> ?? **Note:** The documentation in this README was AI-assisted, but all the code is written by me.

# tiny-server

The smallest possible backend: one Express server, two JSON endpoints.

- `GET /api/health` — returns server status and current time
- `GET /api/greet?name=YourName` — returns a greeting

## Run it

```bash
npm install
npm start
```

Server starts at `http://localhost:3000`.

## Call it from curl

```bash
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/greet?name=Shivam"
```

## Call it from your browser

Just open these URLs directly:

- http://localhost:3000/api/health
- http://localhost:3000/api/greet?name=Shivam

(GET requests with no body work fine as plain browser navigation — the browser
is just making the same HTTP request curl does.)

## Publish to GitHub

```bash
git init
git add .
git commit -m "Tiny backend: two JSON endpoints"
gh repo create tiny-server --public --source=. --remote=origin --push
```

If you don't have the `gh` CLI, create an empty repo on github.com instead, then:

```bash
git remote add origin https://github.com/<your-username>/tiny-server.git
git branch -M main
git push -u origin main
```
