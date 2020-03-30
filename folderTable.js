/*   Folder pane - Table version
 **
 **  This folder table pane lists the members of a folder
 */

import * as UI from 'solid-ui'
import { sentimentStrip, sentimentStripLinked, actionToolbar } from './toolbar'

const ns = UI.ns

export default {
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
    const kb = context.session.store
    var mainTable // This is a live synced table

    var div = dom.createElement('div')
    div.setAttribute('class', 'instancePane')
    div.setAttribute(
      'style',
      'border-top: solid 1px #777; border-bottom: solid 1px #777; margin-top: 0.5em; margin-bottom: 0.5em ' // @@ to style.js
    )

    function noHiddenFiles (obj) {
      // @@ This hiddenness should actually be server defined
      const pathEnd = obj.uri.slice(obj.dir().uri.length)
      return !(
        pathEnd.startsWith('.') ||
        pathEnd.endsWith('.acl') ||
        pathEnd.endsWith('~')
      )
    }

    async function navigateTo (x) {
      try {
        console.log('navigateto: loading ' + x)
        await kb.fetcher.load(x)
      } catch (err) {
        // complain(err)
        alert(err) //
      }
      subject = x
      refreshTable()
      refreshBreadcrumbs()
      console.log('Navigated to ' + subject)
      // @@ add hisory
      // window.location.href = y.uri // beware will cause jumo if diff origin
    }

    function folderName (folder) {
      var path = folder.uri.split('/').slice(3) // skip http, gap, domain
      // if (path.length === 0) return '/'
      path = path.reverse()
      return decodeURIComponent(path[0] || path[1] || ' / ')
    }

    function renderBreadcrumb (x) {
      const ele = dom.createElement('li') // 20200330b
      ele.style = 'display: inline; margin: 0.4em; padding: 0.2em; background-color: #ddd; border-radius: 0.2em;'
      ele.textContent = folderName(x)
      ele.addEventListener('click', async _event => navigateTo(x))
      ele.subject = x
      return ele
    }

    var breadcrumbs
    function refreshBreadcrumbs () {
      var ancestors = []
      const uri = subject.uri
      var p = uri.indexOf('//') + 2
      p = uri.indexOf('/', p)
      for (p; p > 0; p = uri.indexOf('/', p + 1)) {
        ancestors.push(kb.sym(subject.uri.slice(0, p + 1)))
      }
      UI.utils.syncTableToArrayReOrdered(breadcrumbs, ancestors, renderBreadcrumb)
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
      const newRow = dom.createElement('tr')
      newRow.decoration = true // don't mess up sync of table
      actionToolbar(object, newRow, userContext) // social actions .. @@ make sure it generalizes
      row.parentElement.insertBefore(newRow, row.nextSibling)
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

    async function refreshTable () {
      var objs = kb.each(subject, ns.ldp('contains')).filter(noHiddenFiles)
      console.log('   ' + objs.length + ' contained things in ' + subject)
      objs = objs.map(obj => [UI.utils.label(obj).toLowerCase(), obj])
      objs.sort() // Sort by label case-insensitive
      objs = objs.map(pair => pair[1])
      UI.utils.syncTableToArrayReOrdered(mainTable, objs, renderOneRow)
    }

    var thisDir = subject.uri.endsWith('/') ? subject.uri : subject.uri + '/'
    var userContext = {} // @@ add me, status area

    // @@ add response to external login

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
    }

    // Add a breadcrumbs line
    const breadcrumbsNav = div.appendChild(dom.createElement('nav')) // div? nav?
    breadcrumbs = breadcrumbsNav.appendChild(dom.createElement('ol')) // div? nav?
    breadcrumbs.style = 'flex-flow: column wrap; font-size: 120%; color: #222; margin: 0.5em 1em 0.5em 2em;' //  T R B L
    breadcrumbs.refresh = refreshBreadcrumbs
    refreshBreadcrumbs()

    mainTable = div.appendChild(dom.createElement('table'))
    mainTable.style = 'margin: 1em; width: 100%; font-size: 120%; ' // @@ compensate for 80% in tabbedtab.css
    mainTable.refresh = refreshTable
    refreshTable()

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
