<script>
  //<![CDATA[

  //Creates a table version of an iSheet, would need alot of editing to be setup on a new site. Also contains comments that display on click.
  //Can be found on the Places for People - Concept Portal HighQ site under 'Milestone dashboard' .
  // Includes an over 1000 record request that can be used on other sites and codes.

  var siteParams = new URLSearchParams(window.location.search);
  var globalSiteID = siteParams.get("metaData.siteID");

  // Enter the base URL of your instance in the variable below.
  // This should not be the root domain; there is likely to be an extension after the first "/" (e.g "[...].highq.com/[panelFirmName]/")

  var baseURL = "";

  var APIBaseURL =
    baseURL[baseURL.length - 1] == "/" ? baseURL + "api" : baseURL + "/api";

  // Enter the API Client details in the variables below.
  var client_id = "";
  var client_secret = "";

  var instructionFormiSheetName = "Instruction Form";
  var instructionFormMilestonesViewName = "Milestones";
  var isheetid;
  var sheetviewid;

  class authVerification {
    constructor() {
      //this.checkAuth();
    }

    async checkAuth() {
      this.authCookieCheck = this.checkCookie();

      if (!this.authCookieCheck) {
        await this.getCodeReq();
      }
    }

    async getCodeReq() {
      var requestOptions = {
        method: "GET",
        redirect: "follow",
      };

      var accessCode = "";

      let response = await fetch(
        baseURL +
          "/authorize.action?response_type=code&client_id=" +
          client_id +
          "&redirect_uri=" +
          baseURL +
          "siteHomePage.action?metaData.siteID=" +
          globalSiteID,
        requestOptions
      );

      const URLParams = new URLSearchParams(response.url);
      console.log(URLParams.get("code"));

      accessCode = URLParams.get("code");

      await this.authAPI(accessCode);

      return;
    }
    async authAPI(code) {
      let headers = new Headers();
      headers.append("Content-Type", "application/x-www-form-urlencoded");

      var urlencoded = new URLSearchParams();
      urlencoded.append("grant_type", "authorization_code");
      urlencoded.append("client_id", client_id);
      urlencoded.append("client_secret", client_secret);
      urlencoded.append("code", code);

      var requestOptions = {
        method: "POST",
        headers: headers,
        body: urlencoded,
        redirect: "follow",
      };

      let response = await fetch(APIBaseURL + "/oauth2/token", requestOptions);
      if (response.ok) {
        var respJson = await response.json();
      } else {
        throw "Something went wrong";
      }
      await console.log("Access Token: " + respJson.access_token);

      const d = new Date();
      d.setTime(d.getTime() + 30 * 60 * 1000);
      let expires = "expires=" + d.toUTCString();
      document.cookie = "APIAccess=" + respJson.access_token + ";" + expires;

      console.log(document.cookie);

      return;
    }
    getCookie(cname) {
      let name = cname + "=";
      let decodedCookie = decodeURIComponent(document.cookie);
      let ca = decodedCookie.split(";");
      for (let i = 0; ca.length > i; i++) {
        let c = ca[i];
        while (c.charAt(0) == " ") {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
        }
      }
      return "";
    }
    checkCookie() {
      let accessToken = this.getCookie("APIAccess");
      console.log("Access Token: " + accessToken);
      if (accessToken != "" && accessToken != "undefined") {
        return true;
      } else if (accessToken == "undefined") {
        console.log("Flag undefined");
        return "undefined";
      } else {
        return false;
      }
    }
  }
  currentAuthentication = new authVerification();

  async function get_isheet_and_view_ids() {
    await currentAuthentication.checkAuth();

    var reqURL = `${APIBaseURL}/3/isheets/admin?siteid=${globalSiteID}`;

    var reqHeaders = new Headers();
    reqHeaders.append(
      "Authorization",
      "Bearer " + currentAuthentication.getCookie("APIAccess")
    );

    var reqOptions = {
      headers: reqHeaders,
      method: "GET",
    };

    var response = await fetch(reqURL, reqOptions);

    var data = await response.text();

    var parser = new DOMParser();

    var XMLDoc = parser.parseFromString(data, "text/xml");

    console.log(XMLDoc);

    var isheets = XMLDoc.getElementsByTagName("isheet");

    console.log(isheets);

    for (var i = 0; i < isheets.length; i++) {
      console.log(isheets[i].getElementsByTagName("title")[0].innerHTML);

      switch (isheets[i].getElementsByTagName("title")[0].innerHTML) {
        case instructionFormiSheetName:
          isheetid = isheets[i].getElementsByTagName("id")[0].innerHTML;
          console.log(isheetid);

          let req2URL = `${APIBaseURL}/3/isheets/admin/${isheetid}/views`;
          let response2 = await fetch(req2URL, reqOptions);
          let data2 = await response2.text();
          let XMLDoc2 = parser.parseFromString(data2, "text/xml");

          let views = XMLDoc2.getElementsByTagName("isheetview");
          console.log(views);

          for (var i2 = 0; i2 < views.length; i2++) {
            switch (views[i2].getElementsByTagName("title")[0].innerHTML) {
              case instructionFormMilestonesViewName:
                sheetviewid =
                  views[i2].getElementsByTagName("viewid")[0].innerHTML;
                console.log(sheetviewid);
                break;
              default:
                break;
            }
          }

          break;

        default:
          break;
      }
    }
  }

  async function createTable() {
    await get_isheet_and_view_ids();

    var request = `${APIBaseURL}/3/isheet/${isheetid}/items?sheetviewid=${sheetviewid}&limit=1000&offset=0`; //get iSheet records of a certain view.

    await currentAuthentication.checkAuth();
    var myHeaders = new Headers();
    myHeaders.append("Auth-type", "OAUTH2");
    myHeaders.append(
      "Authorization",
      "Bearer " + currentAuthentication.getCookie("APIAccess")
    );
    myHeaders.append("content-type", "application/x-www-form-urlencoded");

    var requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };

    fetch(request, requestOptions)
      .then((response) => response.text())
      .then((data) => {
        const parser = new DOMParser(); //creates new domparser object.
        var xmldoc = parser.parseFromString(data, "application/xml"); //parse to xml.
        //console.log(xmldoc);
        var totalRecordCount =
          xmldoc.documentElement.getAttribute("totalrecordcount");
        // console.log(totalRecordCount);
        var requestNumber = Math.ceil(totalRecordCount / 1000);
        //console.log(requestNumber);

        let promises = [];
        promises.push(Promise.resolve(xmldoc));

        for (let i = 1; i < requestNumber; i++) {
          let offset = i * 1000;
          let newRequest = `${APIBaseURL}/3/isheet/${isheetid}/items?sheetviewid=${sheetviewid}&limit=1000&offset=${offset}`;
          promises.push(
            fetch(newRequest, requestOptions)
              .then((response) => response.text())
              .then((data) => {
                const parser = new DOMParser(); //creates new domparser object.
                var xmldoc = parser.parseFromString(data, "application/xml"); //parse to xml.
                return xmldoc;
              })
              .catch((error) => console.log("error", error))
          );
        }

        Promise.all(promises).then((values) => {
          let combinedXmlDoc = values[0];

          for (let i = 1; i < values.length; i++) {
            let xmlDoc = values[i];
            let children = xmlDoc.documentElement.childNodes;
            for (let j = 0; j < children.length; j++) {
              combinedXmlDoc.documentElement.appendChild(children[j]);
            }
          }

          // console.log(combinedXmlDoc);

          const names = combinedXmlDoc.getElementsByTagName("columnvalue"); // column header values
          const columnNamesArray = [];
          const columnIdArray = [];

          for (let i = 0; i < names.length; i++) {
            const columnTypeId =
              names[i].parentNode.getAttribute("columntypeid");
            const columnID = names[i].parentNode.getAttribute("columnid");

            columnNamesArray.push(names[i].childNodes[0].nodeValue); //push names
            columnIdArray.push(columnID); //push ids
          }

          let items = combinedXmlDoc.querySelectorAll("data > item");
          // console.log("Number of records: " + items.length);

          let columnsArray = [];
          items.forEach((item) => {
            let columns = item.querySelectorAll("column");
            let columnArray = [];
            columns.forEach((column) => {
              let value = column.querySelector("rawdata > value");
              let label = column.querySelector(
                "rawdata > choices > choice > label"
              );
              let date = column.querySelector("rawdata > date");

              let lookup = column.querySelector(
                "displaydata > lookupusers > lookupuser > userdisplayname"
              );
              if (value) {
                columnArray.push(value.textContent);
              } else if (label) {
                columnArray.push(label.textContent);
              } else if (date) {
                var dateParser = new Date(Date.parse(date.textContent));
                var options = {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                };
                columnArray.push(
                  dateParser.toLocaleDateString("en-US", options)
                );
              } else if (lookup) {
                columnArray.push(lookup.textContent);
              } else {
                columnArray.push("Unanswered");
              }
            });
            columnsArray.push(columnArray);
          });

          // console.log(columnsArray);

          const table = document.createElement("table");
          const headerRow = table.insertRow(0);

          for (let i = 0; i < columnNamesArray.length; i++) {
            const headerCell = headerRow.insertCell(i);
            headerCell.innerHTML = columnNamesArray[i];
          } //gets the header array values.

          columnsArray.forEach((row) => {
            const bodyRow = table.insertRow();
            row.forEach((cell) => {
              const bodyCell = bodyRow.insertCell();
              bodyCell.innerHTML = cell;
            });
          }); //for each value within array, create new row and insert element of each row into cells of that row.

          const rows = table.rows;
          var cells = rows[0].cells;
          const indexesToRemove = [];
          const contentsToRemove = [];
          let noNotes = true;

          for (let i = 0; i < cells.length; i++) {
            if (
              cells[i].textContent === "Notes on the enquiries made" ||
              cells[i].textContent === "Transfer agreement notes" ||
              cells[i].textContent === "Transfer agreement notes" ||
              cells[i].textContent === "Notes on LDA obtainment" ||
              cells[i].textContent === "Notes on executed documents received" ||
              cells[i].textContent === "Transfer agreement notes" ||
              cells[i].textContent ===
                "Notes on the completion monies received" ||
              cells[i].textContent ===
                "Completion date of exchange of contracts (if known)"
            ) {
              indexesToRemove.push(i); //if any of these are equal. Push the iterator number.
              const rowContents = [];
              for (let j = 0; j < rows.length; j++) {
                if (rows[j].cells[i].textContent !== "Unanswered") {
                  //if it is not unanswered,
                  var Header = cells[i].textContent; //header is header
                  var Content = rows[j].cells[i].textContent; //
                  if (Content.endsWith("000000")) {
                    Content = Content.slice(0, -6);
                  }
                  rowContents.push("<h1>" + Header + ":</h1>" + "\n" + Content);
                }
              }

              contentsToRemove.push(rowContents);
              //	console.log(contentsToRemove);
            }
          }

          var dialogData = [];
          for (let i = 0; i < rows.length; i++) {
            let cells = rows[i].getElementsByTagName("td");
            let rowData = [];
            for (let j = 0; j < cells.length; j++) {
              if (indexesToRemove.includes(j)) {
                rowData.push(cells[j].innerHTML);
              }
            }
            dialogData.push(rowData);
          }
          console.log(dialogData);

          function removeTrailingZeros(num) {
            const number = String(num).replace(/\.0+$/, "");
            return parseFloat(number);
          }

          for (let i = 0; i < dialogData.length; i++) {
            dialogData[i][0] =
              "<h1>Notes on the enquiries made</h1>" + dialogData[i][0];
            dialogData[i][1] =
              "<h1>Completion date of exchange of contracts (if known)</h1>" +
              dialogData[i][1];
            dialogData[i][2] =
              "<h1>Notes on LDA obtainment</h1>" + dialogData[i][2];
            dialogData[i][3] =
              "<h1>Notes on executed documents received</h1>" +
              dialogData[i][3];
            dialogData[i][4] =
              "<h1>Notes on the completion monies received</h1>" +
              dialogData[i][4];
          }

          for (let i = 0; i < dialogData.length; i++) {
            dialogData[i] = dialogData[i].filter(function (value) {
              return !value.includes("Unanswered");
            });
          }

          //console.log(indexesToRemove);
          for (let i = indexesToRemove.length - 1; i >= 0; i--) {
            var index = indexesToRemove[i];
            for (let j = 0; j < rows.length; j++) {
              rows[j].deleteCell(index); //REMOVES COLUMNS
            }
          }

          var originalValues = [];
          for (let i = 1; i < rows.length; i++) {
            //iterate over table except first row.
            const cells = rows[i].getElementsByTagName("td"); //gets all values of row.
            const rowValues = [];
            for (let j = 0; j < cells.length; j++) {
              rowValues.push(cells[j].textContent); //push these values into row values array.
            }
            originalValues.push(rowValues); //push all of it into original values array

            rows[i].addEventListener("click", () => {
              //listen to click event on row.
              var firstCell = originalValues[i - 1][0]; //Instructing Entity
              var secondCell = originalValues[i - 1][1];
              var thirdCell = originalValues[i - 1][2]; //Categories of work
              let title =
                '<div class="recordTitle">' +
                "<b>" +
                firstCell +
                "</b>" +
                thirdCell +
                "</div>";
              let message = title;
              //console.log(dialogData[i]);
              if (dialogData[i].length === 0) {
                // console.log("triggered");
                message = title + "<h1>This record has no notes</h1>";
              }

              for (let j = 0; j < dialogData[i].length; j++) {
                if (
                  dialogData[i][j] !== undefined &&
                  dialogData[i][j] !== "Unanswered"
                ) {
                  message += dialogData[i][j] + "\n"; //if not undefined, loop over and add
                }
              }
              var dialog = document.createElement("dialog");
              dialog.innerHTML = `
        <div>
          <p>${message}</p>
        </div>
      `;
              document.body.appendChild(dialog);
              dialog.showModal();
              // Add event listener to close dialog when user clicks outside of it
              dialog.addEventListener("click", (event) => {
                if (event.target === dialog) {
                  dialog.close();
                }
              });
            });
          }

          $j("#tableOutput").html(table);

          $j("td")
            .filter(function () {
              return $j(this).text().trim() === "Yes";
            })
            .css({
              "background-color": "#14a58f",
              "border-top": "1px solid #14a58f",
              color: "#fff",
            });

          $j("td")
            .filter(function () {
              return $j(this).text().trim() === "No";
            })
            .css({
              "background-color": "#CB3727",
              color: "#fff",
            });

          $j("td")
            .filter(function () {
              return $j(this).text().trim() === "Unanswered";
            })
            .css({
              "background-color": "#AEB2B5",
              color: "#fff",
            });

          const firstRowCells = $j("#tableOutput table tr:first-child").find(
            "td"
          );

          firstRowCells.each((index, cell) => {
            cell.onclick = () => sortTable(index);
          });
        });
      });
  }

  async function createSelects() {
    await createTable();
    var cells = document.querySelectorAll("#tableOutput tr:first-child td");
    var instructingEntityIndex = -1;
    var instructingEntityArray = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].textContent === "Instructing entity") {
        instructingEntityIndex = i;
        break;
      }
    }
    if (instructingEntityIndex !== -1) {
      var instructingEntityCells = document.querySelectorAll(
        `#tableOutput tr td:nth-child(${instructingEntityIndex + 1})`
      );
      for (let i = 0; i < instructingEntityCells.length; i++) {
        instructingEntityArray.push(instructingEntityCells[i].textContent);
      }
      instructingEntityArray.shift();
      var uniqueInstructingEntities = [...new Set(instructingEntityArray)];
      instructingEntityArray = uniqueInstructingEntities;
    }

    //1st
    var cells = document.querySelectorAll("#tableOutput tr:first-child td");
    var categoriesOfWorkIndex = -1;
    var categoriesOfWorkArray = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].textContent === "Categories of work") {
        categoriesOfWorkIndex = i;
        break;
      }
    }
    if (categoriesOfWorkIndex !== -1) {
      var categoriesOfWorkCells = document.querySelectorAll(
        `#tableOutput tr td:nth-child(${categoriesOfWorkIndex + 1})`
      );
      for (let i = 0; i < categoriesOfWorkCells.length; i++) {
        categoriesOfWorkArray.push(categoriesOfWorkCells[i].textContent);
      }
      categoriesOfWorkArray.shift();
      var uniqueCategoriesOfWork = [...new Set(categoriesOfWorkArray)];
      categoriesOfWorkArray = uniqueCategoriesOfWork;
    }

    //2nd

    var cells = document.querySelectorAll("#tableOutput tr:first-child td");
    var instructingOfficerIndex = -1;
    var instructingOfficerArray = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].textContent === "Instructing officer") {
        instructingOfficerIndex = i;
        break;
      }
    }
    if (instructingOfficerIndex !== -1) {
      var instructingOfficerCells = document.querySelectorAll(
        `#tableOutput tr td:nth-child(${instructingOfficerIndex + 1})`
      );
      for (let i = 0; i < instructingOfficerCells.length; i++) {
        instructingOfficerArray.push(instructingOfficerCells[i].textContent);
      }
      instructingOfficerArray.shift();
      var uniqueInstructingOfficers = [...new Set(instructingOfficerArray)];
      instructingOfficerArray = uniqueInstructingOfficers;
      //console.log(instructingOfficerArray);
    }
    //3rd

    var cells = document.querySelectorAll("#tableOutput tr:first-child td");
    var regionIndex = -1;
    var regionArray = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].textContent === "Region") {
        regionIndex = i;
        break;
      }
    }
    if (regionIndex !== -1) {
      var regionCells = document.querySelectorAll(
        `#tableOutput tr td:nth-child(${regionIndex + 1})`
      );
      for (let i = 0; i < regionCells.length; i++) {
        regionArray.push(regionCells[i].textContent);
      }
      regionArray.shift();
      var uniqueRegions = [...new Set(regionArray)];
      regionArray = uniqueRegions;
    }
    //4th

    const select1 = document.createElement("select");
    select1.setAttribute("id", "instructingEntitySelect");

    // Create the 'All' option
    var allOption = document.createElement("option");
    allOption.value = "All";
    allOption.text = "All";

    // Add the 'All' option to the beginning of the select element
    select1.add(allOption, 0);

    // Add the other options to the select element
    instructingEntityArray.forEach(function (option) {
      const opt = document.createElement("option");
      opt.value = option;
      opt.innerHTML = option;
      select1.appendChild(opt);
    });

    //1st
    const select2 = document.createElement("select");

    // Create the 'All' option
    var allOption = document.createElement("option");
    allOption.value = "All";
    allOption.text = "All";

    // Add the 'All' option to the beginning of the select element
    select2.add(allOption, 0);

    // Create the other options and add them to the select element
    categoriesOfWorkArray.forEach(function (option) {
      var opt = document.createElement("option");
      opt.value = option;
      opt.innerHTML = option;
      select2.appendChild(opt);
    });

    // Add the ID to the select element
    select2.setAttribute("id", "categoriesOfWorkSelect");
    //2nd

    const select3 = document.createElement("select");
    select3.setAttribute("id", "instructingOfficerSelect");

    // Create the 'All' option
    var allOption = document.createElement("option");
    allOption.value = "All";
    allOption.text = "All";

    // Add the 'All' option to the beginning of the select element
    select3.add(allOption, 0);

    // Add the other options to the select element
    instructingOfficerArray.forEach(function (option) {
      const opt = document.createElement("option");
      opt.value = option;
      opt.innerHTML = option;
      select3.appendChild(opt);
    });

    console.log(select3);
    //3rd

    const select4 = document.createElement("select");
    select4.setAttribute("id", "regionSelect");

    // Create the 'All' option
    var allOption = document.createElement("option");
    allOption.value = "All";
    allOption.text = "All";

    // Add the 'All' option to the beginning of the select element
    select4.add(allOption, 0);

    // Add the other options to the select element
    regionArray.forEach(function (option) {
      const opt = document.createElement("option");
      opt.value = option;
      opt.innerHTML = option;
      select4.appendChild(opt);
    });

    console.log(select4);

    //4th

    function removeOption(select, value) {
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
          select.remove(i);
          break;
        }
      }
    }

    removeOption(select1, "Unanswered");
    removeOption(select2, "Unanswered");
    removeOption(select3, "Unanswered");
    removeOption(select4, "Unanswered");

    $j("#instructingEntity").html(select1);
    $j("#categoriesOfWork").html(select2);
    $j("#instructingOfficer").html(select3);
    $j("#region").html(select4);

    $j("#instructingEntity").prepend("Instructing entity: ");
    $j("#categoriesOfWork").prepend("Categories of work: ");
    $j("#instructingOfficer").prepend("Instructing officer: ");
    $j("#region").prepend("Region: ");

    $j("#categoriesOfWork").hide();
    $j("#instructingEntity").hide();
    $j("#instructingOfficer").hide();
    $j("#region").hide();

    var selectBoth1 = $j("#categoriesOfWorkSelect").clone();
    var selectBoth2 = $j("#instructingEntitySelect").clone();
    var selectBoth3 = $j("#instructingOfficerSelect").clone();
    var selectBoth4 = $j("#regionSelect").clone();

    selectBoth1.attr("id", "bothSelect1");
    selectBoth2.attr("id", "bothSelect2");
    selectBoth3.attr("id", "bothSelect3");
    selectBoth4.attr("id", "bothSelect4");

    console.log(selectBoth1);
    console.log(selectBoth2);
    console.log(selectBoth3);
    console.log(selectBoth4);

    $j("#both2").html("Categories of work: ").append(selectBoth1);
    $j("#both").html("Instructing entity: ").append(selectBoth2);
    $j("#both3").html("Instructing officer: ").append(selectBoth3);
    $j("#both4").html("Region: ").append(selectBoth4);

    $j("#bothSelect1, #bothSelect2, #bothSelect3, #bothSelect4").change(
      function () {
        var bothSelect1Val = $j("#bothSelect1").val(); //categories of work, 3
        var bothSelect2Val = $j("#bothSelect2").val(); //Instructing entity, 1
        var bothSelect3Val = $j("#bothSelect3").val(); //Instructing officer, 2
        var bothSelect4Val = $j("#bothSelect4").val(); //Region, 4

        var SelectValuesArray = [];
        SelectValuesArray.push(bothSelect1Val);
        SelectValuesArray.push(bothSelect2Val);
        SelectValuesArray.push(bothSelect3Val);
        SelectValuesArray.push(bothSelect4Val);

        console.log(SelectValuesArray);

        $j("#tableOutput table tr").each(function (index) {
          // Select all rows of the table with id 'tableOutput' and loop through each row
          if (index === 0) {
            // If the index of the row is 0
            $j(this).show(); // Show the row
          } else {
            // Otherwise
            var count = 0; // Initialize counter variable
            var row = $j(this); // Set a variable 'row' to the current row
            var matchFound = false; // Set a variable 'matchFound' to false
            var tempArray = SelectValuesArray.filter(function (value) {
              // Create a new array 'tempArray' by filtering out any value that is equal to 'All'
              return value !== "All";
            });
            if (
              $j.inArray("All", SelectValuesArray) !== -1 &&
              tempArray.length === 0
            ) {
              // If 'SelectValuesArray' contains 'All' and there are no other values in 'tempArray'
              matchFound = true; // Set 'matchFound' to true
            }

            $j(this)
              .find("td")
              .each(function () {
                // Loop through each cell of the row
                if ($j.inArray($j(this).text(), SelectValuesArray) !== -1) {
                  // If the text of any cell matches any value in 'SelectValuesArray'
                  count++; // Increment counter variable

                  if (
                    count == 4 ||
                    (count == 3 && SelectValuesArray.includes("All")) ||
                    (count == 2 &&
                      SelectValuesArray.filter((x) => x === "All").length ==
                        2) ||
                    (count == 1 &&
                      SelectValuesArray.filter((x) => x === "All").length == 3)
                  ) {
                    // If there are 4 matches or the all/3 matches or all/2 matches or all/1 match:
                    //console.log("match found"); // Log "match found"
                    matchFound = true; // Set 'matchFound' to true
                  }
                }
              });
            if (matchFound) {
              // If 'matchFound' is true
              row.show(); // Show the row
            } else {
              // Otherwise
              row.hide(); // Hide the row
            }
          }
        });
      }
    );

    document.addEventListener("DOMSubtreeModified", function (event) {
      if (event.target.id === "tableOutput") {
        $j("#tableOutput table").addClass("tablemobile");

        $j("#instructingEntitySelect").change(function () {
          var selectedValue = $j(this).val();
          $j("#tableOutput tr").each(function (index) {
            if (index === 0) {
              $j(this).show();
            } else if (selectedValue == "All") {
              $j(this).show();
            } else {
              var rowText = $j(this).text().toLowerCase();
              if (rowText.indexOf(selectedValue.toLowerCase()) !== -1) {
                $j(this).show();
              } else {
                $j(this).hide();
              }
            }
          });
        });

        $j("#categoriesOfWorkSelect").change(function () {
          var selectedValue = $j(this).val();
          $j("#tableOutput tr").each(function (index) {
            if (index === 0) {
              $j(this).show();
            } else if (selectedValue == "All") {
              $j(this).show();
            } else {
              var rowText = $j(this).text().toLowerCase();
              if (rowText.indexOf(selectedValue.toLowerCase()) !== -1) {
                $j(this).show();
              } else {
                $j(this).hide();
              }
            }
          });
        });

        document.removeEventListener("DOMSubtreeModified", arguments.callee);
      }
    });
  }

  let sortDirection = "asc";

  function sortTable(columnIndex) {
    const table = document.querySelector("table");
    const rows = Array.from(table.querySelectorAll("tr"));

    rows.sort((rowA, rowB) => {
      if (rowA.rowIndex === 0 || rowB.rowIndex === 0) {
        return 0;
      }

      const cellA = rowA.querySelectorAll("td")[columnIndex].textContent;
      const cellB = rowB.querySelectorAll("td")[columnIndex].textContent;
      return sortDirection === "asc"
        ? cellA.localeCompare(cellB)
        : cellB.localeCompare(cellA);
    });

    rows.forEach((row) => table.appendChild(row));

    sortDirection = sortDirection === "asc" ? "desc" : "asc";

    // Remove the highlight from all cells
    table
      .querySelectorAll("td")
      .forEach((cell) => cell.classList.remove("highlight"));

    // Add the highlight to the sorted column
    table
      .querySelector(`tr:nth-child(2) td:nth-child(${columnIndex + 1})`)
      .classList.add("highlight");

    // Add the formatting back to the header row
    table.querySelector("tr:nth-child(2)").style.backgroundColor = "#16336D";
    table.querySelector("tr:nth-child(2)").style.color = "white";
    table.querySelector("tr:nth-child(2)").style.textAlign = "center";
    table.querySelector("tr:nth-child(2)").style.wordWrap = "break-word";
    table.querySelector("tr:nth-child(2)").style.position = "sticky";
    table.querySelector("tr:nth-child(2)").style.top = "0";
    table.querySelector("tr:nth-child(2)").style.zIndex = "1";
    table.querySelector("tr:nth-child(2)").style.marginTop = "20px";
    table.querySelector("tr:nth-child(2)").style.verticalAlign = "inherit";
    table.querySelector("tr:nth-child(2)").style.fontWeight = "bold";

    const headerRow = table.querySelector("tr:nth-child(2)");
    const headerCells = headerRow.querySelectorAll("td");
    headerCells.forEach((cell) =>
      cell.classList.remove("headerSortUp", "headerSortDown")
    );
    const headerCell = headerCells[columnIndex];
    headerCell.classList.add(
      sortDirection === "asc" ? "headerSortUp" : "headerSortDown"
    );
  }

  const firstRowCells = $j("#tableOutput table tr:nth-child(2)").find("td");
  firstRowCells.each((index, cell) => {
    if (index === 0) {
      return;
    }

    cell.onclick = () => sortTable(index);
  });

  createTable();

  document.addEventListener("DOMSubtreeModified", function (event) {
    if (event.target.id === "tableOutput") {
      createSelects();
      document.removeEventListener("DOMSubtreeModified", arguments.callee);
    }
  });

  $j(window).resize(function () {
    // Calculate the final font size
    // to be 8% of the window width
    let size = $j(window).width() * 0.007;

    // Use the css() method to set the
    // font-size to all the elements on
    // the page
    $j("#tableOutput td").css("font-size", size + "px");
  });

  //]]>
</script>
<style type="text/css">
  #dashboardHeadID {
    outline: none;
  }

  .highlight {
    background-color: #66717e;
    color: white;
    text-align: center;
    word-wrap: break-word;
    position: sticky;
    top: 0;
    z-index: 1;
    margin-top: 20px;
    vertical-align: inherit;
    font-weight: bold;
  }

  #tableOutput tr:nth-child(even) {
    background-color: #f2f2f2;
  }

  #tableOutput td,
  #tableoutput th {
    padding: 10px;
    white-space: word-wrap; /* This will prevent the text from wrapping */
    text-align: center;
    height: 30px;
    font-size: 11px;
    margin: 10px;
  }

  #tableOutput {
    overflow-x: auto;
    height: 1000px;
    width: 90vw;
  }

  #tableOutput table {
    font-family: Arial, Helvetica, sans-serif;
    table-layout: fixed;
    border-spacing: 0;
    margin-top: 15px;
    width: 100%;
  }

  #element_1_1_1 {
    overflow-x: visible;
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
  }

  #tableOutput td,
  th {
    border-left: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    padding: 10px;
    min-height: 80px !important;
  }

  #tableOutput tr:nth-child(even) {
    background-color: #f2f2f2;
  }

  #tableOutput tr:first-child {
    background-color: #16336d;
    color: white;
    text-align: center;
    word-wrap: break-word;
    position: sticky;
    top: 0;
    z-index: 1;
    margin-top: 20px;
    vertical-align: inherit;
  }

  #tableOutput tr {
    height: auto !important; /* remove fixed height */
    padding-top: 1px; /* add some padding */
    padding-bottom: 1px; /* add some padding */
  }

  .inLine div {
    display: inline-block;
  }
  .customButton {
    padding: 20px;
    font-family: "Roboto";
    font-weight: bold;
    border-radius: 5px;
    color: #222;
    cursor: pointer;
    border: 1px solid #ccc;
    display: inline-block;
    width: 200px;
    height: auto;
    margin: 0 5px;
    min-height: 100px;
    max-height: 100px;
  }

  #toggler1.clicked {
    background-color: #d7f6fa;
  }

  #toggler2.clicked {
    background-color: #d7f6fa;
  }

  #toggler3.clicked {
    background-color: #d7f6fa;
  }

  #buttonDiv {
    margin: 10px;
  }

  .popup-content {
    background-color: white;
    border: 1px solid black;
    padding: 20px;
  }

  .close {
    float: right;
    font-size: 28px;
    font-weight: bold;
  }

  .recordTitle {
    width: 100%;
    border-bottom: 1px solid #ccc;
    padding: 5px;
    background: #16336d;
    color: #fff;
    font-size: 1.5em;
    display: flex;
    flex-direction: column;
  }

  @media only screen and (max-width: 480px) {
    /* horizontal scrollbar for tables if mobile screen */
    .tablemobile {
      overflow-x: auto;
      display: block;
    }
  }

  .headerSortDown:after,
  .headerSortUp:after {
    content: " ";
    position: relative;
    left: 2px;
    border: 8px solid transparent;
  }

  .headerSortDown:after {
    top: 10px;
    border-top-color: silver;
  }

  .headerSortUp:after {
    bottom: 15px;
    border-bottom-color: silver;
  }

  .headerSortDown,
  .headerSortUp {
    padding-right: 10px;
  }
  .customCloseButton {
    padding: 20px;
    font-family: "Roboto";
    font-weight: bold;
    border-radius: 5px;
    color: #222;
    cursor: pointer;
    border: 1px solid #ccc;
    display: inline;
    margin: 0 5px;
  }

  *:focus {
    outline: none;
  }
</style>
<h1>Search by</h1>

<div class="inLine">
  <div id="instructingEntity">&nbsp;</div>

  <div id="categoriesOfWork">&nbsp;</div>

  <div id="instructingOfficer">&nbsp;</div>

  <div id="region">&nbsp;</div>

  <div id="both">&nbsp;</div>

  <div id="both2">&nbsp;</div>

  <div id="both3">&nbsp;</div>

  <div id="both4">&nbsp;</div>
</div>

<div id="tableOutput">&nbsp;</div>
