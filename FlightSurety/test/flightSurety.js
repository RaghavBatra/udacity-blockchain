var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    beforeEach('setup contract', async () => {
        config = await Test.Config(accounts);
        // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

      it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

      });

      it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

          // Ensure that access is denied for non-Contract Owner account
          let accessDenied = false;
          try
          {
              await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
          }
          catch(e) {
              accessDenied = true;
          }
          assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

      });

      it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

          // Ensure that access is allowed for Contract Owner account
          let accessDenied = false;
          try
          {
              await config.flightSuretyData.setOperatingStatus(false);
          }
          catch(e) {
              accessDenied = true;
          }
          assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

      });

      it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

          await config.flightSuretyData.setOperatingStatus(false);

          let reverted = false;
          try
          {
              await config.flightSurety.setTestingMode(true);
          }
          catch(e) {
              reverted = true;
          }
          assert.equal(reverted, true, "Access not blocked for requireIsOperational");

          // Set it back for other tests to work
          await config.flightSuretyData.setOperatingStatus(true);

      });

      it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

        // ARRANGE
        let newAirline = accounts[2];

        // ACT
        try {
            await config.flightSuretyData.registerAirline("New Airline", newAirline, {from: config.firstAirline});
        }
        catch(e) {

        }
        let result = await config.flightSuretyData.isAirline.call(newAirline);

        // ASSERT
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

      });

      it('Funded airline can register another airline', async () => {

        // ARRANGE
        await config.flightSuretyData.fund({from: config.firstAirline});

        // ASSERT
        let isFunded = await config.flightSuretyData.isAirline.call(config.firstAirline);
        assert.equal(isFunded, true, "Airline is funded");

        let newAirline = accounts[2];
        await config.flightSuretyApp.registerAirline("New Airline", newAirline, {from: config.firstAirline});

        let isRegistered = await config.flightSuretyData.isRegisteredAirline(newAirline);
        assert.equal(isRegistered, true, "Airline was registered");

      });

      it(`registerAirline(): fewer than 4 - successful addition`, async function () {

      let oldContractBalance = await config.flightSuretyData.getBalance();

      await config.flightSuretyData.fund ({from: config.firstAirline, value: web3.utils.toWei("10", "ether")});

      let newContractBalance = await config.flightSuretyData.getBalance();

      let isRegistered = await config.flightSuretyData.isAirline.call(config.firstAirline);

      // 10 ether was added to contract balance
      assert.equal(newContractBalance - oldContractBalance, web3.utils.toWei("10", "ether"));

      // account was registered successfully
      assert.equal(isRegistered, true, "Airline is not in registry");

    });

    it(`registerAirline(): fewer than 4 - inadequate amount of ether`, async function () {

      notEnoughEther = false;
      await config.flightSuretyData.fund({from: config.firstAirline});

      try
      {
        await config.flightSuretyApp.registerAirline ("New Airline", accounts[2], {from: config.firstAirline})
        await config.flightSuretyApp.fund ({from: accounts[2], value: web3.utils.toWei("8", "ether")});

      }
      catch(e) {
        notEnoughEther = true;
      }

      assert.equal(notEnoughEther, true, "Access not restricted to Contract Owner");
    });

    it(`registerAirline(): fewer than 4 - non owner`, async function () {

          notOwner = false;

          try
          {
            await config.flightSuretyData.registerAirline (accounts[2], {from: accounts[1]});
          }
          catch(e) {
            notOwner = true;
          }
          assert.equal(notOwner, true, "Access not restricted to Contract Owner");

    });

    it(`registerAirline(): more than 4 - non airline caller`, async function () {

      notOwner = false;
      await config.flightSuretyData.fund({from: config.firstAirline});

      try
      {
        // register a total of 1 + 3 = 4 airlines
        await config.flightSuretyApp.registerAirline ("British Airways", accounts[2], {from: config.firstAirline});
        await config.flightSuretyApp.fund ({from: accounts[2], value: web3.utils.toWei("10", "ether")});

        await config.flightSuretyApp.registerAirline ("Air India", accounts[3], {from: config.firstAirline});
        await config.flightSuretyApp.fund ({from: accounts[3], value: web3.utils.toWei("10", "ether")});

        await config.flightSuretyApp.registerAirline ("Cathay Pacific", accounts[4], {from: config.firstAirline});
        await config.flightSuretyApp.fund ({from: accounts[4], value: web3.utils.toWei("10", "ether")});

        // register 5th airline through non-airline user
        await config.flightSuretyApp.registerAirline ("United", accounts[5], {from: accounts[6]});
      }
      catch(e) {
        notOwner = true;
      }

      assert.equal(notOwner, true, "Access not restricted to Contract Owner");
    });

    it(`registerAirline(): more than 4 - duplicate caller`, async function () {

      isDuplicate = false;
      await config.flightSuretyData.fund({from: config.firstAirline});

      try
      {
        // register a total of 1 + 3 = 4 airlines
        await config.flightSuretyApp.registerAirline ("British Airways", accounts[2], {from: config.firstAirline});
        await config.flightSuretyApp.fund ({from: accounts[2], value: web3.utils.toWei("10", "ether")});

        await config.flightSuretyApp.registerAirline ("Air India", accounts[3], {from: config.firstAirline});
        await config.flightSuretyApp.fund ({from: accounts[3], value: web3.utils.toWei("10", "ether")});

        await config.flightSuretyApp.registerAirline ("Cathay Pacific", accounts[4], {from: config.firstAirline});
        await config.flightSuretyApp.fund ({from: accounts[4], value: web3.utils.toWei("10", "ether")});

        // register 5th airline
        await config.flightSuretyApp.registerAirline ("United", accounts[5], {from: accounts[6]});

        // register AGAIN!
        await config.flightSuretyApp.registerAirline ("United", accounts[5], {from: config.owner});


      }
      catch(e) {
        isDuplicate = true;
      }

      assert.equal(isDuplicate, true, "Duplicate entry!");
    });

    it(`registerAirline(): more than 4 - multiparty consensus succeeds`, async function () {

      await config.flightSuretyData.fund({from: config.firstAirline});

      // register a total of 1 + 3 = 4 airlines
      await config.flightSuretyApp.registerAirline ("British Airways", accounts[2], {from: config.firstAirline});
      await config.flightSuretyApp.fund({from: accounts[2], value: web3.utils.toWei("10", "ether")});

      await config.flightSuretyApp.registerAirline ("Air India", accounts[3], {from: config.firstAirline});
      await config.flightSuretyApp.fund ({from: accounts[3], value: web3.utils.toWei("10", "ether")});

      await config.flightSuretyApp.registerAirline ("Cathay Pacific", accounts[4], {from: config.firstAirline});
      await config.flightSuretyApp.fund ({from: accounts[4], value: web3.utils.toWei("10", "ether")});

      // register 5th airline
      await config.flightSuretyApp.registerAirline ("United", accounts[5], {from: accounts[3]});
      await config.flightSuretyApp.registerAirline ("United", accounts[5], {from: accounts[2]});

      assert.equal(await config.flightSuretyData.isRegisteredAirline(accounts[5]), true, "Airline not added");

    });

    it(`registerAirline(): more than 4 - multiparty consensus fails`, async function () {

      await config.flightSuretyData.fund({from: config.firstAirline});

      // register a total of 1 + 3 = 4 airlines
      await config.flightSuretyApp.registerAirline ("British Airways", accounts[2], {from: config.firstAirline});
      await config.flightSuretyApp.fund({from: accounts[2], value: web3.utils.toWei("10", "ether")});

      await config.flightSuretyApp.registerAirline ("Air India", accounts[3], {from: config.firstAirline});
      await config.flightSuretyApp.fund ({from: accounts[3], value: web3.utils.toWei("10", "ether")});

      await config.flightSuretyApp.registerAirline ("Cathay Pacific", accounts[4], {from: config.firstAirline});
      await config.flightSuretyApp.fund ({from: accounts[4], value: web3.utils.toWei("10", "ether")});

      // register 5th airline
      await config.flightSuretyApp.registerAirline ("United", accounts[5], {from: accounts[3]});

      assert.equal(await config.flightSuretyData.isRegisteredAirline(accounts[5]), false, "Airline added");

    });

    it(`registerAirline(): more than 4 - multiparty consensus fails SUBTLE`, async function () {

      await config.flightSuretyData.fund({from: config.firstAirline});

      // register a total of 1 + 3 = 4 airlines
      await config.flightSuretyApp.registerAirline ("British Airways", accounts[2], {from: config.firstAirline});
      await config.flightSuretyApp.fund({from: accounts[2], value: web3.utils.toWei("10", "ether")});

      await config.flightSuretyApp.registerAirline ("Air India", accounts[3], {from: config.firstAirline});
      await config.flightSuretyApp.fund ({from: accounts[3], value: web3.utils.toWei("10", "ether")});

      await config.flightSuretyApp.registerAirline ("Cathay Pacific", accounts[4], {from: config.firstAirline});
      await config.flightSuretyApp.fund ({from: accounts[4], value: web3.utils.toWei("10", "ether")});

      // register 5th airline
      await config.flightSuretyApp.registerAirline ("United", accounts[5], {from: accounts[3]});
      await config.flightSuretyApp.registerAirline ("United", accounts[6], {from: accounts[2]});

      // wrt the code snippet in lecture, there is a subtlety in adding a new airline
      // via multi-party call. According to the code, there is no regard to maintaining a
      // ***distinct*** mapping for the registeration for each new airline. Previously, any
      // airline could be added if there were majority voters, where it should only be registered
      // if there were majority voters for THAT SPECIFIC airline

      assert.equal(await config.flightSuretyData.isAirline.call(accounts[5]), false, "Airline added");

    });

    it(`registerFlight(): check flight gets registered`, async function () {

      await config.flightSuretyData.fund({from: config.firstAirline});

      await config.flightSuretyApp.registerFlight (10, 1000, config.firstAirline);

      assert.equal(await config.flightSuretyData.isRegisteredFlight.call(config.firstAirline, 10, 1000), true, "Airline not added");

    });

    it(`registerFlight(): unfunded airline cannot register flight`, async function () {

      try {

        await config.flightSuretyApp.registerFlight (10, 1000, config.firstAirline);

      }
      catch (e) {

        assert.equal(await config.flightSuretyData.isRegisteredFlight
          .call(config.firstAirline, 10, 1000), false, "Airline added");

      }



    });

    it(`buyInsurance(): paying too much insurance`, async function () {

      let flightNum = 1;
      let flightTime = 1200;

      let amount = web3.utils.toWei("5", "ether");

      await config.flightSuretyData.fund({from: config.firstAirline});
      await config.flightSuretyApp.registerFlight(1, 1200, config.firstAirline);

      let passenger = accounts[2];

      let notFlight = false;

      try {

        await config.flightSuretyApp.buyInsurance(config.firstAirline, 2, 1500,
          {from: passenger, value: amount});

      }

      catch(e) {
          notFlight = true;
      }

      assert.equal(notFlight, true);

    });
    it(`buyInsurance(): paying insurance for non-flight`, async function () {

      let flightNum = 1;
      let flightTime = 1200;

      let amount = web3.utils.toWei("1", "ether");

      await config.flightSuretyData.fund({from: config.firstAirline});
      await config.flightSuretyApp.registerFlight(1, 1200, config.firstAirline);

      let passenger = accounts[2];

      let notFlight = false;

      try {

        await config.flightSuretyApp.buyInsurance(config.firstAirline, 2, 1500,
          {from: passenger, value: amount});

      }

      catch(e) {
          notFlight = true;
      }

      assert.equal(notFlight, true);

    });

    it(`buyInsurance(): insure flight`, async function () {

      await config.flightSuretyData.fund({from: config.firstAirline});

      let flightNum = 1;
      let flightTime = 1200;

      await config.flightSuretyApp.registerFlight(flightNum, flightTime, config.firstAirline);

      let passenger = accounts[2];
      let amount = web3.utils.toWei("1", "ether");
      amount = web3.utils.toBN(amount);

      let oldContractBalance = await config.flightSuretyData.getBalance();
      oldContractBalance = web3.utils.toBN(oldContractBalance);
      let oldPassengerBalance = await web3.eth.getBalance(passenger);
      oldPassengerBalance = web3.utils.toBN(oldPassengerBalance);

      let receipt = await config.flightSuretyApp.buyInsurance(config.firstAirline, flightNum, flightTime,
        {from: passenger, value: amount});

      // Obtain gas used from the receipt
      let gasUsed = receipt.receipt.gasUsed;
      gasUsed = web3.utils.toBN(gasUsed);
      // console.log(`GasUsed: ${receipt.receipt.gasUsed}`);

      // Obtain gasPrice from the transaction
      let tx = await web3.eth.getTransaction(receipt.tx);
      let gasPrice = tx.gasPrice;
      gasPrice = web3.utils.toBN(gasPrice)
      // console.log(`GasPrice: ${tx.gasPrice}`);

      // Obtain total ether used
      let gasCost = gasUsed.mul(gasPrice);
      // console.log(`GasCost: ${gasCost}`);

      let totalEther = amount.add(gasCost);

      let newContractBalance = await config.flightSuretyData.getBalance();
      newContractBalance = web3.utils.toBN(newContractBalance);
      let newPassengerBalance = await web3.eth.getBalance(passenger);
      newPassengerBalance = web3.utils.toBN(newPassengerBalance);

      let insureesBalance = await config.flightSuretyData.getInsureesBalance(
        config.firstAirline, flightNum, flightTime, passenger);
      insureesBalance = web3.utils.toBN(insureesBalance);

      // 1 ether was credited to contract balance and debited from passenger balance
      assert.equal(newContractBalance.sub(oldContractBalance).toString(), amount.toString(), "incorrect contract balance");

      // check wither in range
      assert.equal(totalEther.toString(), oldPassengerBalance.sub(newPassengerBalance).toString()," incorrect passenger balance");

      // check data structure storage
      assert.equal(insureesBalance.toString(), amount.toString(), "incorrect storage")
    });

    it(`creditInsurees(): check multiplier amount credited in internal account`, async function () {

      await config.flightSuretyData.fund({from: config.firstAirline});

      let flightNum = 1;
      let flightTime = 1200;

      await config.flightSuretyApp.registerFlight(flightNum, flightTime, config.firstAirline);

      let passenger = accounts[2];
      let amount = web3.utils.toWei("1", "ether");
      amount = web3.utils.toBN(amount);

      await config.flightSuretyApp.buyInsurance(config.firstAirline, flightNum, flightTime,
        {from: passenger, value: amount});

      let insureesBalance = await config.flightSuretyData.getInsureesBalance(
        config.firstAirline, flightNum, flightTime, passenger);

      insureesBalance = web3.utils.toBN(insureesBalance);

      // correct status code => credit insurance
      let statusCode = 20;

      await config.flightSuretyApp.creditInsurees(config.firstAirline, flightNum, flightTime, statusCode, {from: passenger});

      let actualInsurancePayout = await config.flightSuretyData.getInsurancePayout(config.firstAirline,
        flightNum, flightTime, {from: passenger});

      actualInsurancePayout =  web3.utils.toBN(actualInsurancePayout);

      let expectedInsurancePayout = insureesBalance.mul(await config.flightSuretyApp.getInsuranceMultiplierNum())
      .div(await config.flightSuretyApp.getInsuranceMultiplierDen());

      expectedInsurancePayout = web3.utils.toBN(expectedInsurancePayout);

      assert.equal(actualInsurancePayout.toString(), expectedInsurancePayout.toString(), "insurance payouts not the same");

    });

    it(`creditInsurees(): incorrect status code`, async function () {

      await config.flightSuretyData.fund({from: config.firstAirline});

      let flightNum = 1;
      let flightTime = 1200;

      await config.flightSuretyApp.registerFlight(flightNum, flightTime, config.firstAirline);

      let passenger = accounts[2];
      let amount = web3.utils.toWei("1", "ether");
      amount = web3.utils.toBN(amount);

      await config.flightSuretyApp.buyInsurance(config.firstAirline, flightNum, flightTime,
        {from: passenger, value: amount});

      let insureesBalance = await config.flightSuretyData.getInsureesBalance(
        config.firstAirline, flightNum, flightTime, passenger);

      insureesBalance = web3.utils.toBN(insureesBalance);

      // incorrect status code
      let statusCode = 30;

      await config.flightSuretyApp.creditInsurees(config.firstAirline, flightNum, flightTime, statusCode, {from: passenger});

      let actualInsurancePayout = await config.flightSuretyData.getInsurancePayout(config.firstAirline,
        flightNum, flightTime, {from: passenger});

      actualInsurancePayout =  web3.utils.toBN(actualInsurancePayout);

      let expectedInsurancePayout = web3.utils.toBN(0);

      expectedInsurancePayout = web3.utils.toBN(expectedInsurancePayout);

      assert.equal(actualInsurancePayout.toString(), expectedInsurancePayout.toString(), "insurance payouts not the same");

    });

    it(`insureePayout(): check passenger account is credited with insurance amount`, async function () {

      await config.flightSuretyApp.fund({from: config.firstAirline,
        value: web3.utils.toWei("10", "ether")});

      let flightNum = 1;
      let flightTime = 1200;

      await config.flightSuretyApp.registerFlight(flightNum, flightTime,
        config.firstAirline);

      let passenger = accounts[2];
      let amount = web3.utils.toWei("1", "ether");
      amount = web3.utils.toBN(amount);

      await config.flightSuretyApp.buyInsurance(config.firstAirline, flightNum, flightTime,
        {from: passenger, value: amount});

      let oldContractBalance = await config.flightSuretyData.getBalance();
      oldContractBalance = web3.utils.toBN(oldContractBalance)
      let oldPassengerBalance = await web3.eth.getBalance(passenger);
      oldPassengerBalance = web3.utils.toBN(oldPassengerBalance)

      let insureesBalance = await config.flightSuretyData.getInsureesBalance(
        config.firstAirline, flightNum, flightTime, passenger);
      insureesBalance = web3.utils.toBN(insureesBalance);

      // correct status code
      let statusCode = 20;

      await config.flightSuretyApp.creditInsurees(config.firstAirline, flightNum, flightTime, statusCode, {from: passenger});
      await config.flightSuretyApp.insureePayout(config.firstAirline, flightNum, flightTime, {from: passenger});

      let actualInsurancePayout = await config.flightSuretyData.getInsurancePayout(config.firstAirline,
        flightNum, flightTime, {from: passenger});

      actualInsurancePayout =  web3.utils.toBN(actualInsurancePayout);

      let newContractBalance = await config.flightSuretyData.getBalance();
      newContractBalance = web3.utils.toBN(newContractBalance);
      let newPassengerBalance = await web3.eth.getBalance(passenger);
      newPassengerBalance = web3.utils.toBN(newPassengerBalance);

      // 1 ether was credited to contract balance and debited from passenger balance
      assert.equal(oldContractBalance.sub(newContractBalance).toString(), actualInsurancePayout.toString(), "incorrect contract balance");

      // gasCost estimate
      let gasCost = web3.utils.toBN(web3.utils.toWei("2", "ether")/1000)

      let changePassengerBalance = newPassengerBalance.sub(oldPassengerBalance);
      let diffBalance = actualInsurancePayout.sub(changePassengerBalance);

      assert.equal(diffBalance < gasCost, true, " incorrect passenger balance");

    });

});
