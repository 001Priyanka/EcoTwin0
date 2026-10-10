import { createApp } from "./handlers/app.ts";

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  console.log(`EcoTwin API listening on http://localhost:${port}`);
});
