require("dotenv").config();
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const { createClient } = require("@supabase/supabase-js");
const openapiSpec = require("./openapi.json");
const supabase = require("./supabaseClient");
const verifyToken = require("./verifyToken");

const app = express();
const PORT = process.env.PORT || 2000;

// Dynamically set server URL in OpenAPI spec from environment PORT
openapiSpec.servers = [{ url: `http://localhost:${PORT}` }];

app.use(express.json());

// ---------------------------------------------------------------------------
// Stage 1: Open auth — Sign Up & Log In
// ---------------------------------------------------------------------------
app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ user: data.user });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: "Invalid login credentials" });
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: data.user,
  });
});

// ---------------------------------------------------------------------------
// Stage 2: The public & protected gates
// ---------------------------------------------------------------------------
app.get("/public/info", (req, res) => {
  res.status(200).json({ message: "Welcome stranger! This info is public." });
});

// Stage 2 → Stage 3: this route starts as "reject everything" (Stage 2) and
// becomes real verification once verifyToken is wired in (Stage 3/4). Both
// stages are the same middleware — nothing here changes between them.
app.get("/protected/profile", verifyToken, (req, res) => {
  const { user } = req;
  res.status(200).json({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  });
});

// ---------------------------------------------------------------------------
// Stage 4: Middleware protection & logout
// ---------------------------------------------------------------------------

// Second protected route — the Stage 4 checkpoint. No new auth code, just
// the same verifyToken middleware reused.
app.get("/protected/dashboard", verifyToken, (req, res) => {
  const { user } = req;
  res.status(200).json({ message: `Welcome back, ${user.email}`, id: user.id });
});

app.post("/auth/logout", verifyToken, async (req, res) => {
  // supabase.auth.signOut() on the shared server-side client has no
  // concept of "this caller's session" — that client was built with the
  // anon key and never held a session at all. To actually invalidate the
  // caller's specific session (using only the anon key, never the
  // service_role key), we scope a short-lived client to their exact
  // token first. Without this step, logout would return 204 while doing
  // nothing — a bug that looks correct because it never throws.
  const scopedClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${req.token}` } },
  });

  await scopedClient.auth.signOut();

  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Stage 5: Swagger UI with bearer auth
// ---------------------------------------------------------------------------
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.listen(PORT, () => {
  console.log(`Server running and connected to Supabase`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`Swagger UI at http://localhost:${PORT}/docs`);
});

module.exports = app;
