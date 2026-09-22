# LinuxFIX Backend

The backend connects the mobile application to a locally operated Ollama instance. It accepts error logs, diagnostic questions, and Linux how-to questions for the selected distribution. Never place the Ollama address, passwords, or API keys in the APK.

## Start the backend

Install Ollama and download the model:

```powershell
ollama pull qwen2.5:7b
```

Ollama may run as a background service. You do not need to keep a separate `ollama run` process open while that service is running.

Start the backend in another terminal:

```powershell
cd C:\Users\nikod\apps\archfix
npm.cmd run backend
```

Check its health:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

You can also open this address in a browser:

```text
http://127.0.0.1:8787/
```

The root endpoint describes the backend. Use the application or send a JSON `POST` request to `/analyze` to start an analysis. Opening `/analyze` directly in a browser does not start one.

Example analysis request:

```powershell
$body = @{ distro = "arch"; log = "error: target not found: firefox" } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8787/analyze -Method Post -ContentType "application/json" -Body $body
```

The backend never executes commands. It sends the request to Ollama and returns a structured JSON suggestion.

### Distribution-specific sources

`backend/sources.json` is a static registry of short descriptions and official URLs for `arch` and `debian`. The `/analyze` endpoint provides only entries belonging to the selected distribution. It does not browse or scan the internet while handling a request.

Sources returned by the model are restricted to URLs present in the registry for that distribution. An unknown distribution receives no source context. The registry does not replace current documentation or the user's review of a suggested command.

## Accounts and AI history

The backend stores accounts, sessions, and history as JSON files in `backend/data/`. Git ignores this directory. Registration and login return a session token that must be sent as `Authorization: Bearer <token>`.

Registration:

```powershell
$body = @{ email = "user@example.com"; password = "correct-horse-battery" } | ConvertTo-Json
$account = Invoke-RestMethod -Uri http://127.0.0.1:8787/auth/register -Method Post -ContentType "application/json" -Body $body
```

Login:

```powershell
$account = Invoke-RestMethod -Uri http://127.0.0.1:8787/auth/login -Method Post -ContentType "application/json" -Body $body
$headers = @{ Authorization = "Bearer $($account.token)" }
```

Logout revokes the current token on the backend:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8787/auth/logout -Method Post -Headers $headers
```

Sessions expire after 30 days. Signing in again revokes the account's previous session.

Read and replace the account history:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8787/history -Headers $headers
$history = @{ messages = @(
  @{ role = "user"; content = "error: target not found: firefox" },
  @{ role = "assistant"; content = "Check the package name." }
) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://127.0.0.1:8787/history -Method Post -Headers $headers -ContentType "application/json" -Body $history
```

Passwords are stored using keys derived with `crypto.scrypt`. Session tokens are random, and the backend stores only their hashes. Restarting version 0.2.2 revokes sessions created by older versions that stored raw tokens.

The backend rate-limits registration, login, and AI analysis and permits no more than two concurrent analyses. This remains a simple local persistence layer. Before a wider public release, deploy stable HTTPS, Cloudflare WAF or Turnstile, backups, and a production database. Protect `backend/data/` because it contains account data and conversation history.

## Phone and internet access

`127.0.0.1` is accessible only from the machine running the backend. The backend listens only on `127.0.0.1` by default so account data and history are not exposed to every device on the local network. This works with Cloudflare Tunnel. Set `HOST=0.0.0.0` only when you intentionally want to allow LAN access.

A temporary Cloudflare Quick Tunnel can provide an address such as `https://...trycloudflare.com`, but that address may change after a restart. Do not treat it as a stable production endpoint.

Quick Tunnel is suitable for a small, controlled beta. Configure stable HTTPS and Cloudflare abuse protection before accepting wider public traffic.
