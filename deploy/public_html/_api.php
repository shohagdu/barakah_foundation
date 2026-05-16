<?php
/**
 * PHP Proxy — routes /barakah_foundation/api/* → http://127.0.0.1:8080/api/*
 * Works on any cPanel shared hosting (PHP + cURL, no mod_proxy needed)
 */

// ── Extract path after /barakah_foundation/api ─────────────────
$requestUri  = $_SERVER['REQUEST_URI'];
$apiPath     = preg_replace('#^/barakah_foundation/api#', '', parse_url($requestUri, PHP_URL_PATH));
$queryString = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
               ? '?' . $_SERVER['QUERY_STRING'] : '';
$backendUrl  = 'http://127.0.0.1:8080/api' . $apiPath . $queryString;

// ── Build forwarded headers ────────────────────────────────────
$method   = $_SERVER['REQUEST_METHOD'];
$headers  = [];

if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        $lower = strtolower($name);
        if ($lower === 'host') continue;
        if ($lower === 'content-length') continue;
        $headers[] = "$name: $value";
    }
} else {
    // Fallback for servers where getallheaders() is not available
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $name = str_replace('_', '-', substr($key, 5));
            $headers[] = ucwords(strtolower($name), '-') . ': ' . $value;
        } elseif ($key === 'CONTENT_TYPE') {
            $headers[] = 'Content-Type: ' . $value;
        } elseif ($key === 'CONTENT_LENGTH') {
            // skip — curl sets this automatically
        }
    }
}

// ── Setup cURL ────────────────────────────────────────────────
$ch = curl_init($backendUrl);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST,  $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER,         true);
curl_setopt($ch, CURLOPT_TIMEOUT,        30);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);

// ── File upload (multipart/form-data) ─────────────────────────
if (!empty($_FILES)) {
    $postFields = [];
    foreach ($_POST as $k => $v) {
        $postFields[$k] = $v;
    }
    foreach ($_FILES as $k => $f) {
        if ($f['error'] === UPLOAD_ERR_OK) {
            $postFields[$k] = new CURLFile($f['tmp_name'], $f['type'], $f['name']);
        }
    }
    // Remove Content-Type so cURL sets it with correct multipart boundary
    $headers = array_values(array_filter($headers, function($h) {
        return stripos($h, 'content-type') !== 0;
    }));
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
} else {
    // Regular JSON / text body
    $body = file_get_contents('php://input');
    if ($body !== '' && in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// ── Execute ───────────────────────────────────────────────────
$raw        = curl_exec($ch);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError  = curl_error($ch);
curl_close($ch);

// ── Backend unreachable ───────────────────────────────────────
if ($raw === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Backend unreachable. Start the backend service. Details: ' . $curlError]);
    exit;
}

// ── Forward response ──────────────────────────────────────────
$respHeaders = substr($raw, 0, $headerSize);
$respBody    = substr($raw, $headerSize);

http_response_code($httpCode);

foreach (explode("\r\n", $respHeaders) as $line) {
    if (!$line || strpos($line, 'HTTP/') === 0) continue;
    $lower = strtolower($line);
    if (strpos($lower, 'transfer-encoding') === 0) continue;
    if (strpos($lower, 'connection') === 0) continue;
    header($line, false);
}

echo $respBody;
