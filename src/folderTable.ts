/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/*   Folder pane - Table version
 **
 **  This folder table pane lists the members of a folder
 */

import * as UI from "solid-ui";
import { sentimentStrip, actionToolbar } from "./toolbar";

const ns = UI.ns;
const PANE_NAME = "folderTable";

const style = {
  // @@ move to style.js
  paneDivStyle:
    "border-top: solid 1px #777; border-bottom: solid 1px #777; margin: 0.5em;",
  iconStyle: "width: 3em; height: 3em; margin: 0.1em; border-radius: 1em;",
  smallIconStyle:
    "width: 2em; height: 2em; margin: 0.1em; border-radius: 0.5em;",
  // below we have own to reduce padding from 0.7em
  buttonStyle:
    "background-color: #fff; padding: 0.3em 0.7em;  border: .01em solid white;  border-radius:0.2em; font-size: 100%;", // 'background-color: #eef;
};

export default {
  icon: UI.icons.iconBase + "noun_897914.svg", // @@ That looks like a menu, better one with more lines

  name: PANE_NAME,

  // Note no mintNew, as the folderPane already has that functionality
  label: function (subject, context) {
    const kb = context.session.store;
    const n = kb.each(subject, ns.ldp("contains")).length;
    if (n > 0) {
      return "Contents (" + n + ")"; // Show how many in hover text
    }
    if (kb.holds(subject, ns.rdf("type"), ns.ldp("Container"))) {
      // It is declared as being a container
      return "Container (0)";
    }
    return null; // Suppress pane otherwise
  },

  // Render a file folder in a LDP/solid system

  render: function (subject, context) {
    const dom = context.dom;
    const kb = context.session.store;

    function noHiddenFiles(obj) {
      // @@ This hiddenness should actually be server defined
      const pathEnd = obj.uri.slice(obj.dir().uri.length);
      return !(
        pathEnd.startsWith(".") ||
        pathEnd.endsWith(".acl") ||
        pathEnd.endsWith("~")
      );
    }

    function getActionDoc(folder) {
      return kb.sym(folder.uri + ".actions.ttl"); // @@ metadata standards
    }
    /*  Change the view to now reflect a dfferent place,
     **  without totally reloading it.
     ** This changes the subject parameter which was passed in.
     */
    async function navigateTo(destination, event) {
      if (event) event.stopPropagation(); // Prevent normal link-folowwing of the browser
      console.log("navigateto: loading " + destination);
      try {
        await kb.fetcher.load(destination);
      } catch (err) {
        UI.widgets.complain(
          { dom, div },
          `folderTable: Error loading destination ${destination}: ${err}`
        );
      }
      subject = destination;
      refresh();
      console.log("Navigated to " + subject);

      // window.location.href = destination.uri // beware will cause jumo if diff origin
      if (
        context.solo && // We are top level
        dom.defaultView &&
        dom.defaultView.history
      ) {
        const stateObj = { paneName: PANE_NAME };
        try {
          // can fail if different origin
          dom.defaultView.history.pushState(stateObj, subject.uri, subject.uri);
        } catch (e) {
          console.log(e);
        }
      }
    }

    async function loadActionDocumentIfAny() {
      try {
        await kb.fetcher.load(getActionDoc(subject));
      } catch (error) {
        if (error.status !== 404) {
          UI.widgets.complain(userContext, "can't read action data: " + error);
        }
      }
    }
    function folderName(folder) {
      let path = folder.uri.split("/").slice(3); // skip http, gap, domain
      // if (path.length === 0) return '/'
      path = path.reverse();
      return decodeURIComponent(path[0] || path[1] || " / ");
    }

    /* Render one element of breadcrumbs
     */
    function renderBreadcrumb(folder) {
      const ele = dom.createElement("li"); // 20200330b
      const breadcrumbStyle =
        "display: inline; margin: 0.4em; padding: 0.2em; border-radius: 0.2em; background-color: #ddd;";
      ele.style = breadcrumbStyle;
      ele.addEventListener("click", async (event) => navigateTo(folder, event));
      ele.textContent = folderName(folder);
      ele.subject = folder;
      UI.widgets.makeDraggable(ele, folder); // handy to be able to drag them
      return ele;
    }

    function refreshBreadcrumbs() {
      const ancestors = [];
      const uri = subject.uri;
      let p = uri.indexOf("//") + 2;
      p = uri.indexOf("/", p);
      for (p; p > 0; p = uri.indexOf("/", p + 1)) {
        ancestors.push(kb.sym(subject.uri.slice(0, p + 1)));
      }
      // FIXME:
      // UI.utils.syncTableToArrayReOrdered(breadcrumbs, ancestors, renderBreadcrumb)
      UI.utils.syncTableToArray(breadcrumbs, ancestors, renderBreadcrumb);
      const crumbs = breadcrumbs.children;
      for (let i = 0; i < crumbs.length; i++) {
        if (i !== crumbs.length - 1) {
          crumbs[i].style.backgroundColor = "#ddd";
          crumbs[i].style.fontWeight = "normal";
        } else {
          crumbs[i].style.backgroundColor = "#fff";
          crumbs[i].style.fontWeight = "bold";
        }
      }
    }

    // Make the pieces fopr the main table row

    function renderIconCell(object, imageURI) {
      const cell = dom.createElement("td");
      cell.style = "vertical-align: middle;";
      const icon = cell.appendChild(dom.createElement("img"));
      icon.setAttribute("src", imageURI);
      icon.style = style.smallIconStyle;
      // UI.widgets.setImage(icon, object) // @@ maybe loading each thing is not what you want
      return cell;
    }

    function renderCell(object, text) {
      const cell = dom.createElement("td");
      cell.style = "vertical-align: middle;";
      cell.textContent = text;
      cell.style.textAlign = "right";
      return cell;
    }

    function renderTypeCell(object) {
      // @@ Make icon from resource type
      let iconURI;
      if (kb.holds(object, ns.rdf("type"), ns.ldp("Container"))) {
        iconURI = UI.icons.iconBase + "noun_973694_expanded.svg";
      } else {
        iconURI = UI.icons.iconBase + "noun_681601.svg";
      }
      const cell = renderIconCell(object, iconURI);
      cell.addEventListener(
        "click",
        async (event) => navigateTo(object, event),
        false
      );
      UI.widgets.makeDraggable(cell.firstChild, object);
      return cell;
    }

    function renderNameCell(object) {
      const cell = dom.createElement("td");
      cell.style = "vertical-align: middle;";
      // We don't want browser link following?
      const anchor = cell.appendChild(dom.createElement("span"));
      anchor.textContent = folderName(object); // After the slash
      // anchor.setAttribute('href', object.uri)
      anchor.addEventListener(
        "click",
        async (event) => navigateTo(object, event),
        false
      );
      cell.appendChild(sentimentStrip(object, getActionDoc(subject)));
      return cell;
    }

    function renderSizeCell(object) {
      const size = kb.anyJS(object, ns.stat("size")); // @@ Express in kmGTP
      const cell = renderCell(object, size);
      return cell;
    }

    function renderDateCell(object) {
      const date = kb.anyValue(object, ns.dct("modified"));
      const text = UI.widgets.shortDate(date);
      const cell = renderCell(object, text);
      return cell;
    }

    function fileOrFolder(x) {
      return x.uri.endsWith("/") ? "folder" : "file"; // @@i18n
    }
    async function deleteResource(res) {
      if (!confirm("Really delete " + res + "?")) return;
      try {
        kb.fetcher.webOperation("DELETE", res); // @@ TODO remove casting
      } catch (err) {
        UI.widgets.complain(
          { dom, div },
          `folderTable: Error deleting ${res}: ${err}`
        );
      }
      await kb.fetcher.load(subject, { force: true, clearPreviousData: true });
      fileTable.refresh();
    }

    async function openToolBar(object, row) {
      // Put metadata in one file for the whole folder for now
      const toolbarContext = {
        deleteFunction: () => deleteResource(object),
        noun: fileOrFolder(object),
        actionDoc: getActionDoc(subject),
        refreshRow: row,
        div: div,
      }; // @@ add me, status area
      await loadActionDocumentIfAny();
      const toolbar = actionToolbar(object, row, toolbarContext);
      if (!toolbar) return; // already have one
      // row.style.position = 'relative' // to make an anchor - no doesn't work
      const cell = row.children[1];
      cell.style.position = "relative";
      toolbar.setAttribute(
        "style",
        "position: absolute; top: 2em; left: 0; height:4em; width: 30em; border: 0 0.1 0.1 0.1 solid grey; border-radius: 0.1em; background-color: #eef; "
      );
      toolbar.style.filter = "drop-shadow(30px 10px 4px #4444dd)";
      cell.appendChild(toolbar);
    }

    function renderMenuCell(object, row) {
      const cell = dom.createElement("td");
      cell.style = "vertical-align: middle;";
      cell.appendChild(
        UI.widgets.button(
          dom,
          UI.icons.iconBase + "noun_243787.svg",
          "More",
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          async (_event) => openToolBar(object, row)
        )
      );
      cell.firstChild.style = style.buttonStyle; // @@ move to style.js -> remove this line
      return cell;
    }

    function renderOneRow(object) {
      const row = dom.createElement("tr");
      row.appendChild(renderTypeCell(object));
      row.appendChild(renderNameCell(object));
      row.appendChild(renderDateCell(object));
      row.appendChild(renderSizeCell(object));
      row.appendChild(renderMenuCell(object, row));
      return row;
    }

    function renderFileTable() {
      async function refreshTable() {
        let objs = kb.each(subject, ns.ldp("contains")).filter(noHiddenFiles);
        console.log("   " + objs.length + " contained things in " + subject);
        objs = objs.map((obj) => [UI.utils.label(obj).toLowerCase(), obj]);
        objs.sort(); // Sort by label case-insensitive
        objs = objs.map((pair) => pair[1]);
        UI.utils.syncTableToArrayReOrdered(table, objs, renderOneRow);
      }
      const table = dom.createElement("table");
      table.style = "margin: 1em; width: 100%; font-size: 100%; "; // @@ compensate for 80% in tabbedtab.css
      table.refresh = refreshTable;
      refreshTable();
      return table;
    }

    // @@ add response to external login
    function isThisAPackage(subject) {
      const thisDir = subject.uri.endsWith("/")
        ? subject.uri
        : subject.uri + "/";
      const indexThing = kb.sym(thisDir + "index.ttl#this");
      const isPackage = kb.holds(subject, ns.ldp("contains"), indexThing.doc());
      if (isPackage) {
        console.log(
          "Package: View of folder with be view of indexThing. " + indexThing
        );
      }
      return isPackage;
    }

    // Is this directory actually a Package? If so display root object, not files
    function renderPackageIfPackage(subject) {
      const thisDir = subject.uri.endsWith("/")
        ? subject.uri
        : subject.uri + "/";
      const indexThing = kb.sym(thisDir + "index.ttl#this");
      if (kb.holds(subject, ns.ldp("contains"), indexThing.doc())) {
        console.log(
          "View of folder with be view of indexThing. Loading " + indexThing
        );
        const packageDiv = dom.createElement("div");
        packageDiv.style.cssText = "border-top: 0.2em solid #ccc;"; // Separate folder views above from package views below
        kb.fetcher.load(indexThing.doc()).then(function () {
          const packageTable = packageDiv.appendChild(
            dom.createElement("table")
          );
          context
            .getOutliner(dom)
            .GotoSubject(
              indexThing,
              true,
              undefined,
              false,
              undefined,
              packageTable
            );
        });
        return packageDiv;
      }
      return null;
    }

    // Refresh the whole view
    function refresh() {
      if (isThisAPackage(subject)) {
        if (fileTable) {
          div.removeChild(fileTable);
          fileTable = null;
        }
        if (packageDiv && packageDiv.subject.sameTerm(subject)) {
          console.log("package unchanged");
        } else {
          if (packageDiv) {
            div.removeChild(packageDiv);
          }
          packageDiv = renderPackageIfPackage(subject);
          packageDiv.subject = subject;
          div.appendChild(packageDiv);
        }
      } else {
        // this is not a package
        if (packageDiv) {
          div.removeChild(packageDiv);
          packageDiv = null;
        }
        if (fileTable) {
          fileTable.refresh();
        } else {
          fileTable = renderFileTable(/* subject */);
          div.appendChild(fileTable);
        }
      }

      refreshBreadcrumbs();
      // The creation div is bound to the subject, so need new one of subject changed
      if (!creationDiv.subject.sameTerm(subject)) {
        div.removeChild(creationDiv);
        creationDiv = renderCreationControl(subject);
        div.appendChild(creationDiv); // add on the end
        creationDiv.subject = subject;
      }
    }

    // Allow user to create new things within the folder
    function renderCreationControl(subject) {
      const creationDiv = dom.createElement("div");
      const me = UI.authn.currentUser();
      const creationContext = {
        folder: subject,
        div: creationDiv,
        dom: dom,
        statusArea: creationDiv,
        me: me,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (creationContext as any).refreshTarget = fileTable;
      UI.authn
        // FIXME:
        // .filterAvailablePanes(context.session.paneRegistry.list)
        .filterAvailablePanes([])
        .then(function (relevantPanes) {
          UI.create.newThingUI(creationContext, context, relevantPanes); // Have to pass panes down  newUI

          UI.aclControl.preventBrowserDropEvents(dom);

          const explictDropIcon = false;
          let target;
          if (explictDropIcon) {
            const iconStyleFound = creationDiv.firstChild.style.cssText;
            target = creationDiv.insertBefore(
              dom.createElement("img"),
              creationDiv.firstChild
            );
            target.style.cssText = iconStyleFound;
            target.setAttribute("src", UI.icons.iconBase + "noun_748003.svg");
            target.setAttribute("style", "width: 2em; height: 2em"); // Safari says target.style is read-only
          } else {
            target = creationDiv.firstChild; // Overload drop target semantics onto the plus sign
          }
          // /////////// Allow new file to be Uploaded
          UI.widgets.makeDropTarget(target, null, droppedFileHandler);
        });
      return creationDiv;
    }

    function droppedFileHandler(files) {
      UI.widgets.uploadFiles(
        kb.fetcher,
        files,
        subject.uri,
        subject.uri,
        function (file, uri) {
          // A file has been uploaded
          const destination = kb.sym(uri);
          console.log(" Upload: put OK: " + destination);
          kb.add(subject, ns.ldp("contains"), destination, subject.doc());
          kb.add(destination, ns.dct("modified"), new Date(), subject.doc()); // cheat
          kb.add(destination, ns.stat("size"), file.size, subject.doc()); // cheat
          fileTable.refresh();
        }
      );
    }
    /* Body of render
     */
    var div = dom.createElement("div");
    loadActionDocumentIfAny();
    var fileTable = null; // Holds the file list when the thing is a file list
    var packageDiv = null; // Alternative to FileTable:  Holds a package
    const statusArea = div.appendChild(dom.createElement("div"));
    const userContext = { dom, div, statusArea };
    var creationDiv = renderCreationControl(subject);
    creationDiv.subject = subject;
    div.appendChild(creationDiv);
    div.style = style.paneDivStyle;

    // Add a breadcrumbs line
    const breadcrumbsNav = div.appendChild(dom.createElement("nav")); // div? nav?
    var breadcrumbs = breadcrumbsNav.appendChild(dom.createElement("ol")); // div? nav?
    breadcrumbs.style =
      "flex-flow: column wrap; font-size: 120%; color: #222; margin: 0.5em 1em 0.5em 2em;"; //  T R B L
    breadcrumbs.refresh = refreshBreadcrumbs;
    // refreshBreadcrumbs()
    refresh();

    return div;
  },
};
// ends
