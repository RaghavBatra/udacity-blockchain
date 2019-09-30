pragma solidity ^0.5.8;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "./FlightSuretyData.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Account used to deploy contract
    address private contractOwner;

    uint constant AIRLINE_REGISTRATION_FEE = 10 ether;
    uint constant INSURANCE_MULTIPLIER_NUM = 3;
    uint constant INSURANCE_MULTIPLIER_DEN = 2;

    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address payable public dataAddress;
    address payable public firstAirline;
    FlightSuretyData data;

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor (address payable _data, address payable _firstAirline) payable public
    {
        contractOwner = msg.sender;
        dataAddress = _data;
        data = FlightSuretyData(dataAddress);
        firstAirline = _firstAirline;

        data.registerAirline("Default", firstAirline);

        data.registerFlight(10, 1000, firstAirline);
        data.registerFlight(20, 2000, firstAirline);
        data.registerFlight(30, 3000, firstAirline);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational()
                            public
                            pure
                            returns(bool)
    {
        return true;  // Modify to call data contract's status
    }


    /********************************************************************************************/
    /*                                     SMART CONTRACT HELPER FUNCTIONS                      */
    /********************************************************************************************/

    function getFlightNumList(uint idx) view external returns (uint) {

      return data.flightNumList(idx);

    }

    function getFlightNumListLength() view external returns (uint) {

      return data.flightNumListLength();

    }

    function getNumToTime(uint num) view external returns (uint) {

      return data.getNumToTime(num);
    }


    /**
    * Debugging event
    *
    */
    event Debug(address airline, uint flightNum, uint256 timestamp, uint8 status);

    /**
    * @dev Deposit money to the smart contract
    *
    */
    function deposit(uint amount) public payable {
       require(msg.value == amount, "Amount not same");
       // nothing else to do!

     }

     /**
     * @dev Helper function to get insurance multiplier
     *
     */
     function getInsuranceMultiplierNum() pure external returns (uint) {

       return INSURANCE_MULTIPLIER_NUM;

     }

     /**
     * @dev Helper function to get insurance multiplier
     *
     */
     function getInsuranceMultiplierDen() pure external returns (uint) {

       return INSURANCE_MULTIPLIER_DEN;

     }

     /**
     * @dev Getter for flight status code
     *
     */
     function getFlightStatusCode(address airline, uint flightNum, uint flightTime)
     view external returns (uint8) {

       return data.getFlightStatusCode(airline, flightNum, flightTime);

     }

     /**
     * @dev Getter for oracle indexes
     *
     */
     function getMyIndexes
                             (
                             )
                             view
                             external
                             returns(uint8[3] memory)
     {
         require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

         return oracles[msg.sender].indexes;
     }

     /**
     * @dev Getter for oracle reg status
     *
     */
     function getMyRegStatus
                             (
                             )
                             view
                             external
                             returns(bool)
     {
         return oracles[msg.sender].isRegistered;
     }


     /**
     * @dev Getter for oracle response information
     *
     */
     function getResponseInfo(uint8 index,
                             address airline,
                             uint flightNum,
                             uint flightTime,
                             uint8 statusCode)
                             view public returns (uint) {

       bytes32 key = keccak256(abi.encodePacked(index, airline, flightNum, flightTime));
       return oracleResponses[key].responses[statusCode].length;

     }

     function getFlightKey
                         (
                             address airline,
                             uint flightNum,
                             uint flightTime
                         )
                         pure
                         internal
                         returns(bytes32)
     {
         return keccak256(abi.encodePacked(airline, flightNum, flightTime));
     }

     // Returns random number between 1 and 6
     function getRandomStatusCode
                             ( address payable account
                             )
                             external
                             returns (uint8)
     {
         uint8 maxValue = 6;

         // Pseudo random number...the incrementing nonce adds variation
         uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce), account))) % maxValue);

         nonce++;
         if (nonce > 250) {
             nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
         }

         // numerical status code
         uint8 randomCode = random * 10;

         return randomCode;
     }

     function numRegFlights() view public returns (uint) {
       return data.numRegFlights();
     }


    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  function registerAirline (string calldata _name, address payable _airline) external payable  {

    if (data.numRegAirlines() < 4) {
        data.registerAirline(_name, _airline);

      }
      else {

        // multi-party consensus
        bool canAddAirline = false;

        require(data.isAirline(msg.sender), "Caller is not an airline");

        // check for duplicates
        bool isDuplicate = false;
        uint callLength = data.getLength(_airline);

        for(uint c=0; c < callLength; c++) {
            if (data.multiCalls(_airline, c) == msg.sender) {
                isDuplicate = true;
                break;
            }
        }

        require(!isDuplicate, "Caller has already called this function.");
        data.pushValue(_airline, msg.sender);

        // consensus
        uint majority = data.numRegAirlines() / 2;

        if (callLength + 1 >= majority) {
          canAddAirline = true;
          data.refreshArray(_airline);
        }

        if (canAddAirline) {
          data.registerAirline(_name, _airline);
        }

      }
    }

      /**
      * @dev Fund an already registered airlinr
      *
      */
      function fund() public payable {

        // make sure enough ether
        require (msg.value >= AIRLINE_REGISTRATION_FEE, "Not enough ether to deposit");

        // transfer money from caller of function to THIS contract
        deposit(msg.value);

        // transfer money from THIS contract to DATA contract
        require(address(this).balance >= AIRLINE_REGISTRATION_FEE, "do not have enough to pay");

        data.fund.value(msg.value)();

        // check transfer did take place
        require(dataAddress.balance >= AIRLINE_REGISTRATION_FEE, "received ether");

      }

   /**
    * @dev Register a future flight for insuring.
    *
    */
    function registerFlight (uint _flightNum, uint _flightTime, address payable _address) public {

      // only funded airlines can register flights
      require(data.isAirline(_address), "Caller is not funded airline" );

      data.registerFlight(_flightNum, _flightTime, _address);

    }


    /**
     * @dev Buy insurance for a flight.
     * CALLED BY PASSENGER
     */
    function buyInsurance(address payable _airline, uint _flightNum, uint _flightTime) public payable {

      require(msg.value > 0 ether, "No insurance fee given!");
      require(msg.value <= 1 ether, "Cannot insure for more than 1 ether!");

      // send money from passenger to THIS contract
      deposit(msg.value);

      // send money from THIS contract to DATA contract
      data.buyInsurance.value(msg.value)(_airline, _flightNum, _flightTime);

    }

    function creditInsurees(address payable _airline, uint _flightNum,
       uint _flightTime, uint statusCode) public {

      if (statusCode == STATUS_CODE_LATE_AIRLINE) {
        data.creditInsurees(_airline, _flightNum, _flightTime, INSURANCE_MULTIPLIER_NUM, INSURANCE_MULTIPLIER_DEN);
      }

    }

    /**
     * @dev Credit insured passenger in internal account.
     *
     */
    function insureePayout(address payable _airline, uint _flightNum, uint _flightTime) public {

      data.insureePayout(_airline, _flightNum, _flightTime);

    }

   /**
    * @dev Called after oracle has updated flight status
    *
    */
    function processFlightStatus
                                (   uint8 index,
                                    address payable airline,
                                    uint flightNum,
                                    uint256 flightTime,
                                    uint8 statusCode
                                )
                                internal
    {

      bytes32 key = keccak256(abi.encodePacked(index, airline, flightNum, flightTime));

      // close registration for this flight
      oracleResponses[key].isOpen = false;

      // change flight details
      data.setFlightStatusCode(airline, flightNum, flightTime, statusCode);

      // // check statusCode and insure if necessary
      // creditInsurees(airline, flightNum, flightTime, statusCode);
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            uint flightNum,
                            uint flightTime
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flightNum, flightTime));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flightNum, flightTime);
    }




// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant ORACLE_REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    uint private numOracles = 25;

    function getNumOracles() view external returns (uint) {
      return numOracles;
    }


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted.
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flightNum, flightTime)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, uint flightNum, uint256 timestamp, uint8 status);

    event OracleReport(address airline, uint flightNum, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, uint flightNum, uint256 timestamp);

    // Register an oracle with the contract
    function registerOracle () external payable {

        // Require registration fee
        require(msg.value >= ORACLE_REGISTRATION_FEE, "Registration fee is required");

        // transfer money from caller of function to THIS contract
        deposit(msg.value);

        // transfer money from THIS contract to DATA contract
        data.fundThisContract.value(msg.value)();

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function refreshStatusCodeArray(bytes32 key, uint8 statusCode) private {

      oracleResponses[key].responses[statusCode] = new address[](0);
    }

    // Called by oracle when a response is available to an outstanding request.
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address payable airline,
                            uint flightNum,
                            uint flightTime,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flightNum, flightTime));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flightNum, flightTime, statusCode);

        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            // refreshStatusCodeArray(key, statusCode);

            emit FlightStatusInfo(airline, flightNum, flightTime, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(index, airline, flightNum, flightTime, statusCode);
        }
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (
                                address account
                            )
                            internal
                            returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns random number between 1 and 10
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

  function() external payable {
    fund();
  }

}
