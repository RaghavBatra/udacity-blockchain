pragma solidity ^0.5.8;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    struct Airline {
        string name;
        address payable airlineAddress;
        bool isRegistered;
        bool isFunded;
    }

    mapping(address => Airline) public airlineDB;

    mapping(address => bool) public isAirline;

    uint public numRegAirlines;

    // Mapping to store calls for multiparty assertions
    // Takes an airline and stores all other airlines that want it to be registered
    mapping(address => address[]) public multiCalls;

    struct Flight {
        uint flightNum;
        bool isRegistered;
        uint8 statusCode;
        uint flightTime;
        mapping(address => uint) insurees;
        mapping(address => uint) insureesPayout;
        address payable airline;
    }

    mapping(bytes32 => Flight) public flightDB;
    mapping(bytes32 => bool) public isFlight;

    uint public numRegFlights;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                )
                                public payable
    {
        contractOwner = msg.sender;
    }

    event Debug2(address airline, uint flightNum, uint256 timestamp, uint8 status);


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
        require(operational, "Contract is currently not operational");
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
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
                            public
                            view
                            returns(bool)
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
                            (
                                bool mode
                            )
                            external
                            requireContractOwner
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT GETTERS                               */
    /********************************************************************************************/

    function isRegisteredAirline (address payable _address) external view returns (bool) {

      return airlineDB[_address].isRegistered;

    }

    function isFundedAirline (address payable _address) external view returns (bool) {

      return airlineDB[_address].isFunded;

    }

    function isRegisteredFlight (address payable _airline, uint _flightNum, uint _flightTime)
    external view returns (bool) {

      bytes32 flightKey = getFlightKey(_airline, _flightNum, _flightTime);

      return flightDB[flightKey].isRegistered;

    }



     // Get balance of contract
     function getBalance() public view returns (uint) {
       return address(this).balance;

     }

     function getLength(address _airline) public view returns (uint){
       return multiCalls[_airline].length;
     }

     function pushValue(address _airline, address _account) public {
       multiCalls[_airline].push(_account);
     }

     function refreshArray(address _airline) public {
       multiCalls[_airline] = new address[](0);
     }


     function getInsureesBalance(address payable _airline, uint _flightNum, uint _flightTime,
       address payable _passenger) view external returns (uint) {

         bytes32 flightKey = getFlightKey(_airline, _flightNum, _flightTime);
         return flightDB[flightKey].insurees[_passenger];

     }

     function getInsurancePayout(address payable _airline, uint _flightNum,
       uint _flightTime) view external returns (uint) {

         bytes32 flightKey = getFlightKey(_airline, _flightNum, _flightTime);

         // make sure this is a valid flight!
         require (isFlight[flightKey], "Not a valid flight");

         return flightDB[flightKey].insureesPayout[tx.origin];
     }

     function getFlightStatusCode(address airline, uint flightNum, uint flightTime)
     view external returns (uint8) {

       bytes32 flightKey = getFlightKey(airline, flightNum, flightTime);
       return flightDB[flightKey].statusCode;

     }

     function setFlightStatusCode(address airline, uint flightNum, uint flightTime, uint8 statusCode)
     external {

       bytes32 flightKey = getFlightKey(airline, flightNum, flightTime);
       flightDB[flightKey].statusCode = statusCode;

     }

     function getFlightKey
                         (
                             address airline,
                             uint flightNum,
                             uint256 timestamp
                         )
                         pure
                         internal
                         returns(bytes32)
     {
         return keccak256(abi.encodePacked(airline, flightNum, timestamp));
     }

     // basic function to fund this contract
     function fundThisContract() public payable {

       // nothing to do!

     }

     /********************************************************************************************/
     /*                                     FRONT-END                                            */
     /********************************************************************************************/

     uint[] public flightNumList;

     function flightNumListLength() view external returns (uint) {
       return flightNumList.length;
     }

     mapping(uint => uint) public numToTime;

     function getNumToTime(uint num) view external returns (uint) {
       return numToTime[num];
     }

     /********************************************************************************************/
     /*                                     SMART CONTRACT FUNCTIONS                             */
     /********************************************************************************************/

     /**
      * @dev Add an airline to the registration queue
      *      Can only be called from FlightSuretyApp contract
      *
      */
      function registerAirline (string memory _name, address payable _address) public {

        // require caller to be registered & isFunded
        // first airlines should be automatically registered
        require( (numRegAirlines < 1) ||
          (airlineDB[tx.origin].isRegistered && airlineDB[tx.origin].isFunded),
        "Function caller is not registered or funded");

        Airline memory newAirline = Airline(_name, _address, true, false);

        airlineDB[_address] = newAirline;
        numRegAirlines += 1;

      }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
     function fund () payable public {

       require (airlineDB[tx.origin].isRegistered, "Can only fund registered airlines");

       airlineDB[tx.origin].isFunded= true;

       isAirline[tx.origin] = true;

     }

    function registerFlight (uint _flightNum, uint _flightTime, address payable _address) external
    returns (uint[] memory) {

      bytes32 flightKey = getFlightKey(_address, _flightNum, _flightTime);

      // unsure of mapping
      Flight memory newFlight = Flight(_flightNum, true, 0, _flightTime, _address);

      isFlight[flightKey] = true;
      flightDB[flightKey] = newFlight;
      numRegFlights += 1;

      flightNumList.push(_flightNum);
      numToTime[_flightNum] = _flightTime;

      return flightNumList;

     }

   /**
    * @dev Buy insurance for a flight
    *
    */
    function buyInsurance (address payable _airline, uint _flightNum, uint _flightTime) external payable {

      bytes32 flightKey = getFlightKey(_airline, _flightNum, _flightTime);

      // make sure this is a valid flight!
      require (isFlight[flightKey], "Not a valid flight");

      // register insuree
      flightDB[flightKey].insurees[tx.origin] = msg.value;

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees (address payable _airline, uint _flightNum,
      uint _flightTime, uint _insuranceMuliplierNum, uint _insuranceMuliplierDen) external {

      bytes32 flightKey = getFlightKey(_airline, _flightNum, _flightTime);

      // make sure this is a valid flight!
      require (isFlight[flightKey], "Not a valid flight");

      uint insuranceAmount = flightDB[flightKey].insurees[tx.origin];

      // make sure the passenger has paid non-zero insurance
      require(insuranceAmount > 0, "you never paid insurance for this flight");

      uint insurancePayout = insuranceAmount * _insuranceMuliplierNum / _insuranceMuliplierDen;

      flightDB[flightKey].insureesPayout[tx.origin] = insurancePayout;
    }


    /**
     *  @dev Transfers eligible payout funds to insuree.
     * Currently transfers all their insurance claim.
     *
    */
    function insureePayout (address payable _airline, uint _flightNum, uint _flightTime) external payable {

      bytes32 flightKey = getFlightKey(_airline, _flightNum, _flightTime);

      // make sure this is a valid flight!
      require (isFlight[flightKey], "Not a valid flight");

      uint insurancePayout = flightDB[flightKey].insureesPayout[tx.origin];

      // make sure the passenger has paid non-zero insurance
      require(insurancePayout > 0, "you never paid insurance for this flight");

      // make sure this contract has enough to pay!
      require(address(this).balance >= insurancePayout, "contract does not have enough money");

      // pay insured passenger
      tx.origin.transfer(insurancePayout);
    }

    function processFlightStatus
                                (   address airline,
                                    uint flightNum,
                                    uint256 flightTime,
                                    uint8 statusCode
                                )

                                external
    {
      bytes32 flightKey = getFlightKey(airline, flightNum, flightTime);

      emit Debug2(airline, flightNum, flightTime, statusCode);

      flightDB[flightKey].statusCode = statusCode;
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
                            external
                            payable
    {
        fund();
    }


}
