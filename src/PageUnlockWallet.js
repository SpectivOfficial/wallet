import React, { Component } from 'react'
const { dialog } = window.require('electron').remote
const fs = window.require('fs')
import { ethers, Wallet, setMyWallet } from './eth'
import logo from './images/logo.png'

import Tabs from 'muicss/lib/react/tabs'
import Tab from 'muicss/lib/react/tab'
import Input from 'muicss/lib/react/input'
import Button from 'muicss/lib/react/button'
import Container from 'muicss/lib/react/container'
import Col from 'muicss/lib/react/col'
import Row from 'muicss/lib/react/row'
import Form from 'muicss/lib/react/form'

import './PageUnlockWallet.css'

class PageUnlockWallet extends Component
{
    constructor(props) {
        super(props)
        this.onClickCreateNewWallet = this.onClickCreateNewWallet.bind(this)
    }

    render() {
        return (
            <Container className="PageUnlockWallet">
                <Col>
                    <Row>
                        <div className="logo-wrapper"><img src={logo} className="logo-image" /></div>

                        <h1>Unlock wallet</h1>

                        <Tabs>
                            <Tab label="Create new">
                                <Form inline={true}>
                                    <Input ref={x => this._inputPassword = x} placeholder="Wallet password" />
                                    <Button onClick={this.onClickCreateNewWallet} color="primary">Create new wallet</Button>
                                </Form>
                            </Tab>

                            <Tab label="Keystore file">
                                <UnlockKeystoreFile />
                            </Tab>

                            <Tab label="Private key">
                                <UnlockPrivateKey />
                            </Tab>
                        </Tabs>
                    </Row>
                </Col>
            </Container>
        )
    }

    async onClickCreateNewWallet(evt) {
        evt.preventDefault()
        evt.stopPropagation()

        let wallet = Wallet.createRandom()
        let json = await wallet.encrypt(this._inputPassword.controlEl.value)

        let filename
        try {
            filename = dialog.showSaveDialog({ defaultPath: `sig-wallet--${wallet.address}.json` })
        } catch (err) {
            // generally this is because the user canceled the save dialog
            console.log('err ~>', err)
        }

        if (!filename) {
            return
        }

        try {
            fs.writeFileSync(filename, json)
        } catch (err) {
            // @@TODO: modal with error
        }

        window.store.setWalletUnlocked(wallet)
    }
}

const PHASE_UNSTARTED = 0
const PHASE_HAS_KEYFILE = 1
const PHASE_DECRYPTING = 2
const PHASE_SUCCESS = 3
const PHASE_ERROR_INVALID_FILE = 4
const PHASE_ERROR_INVALID_PASSWORD = 5

class UnlockKeystoreFile extends Component
{
    constructor(props) {
        super(props)
        this.onClickOpenKeystoreFile = this.onClickOpenKeystoreFile.bind(this)
        this.onClickUnlockKeystoreFile = this.onClickUnlockKeystoreFile.bind(this)
        this.state = {
            keyFile: null,
            phase: PHASE_UNSTARTED,
            error: null,
        }
    }

    render() {
        return (
            <div className="UnlockKeystoreFile">
                <div>
                    <div>
                        {this.state.keyFile !== null && this.state.phase !== PHASE_DECRYPTING &&
                            <div>
                                <div>Keystore JSON File: {this.state.keyFile}</div>
                                <Button onClick={this.onClickOpenKeystoreFile} color="primary">Use Other Keystore File</Button>
                            </div>
                        }

                        {this.state.keyFile === null && this.state.phase !== PHASE_DECRYPTING &&
                            <Button onClick={this.onClickOpenKeystoreFile} color="primary">Open Keystore File</Button>
                        }
                    </div>

                    {this.state.phase === PHASE_HAS_KEYFILE &&
                        <Form inline={true}>
                            <Input ref={x => this._inputPassword = x} type="password" className="form-control" placeholder="Wallet password" />
                            <Button type="submit" className="btn btn-default" onClick={this.onClickUnlockKeystoreFile}>Open</Button>
                        </Form>
                    }

                    {this.state.phase === PHASE_DECRYPTING &&
                        <span>Decrypting...</span>
                    }

                    {this.state.error !== null && this.state.phase !== PHASE_DECRYPTING &&
                        <span className="error">{this.state.error}</span>
                    }
                </div>
            </div>
        )
    }

    onClickOpenKeystoreFile() {
        dialog.showOpenDialog((filenames) => {
            if (filenames === undefined) {
                this.setState({
                    keyFile: null,
                    phase: PHASE_UNSTARTED,
                })
                return
            }

            this.setState({
                keyFile: filenames[0],
                phase: PHASE_HAS_KEYFILE,
            })
        })
    }

    async onClickUnlockKeystoreFile() {
        this.setState({ phase: PHASE_DECRYPTING })

        let password = this._inputPassword.controlEl.value
        let buffer = fs.readFileSync(this.state.keyFile)
        let walletData = buffer.toString()

        if (!Wallet.isEncryptedWallet(walletData)) {
            this.setState({ phase: PHASE_UNSTARTED, error: 'Invalid keystore JSON file' })
            return
        }

        let wallet
        try {
            wallet = await Wallet.fromEncryptedWallet(walletData, password)
        } catch (err) {
            this.setState({ phase: PHASE_HAS_KEYFILE, error: 'Incorrect password' })
            return
        }

        console.log("Opened Address: " + wallet.address)
        wallet.provider = new ethers.providers.getDefaultProvider(false)

        this.setState({ phase: PHASE_SUCCESS, keyFile: null })

        window.store.setWalletUnlocked(wallet)
    }
}

class UnlockPrivateKey extends Component
{
    constructor(props) {
        super(props)
        this.onClickUnlock = this.onClickUnlock.bind(this)
        this.state = {
            error: false,
        }
    }

    render() {
        return (
            <div className="UnlockPrivateKey">
                <div>
                    <div className="form-group">
                        <label>Private key</label>
                        <Input ref={x => this._inputPrivateKey = x} className="form-control" placeholder="0xdeadbeef..." />
                        <Button onClick={this.onClickUnlock}>Unlock</Button>
                    </div>

                    {this.state.error &&
                        <span className="error">Invalid private key</span>
                    }
                </div>
            </div>
        )
    }

    onClickUnlock() {
        let key = this._inputPrivateKey.controlEl.value
        if (key.substring(0, 2) !== '0x') {
            key = '0x' + key
        }

        if (key === '' || !key.match(/^(0x)?[0-9A-fa-f]{64}$/)) {
            this.setState({ error: true })
            return
        }

        try {
            let wallet = new Wallet(key)
            window.store.setWalletUnlocked(wallet)
            this.setState({ error: false })

            console.log("Opened address: " + wallet.address)

        } catch (err) {
            console.error(err)
            this.setState({ error: true })
        }
    }
}

export default PageUnlockWallet
