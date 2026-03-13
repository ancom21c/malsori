#!/bin/sh
set -eu

target_conf="/etc/nginx/conf.d/default.conf"
http_conf="/etc/nginx/malsori/http.conf"
https_conf="/etc/nginx/malsori/https.conf"

if [ "${MALSORI_ENABLE_HTTPS:-0}" != "1" ]; then
    cp "$http_conf" "$target_conf"
    exit 0
fi

cert_dir="${MALSORI_TLS_CERT_DIR:-/etc/nginx/certs}"
cert_file="${MALSORI_TLS_CERT_FILE:-$cert_dir/tls.crt}"
key_file="${MALSORI_TLS_KEY_FILE:-$cert_dir/tls.key}"
cert_mode="${MALSORI_TLS_CERT_MODE:-provided}"
cert_host="${MALSORI_TLS_CERT_HOST:-localhost}"
cert_days="${MALSORI_TLS_CERT_DAYS:-365}"

mkdir -p "$(dirname "$cert_file")" "$(dirname "$key_file")"

if [ "$cert_mode" = "self-signed" ] && { [ ! -s "$cert_file" ] || [ ! -s "$key_file" ]; }; then
    san_config="$(mktemp)"
    cat >"$san_config" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
CN = $cert_host

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $cert_host
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF
    openssl req \
        -x509 \
        -nodes \
        -newkey rsa:2048 \
        -keyout "$key_file" \
        -out "$cert_file" \
        -days "$cert_days" \
        -extensions v3_req \
        -config "$san_config" >/dev/null 2>&1
    rm -f "$san_config"
fi

if [ ! -s "$cert_file" ] || [ ! -s "$key_file" ]; then
    echo "HTTPS is enabled but TLS certificate files are missing: $cert_file / $key_file" >&2
    exit 1
fi

cp "$https_conf" "$target_conf"
