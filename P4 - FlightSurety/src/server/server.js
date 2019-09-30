import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let oracles = [];
// number of oracles
var NUM_ORACLES;

// index of oracle
var globalIndex;

// list to get parallel execution
var listofFunctions;

// flag to limit console output
var flagOnce;

// init
flightSuretyApp.methods.getNumOracles().call((error, num) => {

    NUM_ORACLES = num;

    web3.eth.getAccounts((error, accounts) => {

        for (var i = 0; i < NUM_ORACLES; i++) {

            // push oracles onto array
            oracles.push(accounts[i + 10]);

            // once that is done, start registering oracles
            flightSuretyApp.methods.registerOracle().send({
                    from: accounts[i + 10],
                    value: web3.utils.toWei("1", "ether"),
                    gas: 100000000
                },
                (error, result) => {


                    // console.log(error, result);

                });

        }

        console.log("Done loading oracles!");


    });



})

// helper functions

async function printValues(event) {

    // get important variables
    let returnValues = event.returnValues;
    let airline = returnValues.airline;
    let index = returnValues.index;
    let flightNum = returnValues.flightNum;
    let flightTime = returnValues.timestamp;
    let statusCode = returnValues.status;
    let eventType = event.event;

    var toPrint;
    if (index) toPrint = index;
    else toPrint = statusCode;

    console.log(eventType, flightNum, flightTime, toPrint);

}

function callOracleReport(i, index, airline, flightNum, flightTime) {

    // randomize status code
    let randomStatusCode = flightSuretyApp.methods.getRandomStatusCode(oracles[i]);
    randomStatusCode.call((error, randomNumber) => {

        // assign index variable
        globalIndex = index;
        listofFunctions = [];
        flagOnce = 0;

        // submit oracle response
        flightSuretyApp.methods.submitOracleResponse(index, airline, flightNum, flightTime, randomNumber)
            .send({
                    from: oracles[i]
                },
                ((error, result) => {

                })
            );
    });
}


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
}, function(error, event) {
    if (error) console.log(error);

    let returnValues = event.returnValues;
    let airline = returnValues.airline;
    let index = returnValues.index;
    let flightNum = returnValues.flightNum;
    let flightTime = returnValues.timestamp;
    let eventType = event.event;

    printValues(event);

    // call helper function
    for (var i = 0; i < NUM_ORACLES; i++) {

        callOracleReport(i, index, airline, flightNum, flightTime);

    }

})

/********************************************************************************/
async function getResponseInfo(i, airline, flightNum, flightTime, statusCodes) {

    flightSuretyApp.methods.getResponseInfo(globalIndex, airline, flightNum, flightTime, statusCodes[i])
        .call((error, result) => {

        });

}

async function getStatusCodeInfo(event) {

    let returnValues = event.returnValues;
    let airline = returnValues.airline;
    let index = returnValues.index;
    let flightNum = returnValues.flightNum;
    let flightTime = returnValues.timestamp;
    let eventType = event.event;

    flagOnce++;
    if (flagOnce == 1) {

        let statusCodes = [0, 10, 20, 30, 40, 50];

        for (var i = 0; i < statusCodes.length; i++) {

            let f = getResponseInfo(i, airline, flightNum, flightTime, statusCodes);
            listofFunctions.push(f);
        }

        await Promise.all(listofFunctions);

    }

}

flightSuretyApp.events.OracleReport({
    fromBlock: 0
}, function(error, event) {
    if (error) console.log(error);

    printValues(event);
    getStatusCodeInfo(event);
});

/********************************************************************************/

async function changeStatusCode(event) {

    let returnValues = event.returnValues;
    let airline = returnValues.airline;
    let flightNum = returnValues.flightNum;
    let flightTime = returnValues.timestamp;

    flightSuretyApp.methods.getFlightStatusCode(airline, flightNum, flightTime)
        .call((error, result) => {

            console.log("Status code is: " + result);

        });

}

flightSuretyApp.events.FlightStatusInfo({
    fromBlock: 0
}, function(error, event) {
    if (error) console.log(error);

    printValues(event);
    changeStatusCode(event);

});

/********************************************************************************/

// debug
flightSuretyApp.events.Debug({
    fromBlock: 0
}, function(error, event) {
    if (error) console.log(error);

})

const app = express();
app.get('/api', (req, res) => {
    res.send({
        message: 'An API for use with your Dapp!'
    })
})

export default app;
