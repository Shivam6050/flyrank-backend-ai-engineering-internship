const supabase = require("./supabaseClient");

/**
 * The Stage 3 verification logic, extracted into reusable Express
 * middleware per Stage 4. Any route can be locked with a single line:
 *
 *   app.get("/protected/whatever", verifyToken, (req, res) => { ... });
 *
 * On success it attaches the verified user to req.user and calls next().
 * On failure it sends the 401 itself and never calls next() — the route
 * handler body never runs.
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = data.user;
  req.token = token;
  next();
}

module.exports = verifyToken;
