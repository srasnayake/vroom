<script>
  //<![CDATA[

  var currentAuth;

  var siteParams = new URLSearchParams(window.location.search);
  var globalSiteID = siteParams.get("metaData.siteID");

  // Enter the API Client details in the variables below.
  var client_id = "";
  var client_secret = "";

  // Enter the base URL of your instance in the variable below.
  var instanceBaseURL = "";

  instanceBaseURL =
    instanceBaseURL[instanceBaseURL.length - 1] == "/"
      ? instanceBaseURL
      : instanceBaseURL + "/";

  var instanceBaseAPIURL = instanceBaseURL + "api/";

  var keycount = 0;
  var notesInterval = [];
  //
  // Define the iSheets and columns you would like to include below.
  // The order of the iSheets and their columns is the order in which they will be displayed on the page.
  //
  var iSheetDefinitions = {
    iSheets: {
      "Instruction Form": {
        columns: {
          // The two columns listed below will populate the filter dropdown lists
          "Instructing entity": {},
          "Categories of work": {},

          "Has contact with solicitors for the seller been made?": {},
          "Notes on the enquiries made": { parentCol: "Enquiries raised" },
          "Exchange of Contracts": {},
          "Completion date of exchange of contracts (if known)": {
            parentCol: "Exchange of Contracts",
          },
          "Transfer Agreed": {},
          "LDA obtained": {},
          "Notes on LDA obtainment": { parentCol: "LDA obtained" },
          "Executed documents received": {},
          "Notes on executed documents received": {
            parentCol: "Executed documents received",
          },
          "Completion monies received (if relevant)": {},
          "Notes on the completion monies received": {
            parentCol: "Completion monies received (if relevant)",
          },
        },
        view: {
          name: "My Milestones",
          id: "",
        },
      },
    },
  };

  var iSheetObjects = [];

  class iSheetObj {
    constructor(title, id) {
      currentAuth.checkAuth();

      this.title = title;
      this.id = id;

      this.parser = new DOMParser();
      this.headers = new Headers();
      this.headers.append(
        "Authorization",
        "Bearer " + currentAuth.getCookie("APIAccess")
      );

      this.addTable();
      this.getData();
    }
    async getData() {
      let reqOptions = {
        headers: this.headers,
        method: "GET",
      };

      let reqURL =
        instanceBaseAPIURL +
        "3/isheet/" +
        this.id +
        "/items?limit=2000&sheetviewid=" +
        iSheetDefinitions.iSheets[this.title].view.id;

      let response = await fetch(reqURL, reqOptions);
      let data = await response.text();
      let xmlDoc = this.parser.parseFromString(data, "text/xml");

      console.log(xmlDoc);

      let items = xmlDoc.getElementsByTagName("item");
      let headCols = xmlDoc.getElementsByTagName("headcolumn");

      console.log(headCols);

      iSheetDefinitions.iSheets[this.title]["linkColumns"] = [];

      for (var col in headCols) {
        if (col == "length") {
          break;
        }

        switch (headCols[col].getAttribute("columntypeid")) {
          case "7":
            iSheetDefinitions.iSheets[this.title]["linkColumns"].push(
              headCols[col].getAttribute("columnid")
            );
            break;
          default:
            break;
        }
      }

      iSheetDefinitions.iSheets[this.title].items = [];

      for (var item in items) {
        if (item == "length") {
          break;
        }

        iSheetDefinitions.iSheets[this.title].items.push(
          new itemObj(this.id, this.title, items[item])
        );
      }
    }

    addTable() {
      $j("#noteSlider").html("");
    }
  }

  function filterObj(obj, colMatch) {
    var returnArr = [];

    for (var col in obj) {
      if (obj[col].parentCol == colMatch) {
        returnArr.push(col);
        obj[col].parentColID = obj[colMatch].id;
      }
    }

    return returnArr;
  }

  class itemObj {
    constructor(iSheetID, iSheetName, item) {
      this.iSheetID = iSheetID;
      this.iSheetName = iSheetName;
      this.iSheetColIDs = [];
      this.iSheetChoiceColIDs = [];
      for (var col in iSheetDefinitions.iSheets[this.iSheetName].columns) {
        this.iSheetColIDs.push(
          iSheetDefinitions.iSheets[this.iSheetName].columns[col].id
        );
        if (iSheetDefinitions.iSheets[this.iSheetName].columns[col].choices) {
          this.iSheetChoiceColIDs.push(
            iSheetDefinitions.iSheets[this.iSheetName].columns[col].id
          );
        }

        let childrenCols = filterObj(
          iSheetDefinitions.iSheets[this.iSheetName].columns,
          col
        );

        if (childrenCols.length > 0) {
          iSheetDefinitions.iSheets[this.iSheetName].columns[col].childrenCols =
            childrenCols;
        }
      }

      this.itemID = item.getAttribute("itemid");

      this.rawItem = item;

      this.rawCols = this.rawItem.getElementsByTagName("column");

      this.filterCols();
    }

    filterCols() {
      const newItem = {};

      for (var col in this.rawCols) {
        if (col == "length") {
          break;
        }

        let thisColID = this.rawCols[col].getAttribute("attributecolumnid");

        if (this.iSheetColIDs.includes(thisColID)) {
          newItem[thisColID] = {};

          if (this.iSheetChoiceColIDs.includes(thisColID)) {
            newItem[thisColID].type = "choice";
            newItem[thisColID].value = [];

            let thisChoices = this.rawCols[col]
              .getElementsByTagName("displaydata")[0]
              .getElementsByTagName("choice");

            for (var choice in thisChoices) {
              if (choice == "length") {
                break;
              }
              newItem[thisColID].value.push(
                $j(thisChoices[choice]).children("label").text()
              );
            }
          } else if (
            iSheetDefinitions.iSheets[this.iSheetName]["linkColumns"].includes(
              thisColID
            )
          ) {
            if (
              this.rawCols[col].getElementsByTagName("displaydata")[0]
                .textContent
            ) {
              newItem[thisColID].value = this.rawCols[col]
                .getElementsByTagName("displaydata")[0]
                .getElementsByTagName("linkdisplayurl")[0].textContent;
            }
          } else {
            newItem[thisColID].value =
              this.rawCols[col].getElementsByTagName(
                "displaydata"
              )[0].textContent;
          }
        }
      }

      this.processedItem = newItem;

      this.HTMLAppendSelf(newItem);
    }

    HTMLAppendSelf(item) {
      let htmlNote =
        "<div class='iSheetRecord' tabindex='1' id='noteItem" +
        this.itemID +
        "'><div class='recordTitle'></div></div>";
      $j("#noteSlider").append(htmlNote);

      const notesCols = [];

      for (var col in iSheetDefinitions.iSheets[this.iSheetName].columns) {
        if (
          col ==
          Object.keys(iSheetDefinitions.iSheets[this.iSheetName].columns)[0]
        ) {
          let itemLink =
            instanceBaseURL +
            "sheetHome.action?metaData.siteID=" +
            globalSiteID +
            "&metaData.sheetId=" +
            this.iSheetID +
            "&metaData.itemId=" +
            this.itemID +
            "&metaData.sheetViewID=" +
            iSheetDefinitions.iSheets[this.iSheetName].view.id;
          let htmlAppend =
            "<div><a href='" +
            itemLink +
            "'>" +
            item[iSheetDefinitions.iSheets[this.iSheetName].columns[col].id]
              .value +
            "&nbsp;&nbsp;&nbsp;<span class='material-symbols-outlined' style='font-size:1em;line-height:inherit;'>link</span></a></div>";
          $j("#noteItem" + this.itemID + " > .recordTitle").prepend(htmlAppend);
        } else if (
          col ==
          Object.keys(iSheetDefinitions.iSheets[this.iSheetName].columns)[1]
        ) {
          let htmlAppend =
            "<div>" +
            item[iSheetDefinitions.iSheets[this.iSheetName].columns[col].id]
              .value +
            "</div>";
          $j("#noteItem" + this.itemID + " > .recordTitle").append(htmlAppend);
        } else if (
          this.iSheetChoiceColIDs.includes(
            iSheetDefinitions.iSheets[this.iSheetName].columns[col].id
          )
        ) {
          let choiceVal =
            item[iSheetDefinitions.iSheets[this.iSheetName].columns[col].id]
              .value;

          if (choiceVal == "") {
            choiceVal = "Unanswered";
          }

          if (
            iSheetDefinitions.iSheets[this.iSheetName].columns[col].childrenCols
          ) {
            var notesRowHTMLInsert = "<div class='recordNotesRow'></div>";
          } else {
            var notesRowHTMLInsert = "";
          }

          let htmlAppend =
            "<div class='recordYNRow' id='itemCol" +
            this.itemID +
            iSheetDefinitions.iSheets[this.iSheetName].columns[col].id +
            "'><div><div>" +
            col +
            "</div>" +
            notesRowHTMLInsert +
            "</div><div class='record" +
            choiceVal +
            "'>" +
            choiceVal +
            "</div></div>";
          $j("#noteItem" + this.itemID).append(htmlAppend);
        } else if (
          iSheetDefinitions.iSheets[this.iSheetName].columns[col].parentCol
        ) {
          let notesColPush = [
            iSheetDefinitions.iSheets[this.iSheetName].columns[col],
            item[iSheetDefinitions.iSheets[this.iSheetName].columns[col].id]
              .value,
          ];
          notesCols.push(notesColPush);
        } else {
          let columnVal =
            item[iSheetDefinitions.iSheets[this.iSheetName].columns[col].id]
              .value;
          columnVal = columnVal.replaceAll(/\n/g, "<br>");
          console.log(columnVal);
          let htmlAppend =
            "<div class='recordNotesRow'>" + columnVal + "</div>";

          if (columnVal) {
            console.log(columnVal);
            $j("#noteItem" + this.itemID).append(htmlAppend);
          }
        }
      }

      for (var notes in notesCols) {
        let thisNotesVal = notesCols[notes][1];
        thisNotesVal = thisNotesVal.replaceAll(/\n/g, "<br>");
        console.log(notesCols);
        console.log(thisNotesVal);
        $j(
          "#itemCol" +
            this.itemID +
            notesCols[notes][0].parentColID +
            " .recordNotesRow"
        ).append(thisNotesVal);
      }

      initialiseNotesListeners();
    }
  }

  class authVerification {
    constructor() {}

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
        mode: "cors",
      };

      var accessCode = "";

      let response = await fetch(
        instanceBaseURL +
          "authorize.action?response_type=code&client_id=" +
          client_id +
          "&redirect_uri=" +
          instanceBaseURL +
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
      // Client Secret
      urlencoded.append("client_secret", client_secret);
      urlencoded.append("code", code);

      var requestOptions = {
        method: "POST",
        headers: headers,
        body: urlencoded,
        redirect: "follow",
      };

      let response = await fetch(
        instanceBaseAPIURL + "oauth2/token",
        requestOptions
      );
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

  currentAuth = new authVerification();
  currentAuth.checkAuth();

  async function getViews(iSheetID, iSheetName) {
    await currentAuth.checkAuth();

    let reqHeaders = new Headers();
    reqHeaders.append(
      "Authorization",
      "Bearer " + currentAuth.getCookie("APIAccess")
    );

    let reqOptions = {
      headers: reqHeaders,
      method: "GET",
    };

    let reqURL = instanceBaseAPIURL + "3/isheets/admin/" + iSheetID + "/views";

    let response = await fetch(reqURL, reqOptions);

    while (!response.ok) {
      response = await fetch(reqURL, reqOptions);
    }

    let data = await response.text();

    let parser = new DOMParser();

    let xmlDoc = parser.parseFromString(data, "text/xml");

    console.log(xmlDoc);

    $j(xmlDoc)
      .find("isheetview")
      .each(function () {
        console.log($j(this).find("title").text());

        if (
          $j(this).find("title").text() ==
          iSheetDefinitions.iSheets[iSheetName].view.name
        ) {
          iSheetDefinitions.iSheets[iSheetName].view.id = $j(this)
            .find("viewid")
            .text();
        }
      });
    return;
  }

  async function defineiSheets() {
    await currentAuth.checkAuth();

    let reqHeaders = new Headers();
    reqHeaders.append(
      "Authorization",
      "Bearer " + currentAuth.getCookie("APIAccess")
    );

    let reqOptions = {
      headers: reqHeaders,
      method: "GET",
      mode: "cors",
    };

    console.log(globalSiteID);
    var reqURL = `${instanceBaseAPIURL}3/isheets?siteid=${globalSiteID}`;

    let response = await fetch(reqURL, reqOptions);

    if (client_id && client_secret && instanceBaseURL) {
      while (!response.ok) {
        response = await fetch(reqURL, reqOptions);
        console.log(response.status);
        //alert("Issue with request");
      }
    } else {
      alert(
        "Please check that API and instance details are entered correctly."
      );
    }

    let data = await response.text();

    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(data, "text/xml");

    console.log(xmlDoc);

    console.log(xmlDoc.getElementsByTagName("isheets")[0].childNodes);

    let isheetsList = xmlDoc.getElementsByTagName("isheets")[0].childNodes;

    //
    //  Loop to acquire isheet IDs from the current site based on the sheet names stored in the iSheet Definitions object.
    //  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/  \/
    for (var sheet in isheetsList) {
      for (var sheet2 in Object.keys(iSheetDefinitions.iSheets)) {
        if (
          $j(isheetsList[sheet]).find("name").text() ==
          Object.keys(iSheetDefinitions.iSheets)[sheet2]
        ) {
          console.log($j(isheetsList[sheet]).find("id").text());
          iSheetDefinitions.iSheets[
            Object.keys(iSheetDefinitions.iSheets)[sheet2]
          ].id = $j(isheetsList[sheet]).find("id").text();
          console.log(iSheetDefinitions);

          await getViews(
            iSheetDefinitions.iSheets[
              Object.keys(iSheetDefinitions.iSheets)[sheet2]
            ].id,
            Object.keys(iSheetDefinitions.iSheets)[sheet2]
          );
        }
      }
      if (sheet > isheetsList.length - 2) {
        break;
      }
    }

    console.log(Object.keys(iSheetDefinitions.iSheets));

    $j("#instructingEnt").html(
      '<option value="" selected>Select Instructing Entity</option>'
    );
    $j("#workType").html('<option value="" selected>Select Work Type</option>');

    for (var sheet in Object.keys(iSheetDefinitions.iSheets)) {
      reqURL =
        instanceBaseAPIURL +
        "3/isheets/admin/" +
        iSheetDefinitions.iSheets[Object.keys(iSheetDefinitions.iSheets)[sheet]]
          .id +
        "/columns";
      let response = await fetch(reqURL, reqOptions);
      let data = await response.text();
      let xmlDoc = parser.parseFromString(data, "text/xml");

      let colsList = xmlDoc.getElementsByTagName("columns")[0].childNodes;

      for (var col in colsList) {
        let thisCols = Object.keys(
          iSheetDefinitions.iSheets[
            Object.keys(iSheetDefinitions.iSheets)[sheet]
          ].columns
        );
        for (var col2 in thisCols) {
          if ($j(colsList[col]).find("name").text() == thisCols[col2]) {
            iSheetDefinitions.iSheets[
              Object.keys(iSheetDefinitions.iSheets)[sheet]
            ].columns[thisCols[col2]].id = $j(colsList[col])
              .children("columnid")
              .text();

            if ($j(colsList[col]).find("type").text() == "3") {
              let choices = colsList[col].getElementsByTagName("choice");

              iSheetDefinitions.iSheets[
                Object.keys(iSheetDefinitions.iSheets)[sheet]
              ].columns[thisCols[col2]].choices = {};

              for (var choice in choices) {
                let thisChoice = $j(choices[choice]).find("label").text();
                let thisChoiceID = $j(choices[choice]).find("id").text();

                let thisChoices =
                  iSheetDefinitions.iSheets[
                    Object.keys(iSheetDefinitions.iSheets)[sheet]
                  ].columns[thisCols[col2]].choices;

                thisChoices[thisChoice] = thisChoiceID;

                if (
                  Object.keys(thisChoices).includes("Yes") &&
                  Object.keys(thisChoices).includes("No")
                ) {
                  iSheetDefinitions.iSheets[
                    Object.keys(iSheetDefinitions.iSheets)[sheet]
                  ].columns[thisCols[col2]].choicesType = "YN";
                } else {
                  let thisHTMLOption = "";

                  switch (thisCols[col2]) {
                    case Object.keys(
                      iSheetDefinitions.iSheets[
                        Object.keys(iSheetDefinitions.iSheets)[sheet]
                      ].columns
                    )[0]:
                      console.log(thisCols[col2]);
                      thisHTMLOption =
                        "<option value='" +
                        thisChoice +
                        "'>" +
                        thisChoice +
                        "</option>";
                      $j("#instructingEnt").append(thisHTMLOption);
                      break;
                    case Object.keys(
                      iSheetDefinitions.iSheets[
                        Object.keys(iSheetDefinitions.iSheets)[sheet]
                      ].columns
                    )[1]:
                      console.log(thisCols[col2]);
                      thisHTMLOption =
                        "<option value='" +
                        thisChoice +
                        "'>" +
                        thisChoice +
                        "</option>";
                      $j("#workType").append(thisHTMLOption);
                      break;
                    default:
                      break;
                  }
                }

                if (choice == choices.length - 1) {
                  break;
                }
              }
            }
          }
        }
        if (col > colsList.length - 2) {
          break;
        }
      }
    }
  }

  async function retrieveiSheets() {
    currentAuth.checkAuth();

    let reqHeaders = new Headers();
    reqHeaders.append(
      "Authorization",
      "Bearer " + currentAuth.getCookie("APIAccess")
    );

    let reqOptions = {
      headers: reqHeaders,
      method: "GET",
    };

    for (var sheet in iSheetDefinitions.iSheets) {
      iSheetObjects.push(
        new iSheetObj(sheet, iSheetDefinitions.iSheets[sheet].id)
      );
    }
  }

  defineiSheets().then(() => retrieveiSheets());

  async function updateNotes(element) {
    return;
    console.log(element);

    var thisTextarea = element.children("textarea");

    var thisiSheetID = thisTextarea.attr("isheetid");
    var thisColumnID = thisTextarea.attr("columnid");
    var thisItemID = element.attr("id").slice(8);
    var thisNoteContent = thisTextarea.val();

    console.log(thisiSheetID + " " + thisColumnID + " " + thisItemID);

    await currentAuth.checkAuth();

    var reqHeaders = new Headers();
    reqHeaders.append(
      "Authorization",
      "Bearer " + currentAuth.getCookie("APIAccess")
    );
    reqHeaders.append("Content-Type", "application/xml");

    var noteColumnXML =
      "<column attributecolumnid='" +
      thisColumnID +
      "'><rawdata><value>" +
      thisNoteContent +
      "</value></rawdata></column>";
    var raw =
      "<?xml version='1.0' encoding='UTF-8'?><isheet><data><item>" +
      noteColumnXML +
      "</item></data></isheet>";

    var reqOptions = {
      headers: reqHeaders,
      method: "PUT",
      body: raw,
    };

    var reqURL =
      instanceBaseAPIURL + "3/isheet/" + thisiSheetID + "/items/" + thisItemID;

    var response = await fetch(reqURL, reqOptions);

    var data = await response.text();
    console.log(data);
  }

  function initialiseNotesListeners() {
    $j(".activeRecord").removeClass("activeRecord");
    $j(".iSheetRecord:first-child").addClass("activeRecord");

    for (var interval in notesInterval) {
      clearInterval(notesInterval[interval]);
      notesInterval[interval] = null;
      notesInterval.length = 0;
    }

    notesInterval.push(
      setInterval(() => updateNotes($j(".activeRecord")), 10000)
    );

    $j(".iSheetRecord").click(function (event) {
      event.stopImmediatePropagation();

      for (var interval in notesInterval) {
        clearInterval(notesInterval[interval]);
        notesInterval[interval] = null;
        notesInterval.length = 0;
      }

      $j(".activeRecord").removeClass("activeRecord");
      $j(this).addClass("activeRecord");

      if ($j(this).index() == 0) {
        document.getElementById("noteSlider").style.marginLeft = "0px";
      } else {
        document.getElementById("noteSlider").style.marginLeft =
          "-" + $j(this).position().left + "px";
      }

      notesInterval.push(
        setInterval(() => updateNotes($j(".activeRecord")), 10000)
      );
    });

    $j(".iSheetRecord").keyup(function (event) {
      event.stopImmediatePropagation();

      if (event.which == 9) {
        for (var interval in notesInterval) {
          clearInterval(notesInterval[interval]);
          notesInterval[interval] = null;
          notesInterval.length = 0;
        }

        if ($j(this).index() == 0) {
          document.getElementById("noteSlider").style.marginLeft = "0px";
        } else {
          document.getElementById("noteSlider").style.marginLeft =
            "-" +
            $j(
              ".iSheetRecord:nth-child(" + ($j(this).index() + 1) + ")"
            ).position().left +
            "px";
        }

        updateNotes($j(".activeRecord"));

        $j(".activeRecord").removeClass("activeRecord");
        $j(this).addClass("activeRecord");

        notesInterval.push(
          setInterval(() => updateNotes($j(".activeRecord")), 10000)
        );

        keycount = 0;
      } else if (keycount > 20) {
        console.log("Keycount reached!");
        updateNotes($j(".activeRecord"));

        for (var interval in notesInterval) {
          clearInterval(notesInterval[interval]);
          notesInterval[interval] = null;
          notesInterval.length = 0;
        }
        notesInterval.push(
          setInterval(() => updateNotes($j(".activeRecord")), 10000)
        );

        keycount = 0;
      } else {
        keycount++;
      }
    });

    $j(".cardSearchDropdown").change(function (event) {
      event.stopImmediatePropagation();

      $j(".iSheetRecord").each(function (index) {
        console.log($j(this).children(".recordTitle").html().toUpperCase());
        console.log($j("#instructingEnt").val().toUpperCase());
        console.log(("<div>" + $j("#workType").val() + "</div>").toUpperCase());

        let instructEntRegex = new RegExp(
          `<div><a.*">${$j("#instructingEnt").val()}.*<\/a>.*`
        );
        console.log(instructEntRegex);
        console.log(
          instructEntRegex.test($j(this).children(".recordTitle").html())
        );

        let instructingEntCheck =
          instructEntRegex.test($j(this).children(".recordTitle").html()) ||
          !$j("#instructingEnt").val();

        let workTypeCheck =
          $j(this)
            .children(".recordTitle")
            .html()
            .toUpperCase()
            .includes(
              ("<div>" + $j("#workType").val() + "</div>").toUpperCase()
            ) || !$j("#workType").val();

        if (instructingEntCheck && workTypeCheck) {
          $j(this).show();
          $j(this).addClass("searchPositive");
          $j(".activeRecord").removeClass("activeRecord");
          $j(".searchPositive").first().addClass("activeRecord");
          document.getElementById("noteSlider").style.marginLeft = "0px";
        } else {
          $j(this).hide();
          $j(this).removeClass("searchPositive");
        }
      });
    });
  }

  $j(document).ready(() => {
    initialiseNotesListeners();
  });
  //]]>
</script>
<!-- 
  Within the CSS below, the element referenced with "#element_1_1_2" may need modifying, depending on the number of content editors that sit before it on the page.
  If there is only one content editor sitting above it (a content editor for the page banner, perhaps) then this element ID should be fine.
-->
<style type="text/css">
  body {
    overflow-x: hidden;
  }

  #element_1_1_2 {
    overflow-x: visible;
  }

  .tablesContainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    overflow-x: visible;
  }

  .tablesContainer > div {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow-x: scroll;
    width: 100vw;
    padding: 30px;
  }

  .tablesContainer table {
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-spacing: 0;
    border-radius: 5px;
    overflow: hidden;
    border-collapse: separate;

    height: 1000px;
  }

  .tablesContainer table tr {
    border: 0;
  }

  .tablesContainer td,
  .tablesContainer th {
    padding: 5px;
    border-bottom: 1px solid #ccc;

    min-width: 100px;
  }

  .tablesContainer th:first-child,
  .tablesContainer td:first-child,
  .tablesContainer th:nth-child(2),
  .tablesContainer td:nth-child(2) {
    min-width: 200px;
  }

  .tablesContainer td:nth-child(2) {
    border-right: 2px solid #ccc;
  }

  .tablesContainer th {
    background: #16336d;
    color: #fff;
    position: sticky;
    top: 0;
  }

  #notesInterface {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    scroll-behavior: smooth;

    gap: 20px;
  }
  #notesInterface h1 {
    margin: 0;
    font-weight: bold;
  }
  #noteSlider {
    display: flex;
    position: relative;
    gap: 30px;
    align-items: flex-start;

    transition: all 0.5s;
  }

  #cardSearch {
    outline: none;
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 4px;
    line-height: initial !important;
  }

  .iSheetRecord {
    min-width: 800px;
    border: 1px solid #ccc;
    box-sizing: border-box;

    border-radius: 5px;
    overflow: hidden;
    opacity: 0.3;

    transition: all 0.3s;
  }
  .iSheetRecord:focus {
    outline: none;
  }
  .iSheetRecord:hover {
    border-color: #ffbb0e;
  }
  .activeRecord {
    opacity: 1;
    cursor: default;
  }
  .iSheetRecord .recordTitle {
    width: 100%;
    border-bottom: 1px solid #ccc;
    padding: 10px;
    background: #16336d;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
    font-size: 1.5em;

    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .iSheetRecord .recordTitle > div {
    width: 100%;
    font-weight: normal;
  }
  .iSheetRecord .recordTitle > div a {
    color: #fff;
  }

  .iSheetRecord .recordTitle > div:first-child {
    font-weight: bold;
  }

  .iSheetRecord .recordNotes {
    width: 100%;
    min-height: 40vh;
    border: 0;
    outline: none;
    vertical-align: top;
    padding: 20px;
    cursor: pointer;
  }
  .iSheetRecord .recordLink {
    width: 100%;
    border-bottom: 1px solid #ccc;
    padding: 10px;
    background: #cb3727;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
  }
  .iSheetRecord .recordLink a {
    color: #fff;
  }
  .iSheetRecord .recordDesc {
    width: 100%;
    border-bottom: 1px solid #ccc;
    padding: 10px;
    background: #14a58f;
    color: #fff;
    font-weight: bold;
    cursor: pointer;
  }
  .activeRecord .recordTitle,
  .activeRecord .recordLink,
  .activeRecord .recordDesc,
  .activeRecord .recordNotes {
    cursor: default;
  }
  .activeRecord .recordNotes {
    cursor: text;
  }
  .iSheetRecord .recordNotes:focus {
    background: #fff;
    box-shadow: none;
  }

  .recordYNRow {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
  }
  .recordYNRow > div {
    padding: 10px;
    border-top: 1px solid #ccc;
  }
  .recordYNRow > div:first-child {
    width: 80%;
  }
  .recordYNRow > div:first-child > div:first-child {
    font-weight: bold;
  }
  .recordYNRow > div:last-child {
    width: 20%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .recordYes {
    background: #14a58f;
    border-top: 1px solid #14a58f;
    color: #fff;
  }
  .recordNo {
    background: #cb3727;
    border-top: 1px solid #cb3727;
    color: #fff;
  }
  .recordUnanswered {
    border: 2px dashed #ffbb0e !important;
    font-weight: bold;
  }

  .recordNotesRow {
    padding: 10px;
  }

  #cardFilterOptions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
  }
  #cardFilterOptions h1 {
    grid-column: span 3;
  }

  .cardSearchDropdown {
    border: 1px solid #ccc;
    padding: 10px;
    padding-right: 20px;
    border-radius: 5px;
    background-image: url(https://ukwbd.highq.com/clientnetuk//images/select-arrow.png) !important;
  }

  .YNCol {
    background: yellow;
  }

  #dashboardHeadID {
    outline: none;
  }
</style>
<link
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@40,400,0,0"
  rel="stylesheet"
/>

<div id="notesInterface">
  <div id="cardFilterOptions">
    <h1>Filter cards</h1>
    <select class="cardSearchDropdown" id="instructingEnt">
      <option disabled="disabled" selected="selected" value="">
        Select instructing entity
      </option>
      <option value="Test1">Test Option 1</option>
      <option value="Test2">Test Option 2</option>
    </select>
    <select class="cardSearchDropdown" id="workType">
      <option disabled="disabled" selected="selected" value="">
        Select Work Type
      </option>
      <option value="Test1">Test Option 1</option>
      <option value="Test2">Test Option 2</option>
    </select>
  </div>

  <div id="noteSlider"></div>
</div>
