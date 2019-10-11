var ERC721Mintable = artifacts.require('ERC721Mintable');

contract('TestERC721Mintable', accounts => {

    const account_one = accounts[0];
    const account_two = accounts[1];
    const account_three = accounts[2];
    var NUM_TOKENS = 10;

    describe('match erc721 spec', function () {
        beforeEach(async function () {

            this.contract = await ERC721Mintable.new("Udacious Tokens", "UDT", {from: account_one});

            // TODO: mint multiple tokens
            for (var i = 0; i < NUM_TOKENS; i++) {

              this.contract.mint(account_two, i, {from: account_one});
            }

        })

        it('should return total supply', async function () {

          assert.equal(await this.contract.totalSupply(), NUM_TOKENS, "Incorrect number of tokens in supply");

        })

        it('should get token balance', async function () {

          assert.equal(await this.contract.balanceOf(account_two), NUM_TOKENS, "Incorrect number of tokens in balance");

        })

        // token uri should be complete i.e: https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/1
        it('should return token uri', async function () {
          assert.equal(await this.contract.tokenURI(NUM_TOKENS - 1), "https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/" + (NUM_TOKENS - 1));

        })

        it('should transfer token from one owner to another', async function () {

          await this.contract.transferFrom(account_two, account_three, 0, {from: account_two});

          assert.equal(await this.contract.balanceOf(account_two), NUM_TOKENS - 1, "Incorrect number of tokens in balance");
          assert.equal(await this.contract.balanceOf(account_three), 1, "Incorrect number of tokens in balance");
        })
    });

    describe('have ownership properties', function () {
        beforeEach(async function () {
            this.contract = await ERC721Mintable.new("Udacious Tokens", "UDT", {from: account_one});
        })

        it('should fail when minting when address is not contract owner', async function () {

          let incorrectOwner = false;

          try
          {
            await this.contract.mint(account_three, 20, {from: account_two});
          }
          catch (e) {
            incorrectOwner = true;
          }

          assert.equal(incorrectOwner, true, "This account should not have owner privileges");


        })

        it('should return contract owner', async function () {

          assert.equal(await this.contract.getOwner(), account_one);

        })

    });
})
