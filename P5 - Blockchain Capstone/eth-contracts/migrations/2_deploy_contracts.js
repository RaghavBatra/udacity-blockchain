// migrating the appropriate contracts
var Verifier = artifacts.require("./Verifier.sol");
var SolnSquareVerifier = artifacts.require("./SolnSquareVerifier.sol");

module.exports = function(deployer) {
  deployer.deploy(Verifier).then(function() {
      return deployer.deploy(SolnSquareVerifier, Verifier.address, "Udacious Token", "UDT");
    });
};
