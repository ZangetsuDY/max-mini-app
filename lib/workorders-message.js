// Архивные выгрузки приходят в тот же чат, но не являются текущей сменой.
export function isPreparedWorkordersText(value) {
  return /АРХИВНЫЙ\s+ПЕРИОД/iu.test(String(value || "").replace(/[*_]/g, ""));
}

export function isPreparedWorkordersMessage(message) {
  return isPreparedWorkordersText(message?.body?.text || "");
}
