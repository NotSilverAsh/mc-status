process.on('uncaughtException', (err) => {
  console.error('uncaughtException:');
  console.error(err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:');
  console.error(reason);
  process.exit(1);
});

import { pingServers, getBedrockServer, getJavaServer } from '../dist/index.js';

const serversList = [
  { name: 'Java Demo', host: 'demo.mcstatus.io', port: 25565, type: 'java', timeout: 10000 },
  { name: 'Bedrock Demo', host: 'demo.mcstatus.io', port: 19132, type: 'bedrock', timeout: 10000 },
];

async function run() {
  try {
    const pingResult = await pingServers(serversList);
    const singlePingResult = await getJavaServer('demo.mcstatus.io', 25565, 10000);
    const bedrockPingResult = await getBedrockServer('demo.mcstatus.io', { port: 19132, timeout: 10000 });

    const results = {
      multiServerPing: pingResult,
      singleJavaPing: singlePingResult,
      singleBedrockPing: bedrockPingResult,
    };

    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }, null, 2));
    process.exit(1);
  }
}

run().then(() => process.exit(0)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
