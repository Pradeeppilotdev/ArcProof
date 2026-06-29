const { readFileSync, writeFileSync } = require("fs");

const input = {
  rawOutput: ["345232271731", "0", "0", "0"],
  salt: "23450803646439627281031111450845287153059314797733957615238247202543",
  taskId: "0",
  outputHash: "12825664370457269612510466292625418941673343125039522539221063718704411188280",
  agentAddr: "1441416616225016464436167344136982754343859557053",
};

writeFileSync("/tmp/circuit_input.json", JSON.stringify(input, null, 2));
console.log("Input written to /tmp/circuit_input.json");
