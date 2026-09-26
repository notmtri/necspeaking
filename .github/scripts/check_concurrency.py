"""Fail if one slow upload can stall every other request.

Recreates the production failure: with gunicorn's default single sync worker,
a phone uploading its recording over a slow connection held the only worker
for the whole upload, and every other student's request queued behind it.

Opens an upload that sends its headers and a few bytes of body, then stalls,
and checks that a second request is still answered promptly.

Usage: python check_concurrency.py http://127.0.0.1:8765
"""
import socket
import sys
import time
import urllib.request
from urllib.parse import urlparse

base = sys.argv[1].rstrip('/')
target = urlparse(base)

stalled = socket.create_connection((target.hostname, target.port), timeout=10)
stalled.sendall((
    'POST /api/analyze HTTP/1.1\r\n'
    f'Host: {target.hostname}\r\n'
    'Content-Type: multipart/form-data; boundary=stall\r\n'
    'Content-Length: 1000000\r\n'
    '\r\n'
    '--stall\r\n'
).encode())
time.sleep(1)  # let the server pick the stalled request up first

started = time.monotonic()
try:
    with urllib.request.urlopen(f'{base}/api/health', timeout=8) as response:
        status = response.status
except Exception as error:  # timeout means the server is serialised
    status = f'no answer ({error})'
elapsed = time.monotonic() - started
stalled.close()

print(f'/api/health during a stalled upload: {status} in {elapsed:.2f}s')
if status != 200 or elapsed > 3:
    sys.exit('FAIL: a slow upload blocks other requests -- the server is handling one request at a time.')
print('OK: requests are served concurrently.')
