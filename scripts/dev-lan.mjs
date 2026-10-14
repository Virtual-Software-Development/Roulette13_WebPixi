#!/usr/bin/env node
// TEMPORAL -- `npm run dev:lan`: lo mismo que `npm run dev:all`, pero los servidores de Vite escuchan
// en la red (DEV_LAN=1, ver vite.config.ts) para que otras máquinas entren por la IP de esta y vean
// la misma página. Ellas son solo espectadoras (sin MQTT propio, ver src/lanPreview.ts); /api, los
// videos y el resto pasan por el Vite de esta máquina, así que no necesitan llegar al backend.
//
// Windows Firewall: la primera vez que Node escucha en la red, Windows pregunta si se permite el
// acceso -- hay que aceptar para la red "Privada". Si no aparece o se rechazó, crear la regla desde
// una consola de administrador (se imprime abajo).

import os from 'node:os'
import { spawn } from 'node:child_process'
import { REPO_ROOT, APP_PORT, GAME_PORT, BETTING_PORT } from './lib/devEnv.mjs'

const VIRTUAL_ADAPTER = /virtual|vmware|vbox|hyper-v|vethernet|docker|wsl|loopback|bluetooth|tap|tun|zerotier|tailscale|npcap/i

const ips = Object.entries(os.networkInterfaces())
  .filter(([name]) => !VIRTUAL_ADAPTER.test(name))
  .flatMap(([name, addresses]) =>
    (addresses ?? [])
      .filter((a) => a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'))
      .map((a) => ({ name, address: a.address })),
  )

const line = '-'.repeat(72)
console.log(`\n${line}\n[dev:lan] Otras máquinas de la red pueden entrar a:`)
if (ips.length === 0) console.log('  (no se encontró ninguna IPv4 de red -- ¿está conectada la máquina?)')
for (const { name, address } of ips) {
  console.log(`  ${name.padEnd(10)} lobby    http://${address}:${GAME_PORT}/`)
  console.log(`  ${''.padEnd(10)} betting  http://${address}:${BETTING_PORT}/`)
  console.log(`  ${''.padEnd(10)} admin    http://${address}:${APP_PORT}/`)
}
console.log(
  `\n[dev:lan] Si no conectan, permitir los puertos en el firewall (PowerShell como administrador):\n` +
    `  New-NetFirewallRule -DisplayName "Roulette13 dev LAN" -Direction Inbound -Protocol TCP ` +
    `-LocalPort ${GAME_PORT},${BETTING_PORT},${APP_PORT} -Action Allow -Profile Private\n` +
    `[dev:lan] Para quitarla después:  Remove-NetFirewallRule -DisplayName "Roulette13 dev LAN"\n${line}\n`,
)

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const child = spawn(npm, ['run', 'dev:all'], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DEV_LAN: '1' },
})
child.on('exit', (code) => process.exit(code ?? 1))
