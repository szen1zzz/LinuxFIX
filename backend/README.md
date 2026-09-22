# LinuxFIX backend

Backend jest pośrednikiem między aplikacją mobilną a lokalną Ollamą. Obsługuje zarówno logi i błędy, jak i pytania instruktażowe dotyczące wybranej dystrybucji. Nie wkładaj adresu Ollamy, haseł ani kluczy API do APK.

## Uruchomienie

Najpierw zainstaluj Ollamę i pobierz model:

```powershell
ollama pull qwen2.5:7b
```

Ollama może działać jako usługa w tle. Nie musisz zostawiać osobnego `ollama run` otwartego, jeśli usługa Ollama jest uruchomiona.

W drugim terminalu uruchom backend:

```powershell
cd C:\Users\nikod\apps\archfix
npm.cmd run backend
```

Sprawdzenie:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

Możesz też otworzyć w przeglądarce:

```text
http://127.0.0.1:8787/
```

Adres główny pokazuje informację o backendzie. Do analizy używaj aplikacji albo
wyślij żądanie `POST` do `/analyze` — samo otwarcie `/analyze` w przeglądarce
nie uruchomi analizy, ponieważ ten endpoint wymaga danych JSON.

Test analizy:

```powershell
$body = @{ distro = "arch"; log = "error: target not found: firefox" } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8787/analyze -Method Post -ContentType "application/json" -Body $body
```

Backend nie wykonuje komend. Tylko przekazuje log do Ollamy i zwraca propozycję w JSON.

### Źródła zależne od dystrybucji

`backend/sources.json` jest statycznym rejestrem krótkich opisów i oficjalnych
adresów URL dla `arch` i `debian`. Endpoint `/analyze` przekazuje modelowi
wyłącznie wpisy wybranej dystrybucji; nie pobiera ani nie skanuje internetu
podczas żądania. Źródła zwrócone przez model są ograniczane do adresów z tego
samego rejestru i wybranej dystrybucji. Dla nieznanej dystrybucji kontekst źródeł
jest pusty. Rejestr nie zastępuje aktualnej dokumentacji ani weryfikacji
poleceń przez użytkownika.

## Konta i historia AI

Backend zapisuje konta, sesje i historię w plikach JSON w `backend/data/`.
Pliki te są ignorowane przez Git. Rejestracja i logowanie zwracają token sesji,
który należy wysyłać jako `Authorization: Bearer <token>`.

Rejestracja:

```powershell
$body = @{ email = "user@example.com"; password = "correct-horse-battery" } | ConvertTo-Json
$account = Invoke-RestMethod -Uri http://127.0.0.1:8787/auth/register -Method Post -ContentType "application/json" -Body $body
```

Logowanie:

```powershell
$account = Invoke-RestMethod -Uri http://127.0.0.1:8787/auth/login -Method Post -ContentType "application/json" -Body $body
$headers = @{ Authorization = "Bearer $($account.token)" }
```

Wylogowanie unieważnia bieżący token po stronie backendu:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8787/auth/logout -Method Post -Headers $headers
```

Sesje wygasają po 30 dniach. Ponowne logowanie unieważnia poprzednią sesję tego konta.

Pobranie i zapis historii (zapis zastępuje historię tego konta):

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8787/history -Headers $headers
$history = @{ messages = @(
  @{ role = "user"; content = "error: target not found: firefox" },
  @{ role = "assistant"; content = "Sprawdź nazwę pakietu." }
) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://127.0.0.1:8787/history -Method Post -Headers $headers -ContentType "application/json" -Body $history
```

Hasła są przechowywane jako klucze pochodne `crypto.scrypt`, a tokeny są
losowe. Backend zapisuje wyłącznie skróty tokenów sesji. Restart po aktualizacji
do 0.2.2 unieważnia sesje z wcześniejszych wersji, które zapisywały tokeny
jawnie. Backend ogranicza logowanie, rejestrację i analizy AI oraz dopuszcza
maksymalnie dwie równoległe analizy. To nadal prosta persystencja lokalna:
przed szerszą publiczną premierą wdroż stały HTTPS, Cloudflare WAF lub Turnstile,
kopie zapasowe i właściwą bazę danych. Chroń katalog `backend/data`, ponieważ
zawiera dane kont i historię.

## Telefon i dostęp z internetu

`127.0.0.1` działa tylko wtedy, gdy aplikacja i backend są na tym samym urządzeniu. Telefon potrzebuje publicznego hosta HTTPS. Backend od wersji 0.2.2 nasłuchuje domyślnie wyłącznie na `127.0.0.1`, aby nie udostępniać kont i historii wszystkim urządzeniom w lokalnej sieci. To współpracuje z Cloudflare Tunnel. Świadomie ustaw `HOST=0.0.0.0` tylko wtedy, gdy chcesz otworzyć dostęp LAN.

Tymczasowy Quick Tunnel Cloudflare może dać adres `https://...trycloudflare.com`, ale adres może zmienić się po restarcie. Nie traktuj go jako stałego adresu produkcyjnego.

Quick Tunnel nadaje się do małej, kontrolowanej bety. Przed otwartym publicznym
ruchem skonfiguruj stały HTTPS oraz ochronę Cloudflare przed automatycznym ruchem.
