const hre = require("hardhat");
const { readFileSync } = require("fs");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  
  const testArtifact = JSON.parse(
    readFileSync("artifacts/contracts/test/PrecompileTest.sol/PrecompileTest.json", "utf-8")
  );
  const factory = new hre.ethers.ContractFactory(testArtifact.abi, testArtifact.bytecode, signer);
  const test = await factory.deploy();
  await test.waitForDeployment();
  const addr = await test.getAddress();
  console.log("Test contract:", addr);

  // Test [c0,c1] encoding
  console.log("\n--- e(G1, G2) with [c0,c1] encoding ---");
  const r1 = await test.testC0C1();
  console.log("success:", r1[0], "result:", r1[1]);

  // Test [c1,c0] encoding
  console.log("\n--- e(G1, G2) with [c1,c0] encoding ---");
  const r2 = await test.testC1C0();
  console.log("success:", r2[0], "result:", r2[1]);

  // Identity check with [c0,c1]
  console.log("\n--- Identity e(G1,G2)*e(-G1,G2) with [c0,c1] ---");
  const r3 = await test.testIdentityC0C1();
  console.log("success:", r3[0], "result:", r3[1]);

  // Identity check with [c1,c0]
  console.log("\n--- Identity e(G1,G2)*e(-G1,G2) with [c1,c0] ---");
  const r4 = await test.testIdentityC1C0();
  console.log("success:", r4[0], "result:", r4[1]);
}

main().catch(console.error);
