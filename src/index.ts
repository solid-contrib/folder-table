/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// eslint-disable-next-line no-undef
const FolderTable = require("./folderTable").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const $rdf = UI.rdf;

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
  const display = dom.getElementById("folderTableArea");
  display.innerHTML = "";
  display.appendChild(paneDiv);
}
document.addEventListener("DOMContentLoaded", function () {
  const UI = panes.UI;
  const $rdf = UI.rdf;
  const dom = document;
  $rdf.Fetcher.crossSiteProxyTemplate = self.origin + "/xss?uri={uri}";
  var uri = window.location.href;
  window.document.title = "Data browser: " + uri;
  var kb = UI.store;
  //  var outliner = panes.getOutliner(dom)

  async function go(event) {
    let uri = $rdf.uri.join(uriField.value, window.location.href);
    console.log("User field " + uriField.value);
    console.log("User requests " + uri);

    const params = new URLSearchParams(location.search);
    params.set("uri", uri);
    window.history.replaceState({}, "", `${location.pathname}?${params}`);

    var subject = kb.sym(uri);
    await UI.authn.checkUser();
    appendFolderTable(dom, uri);
    // outliner.GotoSubject(subject, true, undefined, true, undefined);
    mungeLoginArea();
  }

  const uriField = dom.getElementById("uriField");
  const goButton = dom.getElementById("goButton");
  const loginButtonArea = document.getElementById("loginButtonArea");
  const webIdArea = dom.getElementById("webId");
  const banner = dom.getElementById("inputArea");

  uriField.addEventListener(
    "keyup",
    function (e) {
      if (e.keyCode === 13) {
        go(e);
      }
    },
    false
  );

  goButton.addEventListener("click", go, false);
  let initial = new URLSearchParams(self.location.search).get("uri");
  if (initial) {
    uriField.value = initial;
    go();
  } else {
    console.log("ready for user input");
  }
  async function mungeLoginArea() {
    loginButtonArea.innerHTML = "";
    if (uriField.value)
      loginButtonArea.appendChild(UI.authn.loginStatusBox(document, null, {}));
    if (UI.authn.authSession && UI.authn.authSession.info.isLoggedIn) {
      const logoutButton = loginButtonArea.querySelector("input");
      logoutButton.value = "Logout";
      let displayId = `&lt;${UI.authn.authSession.info.webId}>`;
      webIdArea.innerHTML = displayId;
      banner.style.backgroundColor = "#bbccbb";
    } else {
      banner.style.backgroundColor = "#ccbbbb";
    }
    loginButtonArea.style.display = "inline-block";
  }
  if (UI.authn.authSession) {
    UI.authn.authSession.onLogin(() => {
      mungeLoginArea();
      go();
    });
    UI.authn.authSession.onLogout(() => {
      mungeLoginArea();
      webIdArea.innerHTML = "public user";
      go();
    });
    UI.authn.authSession.onSessionRestore((url) => {
      mungeLoginArea();
      go();
    });
  }
  mungeLoginArea();
});
