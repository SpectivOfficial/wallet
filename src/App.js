import React, { Component } from 'react'
import classnames from 'classnames'
import PageUnlockWallet from './PageUnlockWallet'
import PageUnlocked from './PageUnlocked'

import Button from 'muicss/lib/react/button'

import './App.css'
import 'muicss/dist/css/mui.css'

const shell = window.require('electron').shell


class App extends Component
{
    render() {
        return (
            <div className="App">
                {this.props.appState.wallet === null &&
                    <PageUnlockWallet />
                }

                {this.props.appState.wallet !== null &&
                    <PageUnlocked appState={this.props.appState} />
                }

                <ModalSendConfirmation
                    visible={this.props.appState.modalDisplayed === 'send-confirmation'}
                    {...this.props.appState.modalParams}
                />

                <ModalBadAddress
                    visible={this.props.appState.modalDisplayed === 'bad-address'}
                />

                <ModalBadValue
                    visible={this.props.appState.modalDisplayed === 'bad-value'}
                />

                <ModalUpdateAvailable
                    visible={this.props.appState.modalDisplayed === 'update-available'}
                    {...this.props.appState.modalParams}
                />
            </div>
        )
    }
}

export default App



class ModalSendConfirmation extends Component
{
    constructor(props) {
        super(props)
        this.onClickOK = this.onClickOK.bind(this)
        this.onClickCancel = this.onClickCancel.bind(this)
    }

    render() {
        return (
            <div className={classnames('modal', {'visible': this.props.visible})}>
                <div>
                    <div className="content">
                        Are you sure you want to send {this.props.amount} {this.props.currency} to {this.props.recipient}?
                    </div>

                    <div className="actions">
                        <Button color="primary" onClick={this.onClickOK}>OK</Button>
                        <Button color="primary" onClick={this.onClickCancel}>Cancel</Button>
                    </div>
                </div>
            </div>
        )
    }

    onClickOK() {
        this.props.onClickOK()
        window.store.hideModal()
    }

    onClickCancel() {
        window.store.hideModal()
    }
}


class ModalBadAddress extends Component
{
    constructor(props) {
        super(props)
        this.onClickOK = this.onClickOK.bind(this)
    }

    render() {
        return (
            <div className={classnames('modal', {'visible': this.props.visible})}>
                <div>
                    <div className="content">
                        Bad address.  Check the receipient's address and try again.
                    </div>

                    <div className="actions">
                        <Button color="primary" onClick={this.onClickOK}>OK</Button>
                    </div>
                </div>
            </div>
        )
    }

    onClickOK() {
        window.store.hideModal()
    }
}


class ModalBadValue extends Component
{
    constructor(props) {
        super(props)
        this.onClickOK = this.onClickOK.bind(this)
    }

    render() {
        return (
            <div className={classnames('modal', {'visible': this.props.visible})}>
                <div>
                    <div className="content">
                        Bad value.  Check the amount and try again.
                    </div>

                    <div className="actions">
                        <Button color="primary" onClick={this.onClickOK}>OK</Button>
                    </div>
                </div>
            </div>
        )
    }

    onClickOK() {
        window.store.hideModal()
    }
}


class ModalUpdateAvailable extends Component
{
    constructor(props) {
        super(props)
        this.onClickOK = this.onClickOK.bind(this)
        this.onClickGoToDownloadPage = this.onClickGoToDownloadPage.bind(this)
    }

    render() {
        return (
            <div className={classnames('modal', {'visible': this.props.visible})}>
                <div>
                    <div className="content">
                        An updated version of the Spectiv SIG wallet is available.
                    </div>

                    <div className="actions">
                        <Button color="primary"   onClick={this.onClickGoToDownloadPage}>Go to download page</Button>
                        <Button color="secondary" onClick={this.onClickOK}>No thanks</Button>
                    </div>
                </div>
            </div>
        )
    }

    onClickOK() {
        window.store.hideModal()
    }

    onClickGoToDownloadPage() {
        shell.openExternal('https://github.com/SpectivOfficial/wallet/releases')
    }
}
