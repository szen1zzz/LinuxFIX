export type LegalDocumentId = 'privacy' | 'terms' | 'refund';

export const legalDocuments: Record<LegalDocumentId, { title: string; content: string }> = {
  privacy: {
    title: 'Polityka prywatności',
    content: `Obowiązuje od 30 września 2026 r.

Administratorem danych jest LinuxFIX, prywatny projekt prowadzony w Polsce. Kontakt: LinuxFIXcontact@proton.me.

LinuxFIX może przetwarzać treść pytań, logów i błędów, wybraną dystrybucję, a dla kont także adres e-mail, skrót hasła, token sesji i historię analiz. Treść wysłana do AI trafia przez backend LinuxFIX do lokalnego modelu Ollama. Transmisję może obsługiwać Cloudflare, a publiczna konfiguracja backendu jest pobierana z GitHub Pages.

Dane służą do wykonania analizy, synchronizacji historii, obsługi konta i ochrony przed nadużyciami. LinuxFIX nie sprzedaje danych. Nie wysyłaj w logach haseł, kluczy API, tokenów ani kluczy prywatnych.

Historia konta jest przechowywana maksymalnie 7 dni, konto do chwili jego usunięcia, a sesja do 30 dni lub wylogowania. Zgoda jest zapisywana lokalnie na urządzeniu do jej wycofania.

Aplikacja nie używa cookies ani reklamowych identyfikatorów śledzących. Aktualna wersja nie uruchamia zewnętrznej analityki ani automatycznych raportów awarii. Dodanie takich narzędzi będzie wymagało aktualizacji polityki i odpowiedniej informacji lub zgody.

Możesz poprosić o dostęp, poprawienie, usunięcie lub ograniczenie danych, wycofać zgodę i zgłosić sprzeciw, pisząc na LinuxFIXcontact@proton.me. Możesz też złożyć skargę do Prezesa UODO.

Aktualna wersja funkcji przetwarzających dane jest przeznaczona dla osób od 16 roku życia. LinuxFIX nie udostępnia obecnie mechanizmu weryfikacji zgody rodzica lub opiekuna.`,
  },
  terms: {
    title: 'Regulamin',
    content: `Obowiązuje od 30 września 2026 r.

LinuxFIX jest prywatnym projektem prowadzonym w Polsce. Kontakt: LinuxFIXcontact@proton.me.

Aplikacja udostępnia reguły diagnostyczne i odpowiedzi AI dotyczące Linuksa. Nie wykonuje poleceń automatycznie i nie łączy się z komputerem użytkownika przez SSH.

Użytkownik funkcji przetwarzających dane powinien mieć co najmniej 16 lat. Podstawowe funkcje nie wymagają konta. Użytkownik odpowiada za ochronę danych logowania.

Nie wolno używać usługi do atakowania systemów bez upoważnienia, masowego wysyłania zapytań, obchodzenia limitów, przesyłania cudzych danych bez podstawy ani zakłócania infrastruktury.

Odpowiedzi mogą zawierać błędy. Przed uruchomieniem polecenia sprawdź dokumentację, źródło i poziom ryzyka oraz wykonaj kopię zapasową. Zachowaj szczególną ostrożność przy sudo, dyskach, systemach plików, bootloaderze i uprawnieniach.

Usługa alpha i beta może być czasowo niedostępna lub zmieniana. Użytkownik może usunąć konto i dane z aplikacji albo przez kontakt e-mail.

Regulamin podlega prawu polskiemu oraz bezwzględnie obowiązującym prawom konsumenta.`,
  },
  refund: {
    title: 'Płatności i zwroty',
    content: `Obowiązuje od 30 września 2026 r.

LinuxFIX jest obecnie bezpłatny. Aplikacja nie sprzedaje subskrypcji, funkcji cyfrowych ani produktów, dlatego nie pobiera płatności i nie realizuje zwrotów.

Jeżeli płatności zostaną dodane, przed uruchomieniem sprzedaży pojawią się informacje o cenie, okresie rozliczeniowym, anulowaniu i zwrotach. Zakupy przez App Store lub Google Play będą również podlegać zasadom odpowiedniego sklepu oraz obowiązującym prawom konsumenta.

Kontakt: LinuxFIXcontact@proton.me.`,
  },
};
