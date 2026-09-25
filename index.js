process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

console.log(
  new Date().toISOString(),
  "Timeweb bootstrap starting",
  {
    node: process.version,
    port: process.env.PORT || null,
    nodeEnv: process.env.NODE_ENV || null
  }
);

await import("./server.js");
