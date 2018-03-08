
import React from 'react'
import ReactDOM from 'react-dom'

import Store from './store'

import App from './App'
import { ethers, Wallet } from './eth'
import './index.css'

window.store = new Store()

window.store.on('new state', (appState) => {
    ReactDOM.render( <App appState={appState} /> , document.getElementById('root'))
})

window.store.emitState()

window.store.getTxList()
window.store.checkForUpdates('v1.0.0')


