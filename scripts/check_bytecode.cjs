async function main() {
  const crypto = require("crypto");
  const [signer] = await ethers.getSigners();
  const code = await ethers.provider.getCode("0xc6dA458374D8323b8bD7e915a224E96757B8004b");
  console.log("Deployed bytecode hash:", crypto.createHash("md5").update(code).digest("hex"));
  console.log("Deployed bytecode length:", (code.length - 2) / 2, "bytes");

  // Also compare with local artifact
  const { readFileSync } = require("fs");
  const artifact = JSON.parse(readFileSync("artifacts/contracts/Groth16Verifier.sol/Groth16Verifier.json", "utf-8"));
  console.log("Local deployed bytecode hash:", crypto.createHash("md5").update(artifact.deployedBytecode).digest("hex"));
  console.log("Local deployed bytecode length:", (artifact.deployedBytecode.length - 2) / 2, "bytes");
  console.log("Bytecodes match:", code === artifact.deployedBytecode);
}

main().catch(console.error);
