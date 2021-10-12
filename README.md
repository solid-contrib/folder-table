# [WiP] Solid Pane Folder-Table

**Note** : This is a work in progress started some time ago by @timbl and was last worked on by @michielbdejong and @alvetens two years ago. In this version, I (@jeff-zucker) added a pod-picker and login using the latest auth .

You can try this out as a web app on <a href="https://jeff-zucker.solidcommunity.net:8443/folder-table/">the NSS test server</a>. You can also install and use locally, see below.

## Overview

Current version supports viewing and changing folders; bookmarking resources (in the ... menu); and deleting containers and resources (... menu, then hover at right). I haven't looked at the additional functionality mentioned below yet. I have only built the stand-alone version, have not tried to integrate it as an actual pane yet.

Folder browser for Solid file system: traverse, add new folders, objects, upload files etc

This version of a folder viewer is a table view with a list of files and attributes in columns

- There is a breadcrumbs list at the top of the ancestor folders.
  -- You can click on one to go there
  -- You can drag one eg into the browser new tab space to open in a new tab

-- Files in lists have icons which can be dragged or clicked on
-- Files in the list have names which can be clicked on
-- Files n lists have size and date fields which are passive read only

A "more" icons "..." allows use of a social toolbar for each file.

The toolbar allows logged-in individuals to perform various extensible social actions on the files and folders in the list.

## Installation

```
git clone -b auth-upgrade https://github.com/solid/folder-table.git
cd folder-table
npm ci
npm run build
```

## usage

After building, folder-table/dist/index.html can be served from a localhost.
