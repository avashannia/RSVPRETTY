<?php
/**
 * process-rsvp.php – optional server-side fallback.
 *
 * Browser -> this file -> Google Apps Script -> Google Sheet.
 *
 * Use PHP when you want to:
 *  - keep the Apps Script URL private (it stays on your server)
 *  - show real success/error messages (no-cors hides them from JavaScript)
 *  - add your own checks, like a CAPTCHA or IP rate limit
 * Call Apps Script directly from JavaScript when you host on static hosting
 * with no PHP, or want the simplest setup.
 *
 * In script.js, point fetch() at "process-rsvp.php" and remove mode:"no-cors".
 */

const APPS_SCRIPT_URL = 'PASTE_YOUR_EXEC_URL_HERE';

header('Content-Type: application/json; charset=utf-8');

function respond(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'POST only.']);
}

// Accept JSON or normal form posts
$raw = file_get_contents('php://input');
$in = json_decode($raw, true);
if (!is_array($in)) $in = $_POST;

// Honeypot: pretend success so bots learn nothing
if (!empty($in['website'])) respond(200, ['ok' => true]);

function field(array $a, string $k, int $max): string {
    $v = trim((string)($a[$k] ?? ''));
    return mb_substr(strip_tags($v), 0, $max);
}

$name      = field($in, 'name', 100);
$email     = filter_var(field($in, 'email', 150), FILTER_VALIDATE_EMAIL);
$attending = field($in, 'attending', 10);
$guests    = max(1, min(10, (int)($in['guests'] ?? 1)));
$dietary   = field($in, 'dietary', 500);

if ($name === '')                                   respond(422, ['ok' => false, 'error' => 'Name is required.']);
if (!$email)                                        respond(422, ['ok' => false, 'error' => 'Valid email is required.']);
if (!in_array($attending, ['Yes','No','Maybe'], true)) respond(422, ['ok' => false, 'error' => 'Choose Yes, No or Maybe.']);

// Basic per-session throttle (one request every 10 seconds)
session_start();
if (isset($_SESSION['last']) && time() - $_SESSION['last'] < 10) {
    respond(429, ['ok' => false, 'error' => 'Please wait a few seconds.']);
}
$_SESSION['last'] = time();

// Forward to Apps Script. It replies with a redirect, so follow it.
$ch = curl_init(APPS_SCRIPT_URL);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode(compact('name', 'attending', 'guests', 'dietary') + ['email' => $email]),
    CURLOPT_HTTPHEADER     => ['Content-Type: text/plain'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_POSTREDIR      => 3,   // keep POST on 301/302
    CURLOPT_TIMEOUT        => 15,
]);
$result = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$decoded = json_decode((string)$result, true);
if ($result === false || $status >= 400 || !is_array($decoded)) {
    respond(502, ['ok' => false, 'error' => 'Could not reach the RSVP sheet. Try again soon.']);
}
respond($decoded['ok'] ? 200 : 422, $decoded);