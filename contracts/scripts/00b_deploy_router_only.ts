// contracts/scripts/00b_deploy_router_only.ts
import fs from 'fs'
import path from 'path'
import { ethers, artifacts } from 'hardhat'

function pick(...vals: (string | undefined)[]) {
  return vals.find(v => typeof v === 'string' && v.startsWith('0x') && v.length === 42)
}

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deployer:', deployer.address)

  const depPath = path.join(__dirname, '..', 'deployments', 'intuition.json')
  const dep = fs.existsSync(depPath) ? JSON.parse(fs.readFileSync(depPath, 'utf8')) : {}

  const FACTORY =
    process.env.FACTORY ?? pick(dep.factory, dep.Factory, dep.uniswapV2Factory, dep.factoryAddress)
  const WETH =
    process.env.WETH ?? pick(dep.weth, dep.WETH, dep.WETH9, dep.weth9)

  if (!FACTORY || !WETH) {
    throw new Error('FACTORY/WETH manquants. export FACTORY=0x... ; export WETH=0x...')
  }
  console.log('Using FACTORY:', FACTORY)
  console.log('Using WETH   :', WETH)

  // --- Estimation taille & gas dépôt code
  const art = await artifacts.readArtifact('UniswapV2Router02')
  const deployedBytes = (art.deployedBytecode.length - 2) / 2 // octets
  console.log('Router deployed bytecode size ~', deployedBytes, 'bytes')

  // coût dépôt code ~ 200 gas / octet
  const deposit = BigInt(deployedBytes) * 200n

  // buffer exécution + marge
  const gasLimit = deposit + 1_500_000n  // ajuste si besoin
  console.log('Suggested gasLimit =', gasLimit.toString())

  const Router = await ethers.getContractFactory('UniswapV2Router02')
  const router = await Router.deploy(FACTORY, WETH, {
    gasLimit,
    gasPrice: 100_000_000n // 0.1 gwei (legacy, simple & OK sur ton réseau)
  })
  await router.waitForDeployment()
  const addr = await router.getAddress()
  console.log('Router02 deployed at:', addr)

  const code = await ethers.provider.getCode(addr)
  console.log('On-chain code bytes:', (code.length - 2) / 2)
  if (code === '0x') {
    throw new Error('Le contrat n’a pas de code (déploiement revert). Monte le gasLimit.')
  }

  console.log('router.factory() =', await router.factory())
  console.log('router.WETH()    =', await router.WETH())

  dep.router = addr
  fs.mkdirSync(path.dirname(depPath), { recursive: true })
  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2))
  console.log('Updated', depPath)
}

main().catch((e)=>{ console.error(e); process.exit(1) })
