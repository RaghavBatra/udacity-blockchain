pragma solidity >=0.4.21 <0.6.0;

import "./ERC721Mintable.sol";

// TODO define a contract call to the zokrates generated solidity contract <Verifier> or <renamedVerifier>
import "./Verifier.sol";


// TODO define another contract named SolnSquareVerifier that inherits from your ERC721Mintable class
contract SolnSquareVerifier is ERC721Mintable {

  Verifier private verifierContract;

  constructor(address verifierAddress, string memory name, string memory symbol)
  ERC721Mintable(name, symbol) public {

    verifierContract = Verifier(verifierAddress);

  }

  // TODO define a solutions struct that can hold an index & an address
  struct Solution {
    uint256 _index;
    address _address;
    bool _exists;
    bool _isMinted;
  }

  // TODO define an array of the above struct
  Solution[] arraySolutions;

  // TODO define a mapping to store unique solutions submitted
  mapping (bytes32 => Solution) solutions;

  // TODO Create an event to emit when a solution is added
  event SolutionAdded(uint256 solutionIndex, address solutionAddress);

  // index for solutions
  uint numSolutions = 0;

  // TODO Create a function to add the solutions to the array and emit the event
  function addSolution(uint[2] memory a,uint[2][2] memory b,uint[2] memory c,uint[2] memory input)
  public {

      bytes32 solutionHash = keccak256(abi.encodePacked(input[0], input[1]));
      require(solutions[solutionHash]._exists == false, "Solution exists already");

      bool verified = verifierContract.verifyTx(a,b,c, input);
      require(verified, "Solution could not be verified");

      solutions[solutionHash] = Solution(numSolutions, msg.sender, true, false);

      emit SolutionAdded(numSolutions, msg.sender);

      numSolutions += 1;
  }


  // TODO Create a function to mint new NFT only after the solution has been verified
  //  - make sure the solution is unique (has not been used before)
  //  - make sure you handle metadata as well as tokenSupply
  function mintNewNFT(uint input1, uint input2, address to) public {

    bytes32 solutionHash = keccak256(abi.encodePacked(input1, input2));

    require(solutions[solutionHash]._exists, "Solution does not exist");
    require(solutions[solutionHash]._address == msg.sender, "Only solution address can use it to mint a token");
    require(!solutions[solutionHash]._isMinted, "Token already minted for this solution");

    // only mint after pre=conditions have been met
    mint(to, solutions[solutionHash]._index);

    solutions[solutionHash]._isMinted = true;
  }


}
