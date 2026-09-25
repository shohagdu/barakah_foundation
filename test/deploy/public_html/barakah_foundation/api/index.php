<?php
/**
 * Barakah Foundation — API Proxy
 * Physical path: public_html/barakah_foundation/api/index.php
 * Forwards all requests to the backend running on port 8080
 */

// Extract path after /barakah_foundation/api
$fullPath    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$apiPath     = preg_replace('#^/barakah_foundation/api#', '', $fullPath);
if ($apiPath === '') $apiPath = '/';

$queryString = !empty($_SERVER['QUERY_STRING']) ? '?' . $_SERVER['QUERY_STRING'] : '';
$backendUrl  = 'http://127.0.0.1:8080/api' . $apiPath . $queryString;
$method      = $_SERVER['REQUEST_METHOD'];

// Build headers to forward
$headers = [];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        $lower = strtolower($name);
        if ($lower === 'host' || $lower === 'content-length') continue;
        $headers[] = "$name: $value";
    }
} else {
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $name = ucwords(strtolower(str_replace('_', '-', substr($key, 5))), '-');
            $headers[] = "$name: $value";
        } elseif ($key === 'CONTENT_TYPE') {
            $headers[] = "Content-Type: $value";
        }
    }
}

$ch = curl_init($backendUrl);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST,  $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER,         true);
curl_setopt($ch, CURLOPT_TIMEOUT,        30);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);

// Handle file uploads
if (!empty($_FILES)) {
    $postFields = $_POST;
    foreach ($_FILES as $k => $f) {
        if ($f['error'] === UPLOAD_ERR_OK) {
            $postFields[$k] = new CURLFile($f['tmp_name'], $f['type'], $f['name']);
        }
    }
    $headers = array_values(array_filter($headers, function($h) {
        return stripos($h, 'content-type') !== 0;
    }));
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
} else {
    $body = file_get_contents('php://input');
    if ($body !== '' && in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$raw        = curl_exec($ch);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError  = curl_error($ch);
curl_close($ch);

if ($raw === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Backend unreachable: ' . $curlError]);
    exit;
}

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
