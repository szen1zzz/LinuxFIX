# LinuxFIX: droga do wersji beta

## Cel bety

Beta ma być wersją, którą można przekazać małej grupie użytkowników bez ręcznego tłumaczenia konfiguracji i bez ryzyka podania poleceń dla niewłaściwej dystrybucji.

## Etap 1: stabilny produkt

- Podzielić `App.tsx` na ekrany, komponenty, klienta API i hooki.
- Zapisywać ustawienia lokalnie, a token konta w bezpiecznym magazynie systemowym.
- Dodać ekran szczegółów analizy z kopiowaniem pojedynczych poleceń.
- Oznaczać ryzyko każdego polecenia również w wynikach lokalnych.
- Rozbudować reguły Debiana i przeprowadzić ręczny przegląd wszystkich komend.
- Dodać jasne stany: brak internetu, backend offline, Ollama offline i przekroczony limit czasu.

## Etap 2: backend gotowy dla testerów

- Zastąpić pliki JSON bazą SQLite lub PostgreSQL.
- Dodać migracje danych, kopie zapasowe i odzyskiwanie konta.
- Przenieść limitowanie zapytań do trwałego magazynu lub reverse proxy.
- Dodać kontrolowane logowanie błędów bez zapisywania treści prywatnych logów użytkownika.
- Uruchomić backend pod stałym adresem HTTPS. GitHub Pages z adresem Quick Tunnel pozostawić tylko jako rozwiązanie przejściowe.
- Dodać testy kontraktu dla `/health`, `/analyze`, `/auth/*` i `/history`.

## Etap 3: jakość diagnoz

- Przygotować zestaw prawdziwych, zanonimizowanych błędów testowych dla Archa i Debiana.
- Mierzyć poprawność dystrybucji, źródeł, poziomu ryzyka i sugerowanych poleceń.
- Blokować odpowiedzi zawierające destrukcyjne komendy bez wyraźnego ostrzeżenia.
- Rozszerzyć rejestr oficjalnych źródeł i pokazywać klikalne cytowania przy konkretnych krokach.
- Dodać możliwość oceny odpowiedzi jako pomocnej lub błędnej, bez publicznych recenzji marketingowych.

## Etap 4: zamknięta beta

- Zbudować `0.2.0-beta.1` przez EAS.
- Udostępnić wersję 10–20 testerom.
- Zebrać raporty awarii, model telefonu, wersję systemu i kroki reprodukcji za zgodą użytkownika.
- Naprawić wszystkie błędy blokujące oraz problemy z utratą historii lub sesji.
- Przygotować politykę prywatności opisującą przesyłanie logów do backendu i Ollamy.

## Kryteria wyjścia z alphy

- Brak mieszania poleceń Arch i Debian.
- Brak sekretów oraz stałych adresów tuneli w APK.
- Wszystkie odpowiedzi AI są walidowane przed pokazaniem.
- Konto, historia i ustawienia przeżywają restart aplikacji.
- Backend ma trwałą bazę, wygasające sesje, limit zapytań i stały HTTPS.
- Najważniejsze przepływy mają testy automatyczne.
- Co najmniej 10 testerów ukończy podstawowe scenariusze bez błędu blokującego.
