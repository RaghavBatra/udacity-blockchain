// define a variable to import the <Verifier> or <renamedVerifier> solidity contract generated by Zokrates
var Verifier = artifacts.require('Verifier');

// Test verification with correct proof
// - use the contents from proof.json generated from zokrates steps
var Proof = require('./proof.json');

// Test verification with incorrect proof

contract('Verifier', accounts => {

    it(`proof works`, async function () {

      this.contract = await Verifier.new();

      let proof = Proof.proof;
      let a = proof.a;
      let b = proof.b;
      let c = proof.c;
      let inputs = Proof.inputs;

      ans = await this.contract.verifyTx.call(a, b, c, inputs);

      assert.equal(ans, true, "Incorrect proof!");

    });

    it(`proof does not work`, async function () {

      this.contract = await Verifier.new();

      let proof = Proof.proof;
      let a = proof.a;
      let b = proof.b;
      let c = proof.c;
      let inputs = Proof.inputs;

      // change correct input to faulty one
      inputs[1] = "0x0000000000000000000000000000000000000000000000000000000000000000";

      ans = await this.contract.verifyTx.call(a, b, c, inputs);

      assert.equal(ans, false, "Correct proof!");
  });

})
