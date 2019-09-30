
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
          var e = document.getElementById("selectFlight");
          var strUser = e.options[e.selectedIndex].text;
          if (strUser.indexOf(',') > -1) {
            var splitArray = strUser.split(',');
            var flightNum = splitArray[0];
            var flightTime = splitArray[1].slice(1);

          }
            // Write transaction
            contract.fetchFlightStatus(flightNum, flightTime, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        // User-submitted transaction
        DOM.elid('submit-insurance').addEventListener('click', () => {

          var e = document.getElementById("selectFlightforInsurance");
          var strUser = e.options[e.selectedIndex].text;
          if (strUser.indexOf(',') > -1) {
            var splitArray = strUser.split(',');
            var flightNum = splitArray[0];
            var flightTime = splitArray[1].slice(1);
          }

          var e = document.getElementById("selectPassengerforInsurance");
          var passenger = contract.passengers[e.selectedIndex - 1];

          e = document.getElementById("ether");
          var ether =  e.value;

          // console.log(ether);
          // console.log(passenger);

          // Write transaction
          contract.buyInsurance(flightNum, flightTime, passenger, ether, (error, result) => {;
          });

        })

        // User-submitted transaction
        DOM.elid('withdraw-ether').addEventListener('click', () => {


          var e = document.getElementById("selectFlightforInsurance");
          var strUser = e.options[e.selectedIndex].text;
          if (strUser.indexOf(',') > -1) {
            var splitArray = strUser.split(',');
            var flightNum = splitArray[0];
            var flightTime = splitArray[1].slice(1);
          }

          var passenger = contract.passengers[e.selectedIndex - 1];

          // Write transaction
          contract.insureePayout(flightNum, flightTime, passenger, (error, result) => {
          });

        })

    });


})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}
