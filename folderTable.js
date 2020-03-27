/*   Folder pane - Table version
 **
 **  This folder table pane lists the members of a folder
 */

import * as UI from 'solid-ui'
import { sentimentStrip, sentimentStripLinked, actionToolbar } from './toolbar'

const ns = UI.ns

module.exports = {
  icon: UI.icons.iconBase + 'noun_897914.svg', // @@ That looks like a menu, better one with more lines

  name: 'folderTable',

  // Note no mintNew, as the folderPane already has that functionality
  label: function (subject, context) {
    const kb = context.session.store
    const n = kb.each(subject, ns.ldp('contains')).length
    if (n > 0) {
      return 'Contents (' + n + ')' // Show how many in hover text
    }
    if (kb.holds(subject, ns.rdf('type'), ns.ldp('Container'))) {
      // It is declared as being a container
      return 'Container (0)'
    }
    return null // Suppress pane otherwise
  },

  // Render a file folder in a LDP/solid system

  render: function (subject, context) {
    const dom = context.dom
    const _outliner = context.getOutliner(dom)
    const kb = context.session.store
    var mainTable // This is a live synced table

    var div = dom.createElement('div')
    div.setAttribute('class', 'instancePane')
    div.setAttribute(
      'style',
      'border-top: solid 1px #777; border-bottom: solid 1px #777; margin-top: 0.5em; margin-bottom: 0.5em ' // @@ to style.js
    )

    // If this is an LDP container just list the directory

    function noHiddenFiles (obj) {
      // @@ This hiddenness should actually be server defined
      const pathEnd = obj.uri.slice(obj.dir().uri.length)
      return !(
        pathEnd.startsWith('.') ||
        pathEnd.endsWith('.acl') ||
        pathEnd.endsWith('~')
      )
    }

    const userContext = {} // @@ add me, status area

    async function navigateTo (y) {
      try {
        await kb.fetch.load(y)
      } catch (err) {
        // @@
      }
    }

    function folderName (folder) {
      const path = folder.uri.split('/').slice(3) // skip http, gap, domain
      if (path.length === 0) return '/'
      return decodeURIComponent(path.slice(-2)[0]) // last one is empty string
    }

    function renderBreadcrumb (x) {
      const ele = dom.createElement('span')
      ele.style = 'padding: 0.2em;'
      ele.textContent = folderName(x)
      ele.addEventListener('click', async _event => { navigateTo(x) })
      ele.subject = x
      return ele
    }

    var breadcrumbs
    function refreshBreadcrumbs () {
      var ancestors = []
      for (var p = 0; p > 0; p = subject.uri.indexOf('/', p + 1)) {
        ancestors.push(kb.sym(subject.uri.slice(p)))
      }
      UI.utils.syncTableToArray(breadcrumbs, ancestors, renderBreadcrumb)
    }

    // Make the pieces fopr the main table row

    function renderIconCell (object, imageURI) {
      const cell = dom.createElement('td')
      cell.style = 'vertical-align: middle;'
      const icon = cell.appendChild(dom.createElement('img'))
      icon.setAttribute('src', imageURI)
      icon.style = UI.style.iconStyle
      // UI.widgets.setImage(icon, object) // @@ maybe loading each thing is not what you want
      return cell
    }

    function renderCell (object, text) {
      const cell = dom.createElement('td')
      cell.style = 'vertical-align: middle;'
      cell.textContent = text
      return cell
    }

    function renderTypeCell (object) {
      // @@ Make icon from resource type
      var iconURI
      if (kb.holds(object, ns.rdf('type'), ns.ldp('Container'))) {
        iconURI = UI.icons.iconBase + 'noun_973694_expanded.svg'
      } else {
        iconURI = UI.icons.iconBase + 'noun_681601.svg'
      }
      return renderIconCell(object, iconURI)
    }

    function renderNameCell (object) {
      const cell = dom.createElement('td')
      cell.style = 'vertical-align: middle;'
      const anchor = cell.appendChild(dom.createElement('a'))
      anchor.textContent = folderName(object)// After the slash
      anchor.setAttribute('href', object.uri)
      anchor.addEventListener('click', async _event => navigateTo(object))
      return cell
    }

    function renderSizeCell (object) {
      const size = kb.anyJS(object, ns.stat('size')) // @@ Express in kmGTP
      return renderCell(object, size)
    }

    function renderDateCell (object) {
      const date = kb.anyValue(object, ns.dct('modified'))
      const text = UI.widgets.shortDate(date)
      return renderCell(object, text)
    }

    function openToolBar (object, row) {
      const toolBar = UI.messageToolbar(object, row, userContext) // social actions .. @@ make sure it generalizes
      const _tr = row.parentElement.insertBefore(toolBar, row.nextSibling)
    }

    function renderMenuCell (object, row) {
      const cell = dom.createElement('td')
      cell.style = 'vertical-align: middle;'
      cell.appendChild(UI.widgets.button(dom,
        UI.icons.iconBase + 'noun_243787.svg',
        'More',
        async _event => openToolBar(object, row)))
      return cell
    }

    function renderOneRow (object) {
      const row = dom.createElement('tr')
      row.appendChild(renderTypeCell(object))
      row.appendChild(renderNameCell(object))
      row.appendChild(renderDateCell(object))
      row.appendChild(renderSizeCell(object))
      row.appendChild(renderMenuCell(object, row))
      return row
    }

    function refreshTable () {
      var objs = kb.each(subject, ns.ldp('contains')).filter(noHiddenFiles)
      objs = objs.map(obj => [UI.utils.label(obj).toLowerCase(), obj])
      objs.sort() // Sort by label case-insensitive
      objs = objs.map(pair => pair[1])
      UI.utils.syncTableToArray(mainTable, objs, renderOneRow)
    }

    const thisDir = subject.uri.endsWith('/') ? subject.uri : subject.uri + '/'

    // Is this directory actually a Package? If so display root object, not files
    const indexThing = kb.sym(thisDir + 'index.ttl#this')
    if (kb.holds(subject, ns.ldp('contains'), indexThing.doc())) {
      console.log(
        'View of folder with be view of indexThing. Loading ' + indexThing
      )
      const packageDiv = div.appendChild(dom.createElement('div'))
      packageDiv.style.cssText = 'border-top: 0.2em solid #ccc;' // Separate folder views above from package views below
      kb.fetcher.load(indexThing.doc()).then(function () {
        mainTable = packageDiv.appendChild(dom.createElement('table'))
        context
          .getOutliner(dom)
          .GotoSubject(indexThing, true, undefined, false, undefined, mainTable)
      })
      return div
    } else { // Not a package
      // @@ Add a breadcrumbs line
      breadcrumbs = div.appendChild(dom.createElement('p')) // div? nav?
      breadcrumbs.refresh = refreshBreadcrumbs
      refreshBreadcrumbs()

      mainTable = div.appendChild(dom.createElement('table'))
      mainTable.style = 'margin: 1em; width: 100%; font-size: 120%; ' // @@ compensate for 80% in tabbedtab.css
      mainTable.refresh = refreshTable
      refreshTable()
    }

    // Allow user to create new things within the folder
    var creationDiv = div.appendChild(dom.createElement('div'))
    var me = UI.authn.currentUser()
    var creationContext = {
      folder: subject,
      div: creationDiv,
      dom: dom,
      statusArea: creationDiv,
      me: me
    }
    creationContext.refreshTarget = mainTable
    UI.authn
      .filterAvailablePanes(context.session.paneRegistry.list)
      .then(function (relevantPanes) {
        UI.create.newThingUI(creationContext, context, relevantPanes) // Have to pass panes down  newUI

        UI.aclControl.preventBrowserDropEvents(dom)

        const explictDropIcon = false
        var target
        if (explictDropIcon) {
          const iconStyleFound = creationDiv.firstChild.style.cssText
          target = creationDiv.insertBefore(
            dom.createElement('img'),
            creationDiv.firstChild
          )
          target.style.cssText = iconStyleFound
          target.setAttribute('src', UI.icons.iconBase + 'noun_748003.svg')
          target.setAttribute('style', 'width: 2em; height: 2em') // Safari says target.style is read-only
        } else {
          target = creationDiv.firstChild // Overload drop target semantics onto the plus sign
        }

        // /////////// Allow new file to be Uploaded
        UI.widgets.makeDropTarget(target, null, droppedFileHandler)
      })

    return div

    function droppedFileHandler (files) {
      UI.widgets.uploadFiles(
        kb.fetcher,
        files,
        subject.uri,
        subject.uri,
        function (file, uri) {
          // A file has been uploaded
          const destination = kb.sym(uri)
          console.log(' Upload: put OK: ' + destination)
          kb.add(subject, ns.ldp('contains'), destination, subject.doc())
          mainTable.refresh()
        }
      )
    }
  }
}
// ends
