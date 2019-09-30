import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.firstAirline = null;
        this.airlines = [];
        this.passengers = [];
        this.currentPassenger = null;
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            var passengersShort = [];

            while(this.passengers.length < 5) {
                passengersShort.push((accts[counter]).slice(0, 5) + " ... " + accts[counter].slice(-5));
                this.passengers.push(accts[counter++]);

            }
            populateOptions("selectPassengerforInsurance", passengersShort);

            function populateOptions(id, list) {

                                      var select = document.getElementById(id);
                                      for (var i = 0; i < list.length; i++) {
                                          var opt = list[i];
                                          var el = document.createElement("option");
                                          var number = opt;
                                          el.textContent = number;
                                          el.value = number;
                                          select.appendChild(el);
                                      }
                };


            this.flightSuretyApp.methods.firstAirline().call((error, result) => {
                this.firstAirline = result;

                this.flightSuretyApp.methods.fund()
                .send({from: this.firstAirline, value: this.web3.utils.toWei("10", "ether")},
                (error, result) => {

                    this.flightSuretyApp.methods.getFlightNumListLength()
                    .call((error, length) => {

                        let flightList1 = []
                        let flightList2 = []

                        for (var i = 0; i < length; i++) {

                          // console.log(i);

                          var f = this.flightSuretyApp.methods.getFlightNumList(i)
                          .call((error, num) => {

                            var g = this.flightSuretyApp.methods.getNumToTime(num)
                            .call((error, time) => {

                              // console.log(time);
                              return time;

                            });

                              flightList2.push(g);
                              return num;
                          });

                        flightList1.push(f);

                        }

                        Promise.all(flightList1).then(function(value1) {

                          Promise.all(flightList2).then(function (value2) {

                            var newList = [];
                            for (var i = 0; i < value1.length; i++) {

                              newList.push((value1[i] + ", " + value2[i]).toString());

                            }

                            populateOptions("selectFlight", newList);
                            populateOptions("selectFlightforInsurance", newList);
                          });

                        });

                  });

              });

           });

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flightNum, flightTime, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flightNum: flightNum,
            flightTime: flightTime
        }

        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flightNum, payload.flightTime)
            .send({ from: self.owner}, (error, result) => {

              self.flightSuretyApp.methods
                  .getFlightStatusCode(payload.airline, payload.flightNum, payload.flightTime)
                  .call((error, code) => {

                    // console.log(error, code);

                    var additionalText = "<br> Since the delay is because of the airline, you will be issued your insurance claim. Click on withdraw below!"

                    var statusCode = document.getElementById("newStatusCode");
                    statusCode.innerHTML = "New Status Code is: " + "<b>" + code + "</b>";

                    if (code == 20) {
                      statusCode.innerHTML += additionalText;
                    }

                    self.flightSuretyApp.methods
                        .creditInsurees(this.firstAirline, flightNum, flightTime, code)
                        .send({from: this.currentPassenger},
                        (error, result) => {

                          // console.log(result);


                      });

                  });

            });
    }

    buyInsurance(flightNum, flightTime, passenger, amount, callback) {
      let self = this;

      self.currentPassenger = passenger;

      self.flightSuretyApp.methods
          .buyInsurance(this.firstAirline, flightNum, flightTime)
          .send({from: passenger, value: this.web3.utils.toWei(amount, "ether")},
          (error, result) => {

            var hasInsurance = document.getElementById("hasInsurance");
            hasInsurance.innerHTML = "<b> Passenger is now insured! </b>";

          });

    }

    insureePayout(flightNum, flightTime, passenger, callback) {

      let self = this;

      self.currentPassenger = passenger;

      self.flightSuretyApp.methods
          .insureePayout(this.firstAirline, flightNum, flightTime)
          .send({from: passenger},
          (error, result) => {

              // console.log(error, result);

              var hasInsurance = document.getElementById("withdraw");
              hasInsurance.innerHTML = "<b> Passenger has withdraw their claim! </b>";

          });


    }
}
