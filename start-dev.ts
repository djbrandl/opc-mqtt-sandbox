import net from 'net';
import { spawn } from 'child_process';

const PREFERRED_PORT = 3005;
const MAX_ATTEMPTS = 20;

function isPortFree(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.once('error', () => resolve(false));
		server.once('listening', () => {
			server.close(() => resolve(true));
		});
		server.listen(port);
	});
}

async function findFreePort(start: number): Promise<number> {
	for (let port = start; port < start + MAX_ATTEMPTS; port++) {
		if (await isPortFree(port)) return port;
	}
	throw new Error(`No free port found in range ${start}-${start + MAX_ATTEMPTS - 1}`);
}

async function main() {
	const apiPort = await findFreePort(PREFERRED_PORT);

	console.log('============================================');
	console.log('  OPC UA / MQTT Test Harness');
	console.log('============================================');
	console.log();
	console.log(`  Express API:    http://localhost:${apiPort}`);
	console.log('  Vite Frontend:  http://localhost:9433');
	console.log('  OPC UA Server:  opc.tcp://localhost:4840  (start from Dashboard)');
	console.log('  MQTT Broker:    tcp://localhost:1883       (start from Dashboard)');
	console.log();
	console.log('  Open http://localhost:9433 in your browser.');
	console.log('  Press Ctrl+C to stop.');
	console.log('============================================');
	console.log();

	const env = { ...process.env, API_PORT: String(apiPort) };

	const child = spawn(
		'npx concurrently -n vite,server -c cyan,yellow "npx vite" "npx tsx watch server/index.ts"',
		[],
		{ env, stdio: 'inherit', shell: true },
	);

	child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
