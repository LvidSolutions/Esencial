const { startStaticServer } = require("./recovery-utils");

const port = Number(process.env.PORT || 3000);
startStaticServer(port).then(() => {
  console.log(`Serving public/ at http://127.0.0.1:${port}/`);
});
