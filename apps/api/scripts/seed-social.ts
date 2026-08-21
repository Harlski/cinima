import { migrate } from "../src/db/migrate.js";
import { seedDemoSocialGraph } from "../src/services/demoSocial.js";

async function main() {
  await migrate();
  await seedDemoSocialGraph();
  console.log("seeded");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
