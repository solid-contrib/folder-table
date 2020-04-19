/**
 * Tools for doing things with a target: a message, file, ... anything
 * Let us be creative here.  Allow all sorts of things to
 * be done to a  - linking to new or old objects in an open way
 *
 * Ideas: Bookmark, Like, star, pin at top of chat, reply as new thread,
 * at-mention a person, hash-tag with a keyword,
 * If you made it originally: edit, delete, attach
 * @packageDocumentation
 */

const UI = require('solid-ui')
/*
const UI = {
  authn: require('../authn/authn'),
  icons: require('../iconBase'),
  ns: require('../ns'),
  media: require('../media-capture'),
  pad: require('../pad'),
  rdf: require('rdflib'),
  store: require('../store'),
  style: require('../style'),
  utils: require('../utils'),
  widgets: require('../widgets')
}
*/
const bookmarks = require('./bookmarks')

const dom = window.document

export const toolBarForRow = Symbol('toolBarForRow') // use for safe poperties on fireign objects

const kb = UI.store
const ns = UI.ns
// const label = UI.utils.label

// THE UNUSED ICONS are here as reminders for possible future functionality
// const BOOKMARK_ICON = 'noun_45961.svg'
// const HEART_ICON = 'noun_130259.svg' -> Add this to my (private) favorites
// const MENU_ICON = 'noun_897914.svg'
// const PAPERCLIP_ICON = 'noun_25830.svg' -> add attachments to this message
// const PIN_ICON = 'noun_562340.svg'  -> pin this message permanently in the chat UI
// const PENCIL_ICON = 'noun_253504.svg'
// const SPANNER_ICON = 'noun_344563.svg' -> settings
const THUMBS_UP_ICON = 'noun_1384132.svg'
const THUMBS_DOWN_ICON = 'noun_1384135.svg'
const ISSUE_ICON = 'noun_Danger_1259514.svg' // Something like following github
// const GROUP_ICON = 'noun_339237.svg'
// const HASH_ICON = 'noun_Hash_2457016.svg' // '#' sign
const MENTION_ICON = 'noun_mention_3203461.svg' // '@' sign
// const TAG_ICON = 'noun_Tag_3235488.svg' // Luggage tag for keyword tagging

/**
 * Emoji in Unicode
 */

var emoji = {}
emoji[ns.schema('AgreeAction')] = '👍'
emoji[ns.schema('DisagreeAction')] = '👎'
emoji[ns.schema('EndorseAction')] = '⭐️'
emoji[ns.schema('LikeAction')] = '❤️'

async function deleteThingThen (x) {
  try {
    await kb.updater.update(kb.connectedStatements(x), [])
  } catch (err) {
    // @@ complain
  }
}

/**
 * Create strip of sentiments expressed
 */
export function sentimentStrip (target, doc) {
  const actions = kb.each(null, ns.schema('target'), target, doc)
  const sentiments = actions.map(a => kb.any(a, ns.rdf('type'), null, doc))
  sentiments.sort()
  const strings = sentiments.map(x => emoji[x] || '')
  return dom.createTextNode('  ' + strings.join(' '))
}
/**
 * Create strip of sentiments expressed, with hyperlinks
 *
 * @param target {NamedNode} - The thing about which they are expressed
 * @param doc {NamedNode} - The document in which they are expressed
 */
export function sentimentStripLinked (target, doc) {
  var strip = dom.createElement('span')
  function refresh () {
    strip.innerHTML = ''
    const actions = kb.each(null, ns.schema('target'), target, doc)
    const sentiments = actions.map(a => [
      kb.any(a, ns.rdf('type'), null, doc),
      kb.any(a, ns.schema('agent'), null, doc)
    ])
    sentiments.sort()
    sentiments.forEach(ss => {
      const [theClass, agent] = ss
      var res
      if (agent) {
        res = dom.createElement('a')
        res.setAttribute('href', agent.uri)
      } else {
        res = dom.createTextNode('')
      }
      res.textContent = emoji[theClass] || '*'
      strip.appendChild(res)
    })
  }
  refresh()
  strip.refresh = refresh
  return strip
}

/**   Button to allow user to express a sentiment (like, endorse, etc) about a target
 *
 * @param context {Object} - Provide dom and me
 * @param target {NamedNode} - The thing the user expresses an opnion about
 * @param icon {uristring} - The icon to be used for the button
 * @param actionClass {NamedNode} - The RDF class  - typically a subclass of schema:Action
 * @param doc - {NamedNode} - the Solid document iunto which the data should be written
 * @param mutuallyExclusive {Array<NamedNode>} - Any RDF classes of sentimentswhich are mutiually exclusive
 */
export function renderSentimentButton (
  context,
  target,
  refreshRow,
  icon,
  actionClass,
  doc,
  mutuallyExclusive
) {
  function setColor () {
    button.style.backgroundColor = action ? 'yellow' : 'white'
  }
  var button = UI.widgets.button(
    dom,
    icon,
    UI.utils.label(actionClass),
    async function (_event) {
      if (action) {
        await deleteThingThen(action)
        action = null
        setColor()
      } else {
        // no action
        action = UI.widgets.newThing(doc)
        var insertMe = [
          kb.quad(action, ns.schema('agent'), context.me, doc),
          kb.quad(action, ns.rdf('type'), actionClass, doc),
          kb.quad(action, ns.schema('target'), target, doc)
        ]
        await kb.updater.update([], insertMe)
        setColor()

        if (mutuallyExclusive) {
          // Delete incompative sentiments
          var dirty = false
          for (let i = 0; i < mutuallyExclusive.length; i++) {
            const a = existingAction(mutuallyExclusive[i])
            if (a) {
              await deleteThingThen(a) // but how refresh? refreshTree the parent?
              dirty = true
            }
          }
          if (dirty && refreshRow) {
            // UI.widgets.refreshTree(button.parentNode) // requires them all to be immediate siblings
            UI.widgets.refreshTree(refreshRow) // requires them all to be immediate siblings
          }
        }
      }
    }
  )
  function existingAction (actionClass) {
    var actions = kb
      .each(null, ns.schema('agent'), context.me, doc)
      .filter(x => kb.holds(x, ns.rdf('type'), actionClass, doc))
      .filter(x => kb.holds(x, ns.schema('target'), target, doc))
    return actions.length ? actions[0] : null
  }
  function refresh () {
    action = existingAction(actionClass)
    setColor()
  }
  var action
  button.refresh = refresh // If the file changes, refresh live
  refresh()
  return button
}

/**
 * Creates a social action toolbar component below a row about the target
 */
export function actionToolbar (target, messageRow, userContext) { // was: messageToolbar
  const actionDoc = userContext.actionDoc
  if (!actionDoc) throw new Error('Toolbar: nowhere to store stuff')
  const refreshRow = userContext.refreshRow
  // if (!refreshRow) throw new Error('Toolbar: no refreshRow')

  const noun = userContext.noun || 'thing'
  if (messageRow[toolBarForRow]) {
    console.log('Alredy have tool bar here.')
    return null
  }
  const div = dom.createElement('div')
  messageRow[toolBarForRow] = div
  function closeToolbar () {
    messageRow[toolBarForRow] = null
    div.parentElement.removeChild(div)
  }

  if (userContext.deleteFunction) {
    // button to delete the target
    const deleteButton = UI.widgets.deleteButtonWithCheck(
      dom,
      div,
      noun,
      async function () {
        await userContext.deleteFunction()
        closeToolbar()
      }
    )
    div.appendChild(deleteButton)
  } // if mine

  // Things anyone can do if they have a bookmark list

  bookmarks.renderBookmarksButton(userContext).then(bookmarkButton => {
    if (bookmarkButton) div.appendChild(bookmarkButton)
  })

  // THUMBS_UP_ICON
  // https://schema.org/AgreeAction
  var me = UI.authn.currentUser() // If already logged on
  if (me) {
    // Things you mnust be logged in for
    var context1 = { me, dom, div }
    div.appendChild(
      renderSentimentButton(
        context1,
        target, // @@ TODO use UI.widgets.renderSentimentButton
        refreshRow,
        UI.icons.iconBase + THUMBS_UP_ICON,
        ns.schema('AgreeAction'),
        actionDoc,
        [ns.schema('DisagreeAction')]
      )
    )
    // Thumbs down
    div.appendChild(
      renderSentimentButton(
        context1,
        target,
        refreshRow,
        UI.icons.iconBase + THUMBS_DOWN_ICON,
        ns.schema('DisagreeAction'),
        actionDoc,
        [ns.schema('AgreeAction')]
      )
    )
  }

  // Issue tracker? Make this an issue
  // ToDo: call out to issue tracker code for form for new issue
  if (userContext.issueTracker) {
    const tracker = userContext.issueTracker
    div.appendChild(renderSentimentButton(
      context1,
      target,
      refreshRow,
      UI.icons.iconBase + ISSUE_ICON,
      kb.the(tracker, ns.wf('issueClass')),
      kb.the(tracker, ns.wf('stateStore')),
      []
    )
    )
  }
  // At-mention people
  if (userContext.group) {
    div.appendChild(UI.widgets.button(dom, UI.icons.iconBase + MENTION_ICON, 'poke', _event => {
      // @@ write me code to select people,
      // @@ use the people picker to pick people to poke
      // - add a linked text string to the message if it is a message,
      // Send the  a soldi notification that they have booen at-menioned (poked) about the target
      //
      if (refreshRow) {
        UI.widgets.refreshTree(refreshRow) // requires them all to be immediate siblings
      }
    }))
  }

  // X button to remove the tool UI itself
  const cancelButton = div.appendChild(UI.widgets.cancelButton(dom))
  cancelButton.style.float = 'right'
  cancelButton.firstChild.style.opacity = '0.3'
  cancelButton.addEventListener('click', closeToolbar)
  return div
}
