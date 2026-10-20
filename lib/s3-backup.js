/*
  Минимальный клиент S3 (подпись AWS Signature V4) без зависимостей —
  для резервной копии локального хранилища в S3 Timeweb Cloud
  (или любом S3-совместимом хранилище).

  Переменные окружения:
    S3_BUCKET              — имя бакета (обязательно, иначе копия выключена)
    S3_ACCESS_KEY_ID       — ключ доступа
    S3_SECRET_ACCESS_KEY   — секретный ключ
    S3_ENDPOINT            — по умолчанию https://s3.timeweb.cloud
    S3_REGION              — по умолчанию ru-1
    S3_BACKUP_PREFIX       — папка в бакете, по умолчанию max-mini-app
*/
import { createHash, createHmac } from "node:crypto";

function config() {
  const bucket = String(process.env.S3_BUCKET || "").trim();
  const accessKey = String(process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "").trim();
  const secretKey = String(process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || "").trim();
  return {
    bucket,
    accessKey,
    secretKey,
    endpoint: String(process.env.S3_ENDPOINT || "https://s3.timeweb.cloud").replace(/\/+$/, ""),
    region: String(process.env.S3_REGION || "ru-1").trim(),
    prefix: String(process.env.S3_BACKUP_PREFIX || "max-mini-app").replace(/^\/+|\/+$/g, ""),
    configured: Boolean(bucket && accessKey && secretKey)
  };
}

export function isS3BackupConfigured() {
  return config().configured;
}

export function s3BackupKey(name) {
  const { prefix } = config();
  return prefix ? `${prefix}/${name}` : name;
}

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => createHmac("sha256", key).update(data).digest();

function encodeKey(key) {
  return key.split("/").map((part) => encodeURIComponent(part)).join("/");
}

/*
  Подпись запроса AWS Signature V4. headers — имена в нижнем регистре,
  должны включать host, x-amz-date и x-amz-content-sha256.
*/
export function signV4({ method, path, query = "", headers, payloadHash, region, accessKey, secretKey }) {
  const amzDate = headers["x-amz-date"];
  const dateStamp = amzDate.slice(0, 8);
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(";");
  const canonicalHeaders = names.map((name) => `${name}:${String(headers[name]).trim()}\n`).join("");
  const canonicalRequest = [method, path, query, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    signature,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

async function s3Request(method, key, body = null) {
  const cfg = config();
  if (!cfg.configured) throw new Error("S3 не настроен");

  const url = new URL(`${cfg.endpoint}/${encodeURIComponent(cfg.bucket)}/${encodeKey(key)}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const payload = body ? Buffer.from(body) : Buffer.alloc(0);
  const payloadHash = sha256(payload);

  const headers = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate
  };
  if (body) headers["content-type"] = "application/octet-stream";

  const { authorization } = signV4({
    method,
    path: url.pathname,
    headers,
    payloadHash,
    region: cfg.region,
    accessKey: cfg.accessKey,
    secretKey: cfg.secretKey
  });

  return fetch(url, {
    method,
    headers: { ...headers, Authorization: authorization },
    body: body ? payload : undefined
  });
}

export async function s3PutObject(key, body) {
  const response = await s3Request("PUT", key, body);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`S3 PUT ${response.status}: ${text.slice(0, 200)}`);
  }
}

// null, если объекта нет.
export async function s3GetObject(key) {
  const response = await s3Request("GET", key);
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`S3 GET ${response.status}: ${text.slice(0, 200)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
