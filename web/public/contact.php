<?php
// Contact form endpoint for the static site on SiteGround. Accepts the same
// JSON as the old Next.js /api/contact route and sends the message through
// Resend.
//
// The API key lives OUTSIDE the web root, in contact-config.php next to
// public_html (the deploy never touches it):
//
//   <?php return ['resend_api_key' => 're_...'];

header('Content-Type: application/json; charset=utf-8');

const RECIPIENT = 'seatownrealist@gmail.com';
const FROM = 'LandonBuford Contact <onboarding@resend.dev>';

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

function fail(int $status, string $message): void
{
    respond($status, ['ok' => false, 'error' => $message]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Method not allowed.');
}

$body = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($body)) {
    fail(400, 'Invalid request body.');
}

// Honeypot: bots fill the hidden field and get a silent success.
if (!empty($body['honeypot'])) {
    respond(200, ['ok' => true]);
}

$name = trim((string) ($body['name'] ?? ''));
$email = trim((string) ($body['email'] ?? ''));
$message = trim((string) ($body['message'] ?? ''));

if ($name === '' || mb_strlen($name) > 200) {
    fail(400, 'Name is required.');
}
if ($email === '' || mb_strlen($email) > 320 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail(400, 'A valid email is required.');
}
if (mb_strlen($message) < 10 || mb_strlen($message) > 5000) {
    fail(400, 'Message must be 10–5000 characters.');
}

$configPath = dirname(__DIR__) . '/contact-config.php';
$config = is_file($configPath) ? require $configPath : [];
$apiKey = is_array($config) ? (string) ($config['resend_api_key'] ?? '') : '';
if ($apiKey === '') {
    error_log('Contact form: resend_api_key is not set in ' . $configPath);
    fail(503, 'Contact form is not configured yet.');
}

$esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$subjectName = preg_replace('/[\r\n]+/', ' ', $name);

$payload = [
    'from' => FROM,
    'to' => [RECIPIENT],
    'reply_to' => $email,
    'subject' => "New contact form message from {$subjectName}",
    'text' => "Name: {$name}\nEmail: {$email}\n\nMessage:\n{$message}\n",
    'html' =>
        '<p><strong>Name:</strong> ' . $esc($name) . '</p>' .
        '<p><strong>Email:</strong> <a href="mailto:' . $esc($email) . '">' . $esc($email) . '</a></p>' .
        '<p><strong>Message:</strong></p>' .
        '<pre style="white-space:pre-wrap;font-family:inherit">' . $esc($message) . '</pre>',
];

$ch = curl_init('https://api.resend.com/emails');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
]);
$response = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $status < 200 || $status >= 300) {
    error_log("Contact form: Resend error {$status} " . (string) $response);
    fail(502, 'Failed to send message. Please try again later.');
}

respond(200, ['ok' => true]);
