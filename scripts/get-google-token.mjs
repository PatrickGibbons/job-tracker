/**
 * Run once to get a Google OAuth refresh token:
 *   node scripts/get-google-token.mjs
 *
 * Requires in your environment (or .env.local exported):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 */

import http from "node:http";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const PORT = 9999;
const REDIRECT_URI = `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Error: Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment first.\n" +
    "Example:\n" +
    "  $env:GOOGLE_OAUTH_CLIENT_ID='your_id'; $env:GOOGLE_OAUTH_CLIENT_SECRET='your_secret'; node scripts/get-google-token.mjs"
  );
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive");
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\nOpen this URL in your browser:\n");
console.log(authUrl.toString());
console.log("\nWaiting for you to authorize...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`Authorization failed: ${error}`);
    server.close();
    return;
  }

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("No code received.");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("No refresh token returned. Try revoking app access at myaccount.google.com/permissions and re-running.");
      console.error("Response:", tokens);
      server.close();
      return;
    }

    console.log("✓ Success! Add this line to your .env.local:\n");
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
        <body style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 20px">
          <h2>✓ Authorized!</h2>
          <p>Add this line to your <code>.env.local</code>:</p>
          <pre style="background:#f4f4f4;padding:12px;border-radius:6px;word-break:break-all">GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}</pre>
          <p>You can close this tab.</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Error: " + err.message);
    console.error(err);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT} — do not close this terminal.`);
});
