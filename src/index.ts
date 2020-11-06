/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// eslint-disable-next-line no-undef
const FolderTable = require("./folderTable").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const $rdf = require("rdflib");
import UI from "solid-ui";
import SolidAuth from "solid-auth-client";

async function appendFolderTable(dom, uri) {
  const subject = $rdf.sym(uri);
  const doc = subject.doc();

  await new Promise((resolve, reject) => {
    UI.store.fetcher.load(doc).then(resolve, reject);
  });
  const context = {
    // see https://github.com/solid/solid-panes/blob/005f90295d83e499fd626bd84aeb3df10135d5c1/src/index.ts#L30-L34
    dom,
    session: {
      store: UI.store,
    },
  };
  const options = {};

  const paneDiv = FolderTable.render(subject, context, options);
  dom.body.appendChild(paneDiv);
}

document.addEventListener("DOMContentLoaded", function () {
  // Set up the view for the subject indicated in the fragment of the window's URL
  const uri = decodeURIComponent(window.location.hash.substr(1));
  if (uri.length === 0) {
    window.location.href =
      "?#" + encodeURIComponent("https://michielbdejong.inrupt.net/public/");
  }
  appendFolderTable(document, uri);
});

window.onload = () => {
  console.log("document ready");
  SolidAuth.trackSession((session) => {
    if (!session) {
      console.log("The user is not logged in");
      document.getElementById("loginBanner").innerHTML =
        '<button onclick="popupLogin()">Log in</button>';
    } else {
      console.log(`Logged in as ${session.webId}`);

      document.getElementById(
        "loginBanner"
      ).innerHTML = `Logged in as ${session.webId} <button onclick="logout()">Log out</button>`;
    }
  });
};
(window as any).logout = () => {
  SolidAuth.logout();
  window.location.href = "";
};
(window as any).popupLogin = async function () {
  let session = await SolidAuth.currentSession();
  const popupUri = "https://solid.community/common/popup.html";
  if (!session) {
    session = await SolidAuth.popupLogin({ popupUri });
  }
};
