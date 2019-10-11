// Test if an ERC721 token can be minted for contract - SolnSquareVerifier


// define a variable to import the SolnSquareVerifier & Verifier contracts
var SolnSquareVerifier = artifacts.require('SolnSquareVerifier');
var Verifier = artifacts.require("Verifier");

// Use the contents from proof.json generated from zokrates steps
var Proof = require('./proof.json');

// Test verification with incorrect proof

contract('SolnSquareVerifier', accounts => {

    const account_one = accounts[0];
    const account_two = accounts[1];
    const account_three = accounts[2];

    let name = "Udacious Tokens";
    let symbol = "UDT";

    let proof = Proof.proof;
    let a = proof.a;
    let b = proof.b;
    let c = proof.c;
    let inputs = Proof.inputs;

    it(`Test if a new solution can be added for contract AND
      if an ERC721 token can be minted for contract`, async function () {

      let verifier = await Verifier.new();
      this.contract = await SolnSquareVerifier.new(verifier.address, name, symbol);

      let canAddSolution = true;

      try {
        this.contract.addSolution(a, b, c, inputs, {from: account_one});
      }
      catch(e) {
        canAddSolution = false;
      }

      assert.equal(canAddSolution, true, "Solution cannot be added!");

      let canMintNewToken = true;

      try {
        this.contract.mintNewNFT(inputs[0], inputs[1], account_two, {from: account_one});
      }
      catch(e) {
        canMintNewToken = false;
      }

      assert.equal(canMintNewToken, true, "New token cannot be added!");


    });

})
