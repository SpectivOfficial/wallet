import React, { Component } from 'react'
import classnames from 'classnames'
const { dialog, app } = window.require('electron').remote
const fs = window.require('fs')
const path = window.require('path')
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

        this.state = {
            errorPasswordsDoNotMatch: false,
        }
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
                                <div className="form-new-wallet">
                                    <Input type="password" label="Enter wallet password" ref={x => this._inputPassword = x} placeholder="Wallet password" />
                                    <Input type="password" label="Confirm password"      ref={x => this._inputConfirmPassword = x} placeholder="Confirm password" />
                                    <Button onClick={this.onClickCreateNewWallet} color="primary">Create new wallet</Button>
                                    {this.state.errorPasswordsDoNotMatch && <div className="error">Passwords do not match.</div>}
                                </div>
                            </Tab>

                            <Tab label="Keystore (JSON) file">
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

        if (this._inputPassword.controlEl.value !== this._inputConfirmPassword.controlEl.value) {
            this.setState({ errorPasswordsDoNotMatch: true })
            return
        }

        this.setState({ errorPasswordsDoNotMatch: false })

        let wallet = Wallet.createRandom()
        let json = await wallet.encrypt(this._inputPassword.controlEl.value)

        let filename
        try {
            let desktop = app.getPath('desktop')
            filename = dialog.showSaveDialog({ defaultPath: path.join(desktop, `sig-wallet--${wallet.address}.json`) })
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

        window.store.showCreatedNewWalletModal(() => {
            window.store.setWalletUnlocked(wallet)
        })
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
                        <div className={classnames('select-keystore-file', {'hidden': this.state.phase === PHASE_DECRYPTING})}>
                            {this.state.keyFile !== null &&
                                <div className="file-selected">
                                    <IconFile fill="#ffffff" />
                                    {path.basename(this.state.keyFile)}
                                </div>
                            }

                            {this.state.keyFile !== null &&
                                <Button onClick={this.onClickOpenKeystoreFile} color="primary">Use Other Keystore File</Button>
                            }

                            {this.state.keyFile === null && <Button onClick={this.onClickOpenKeystoreFile} color="primary">Open Keystore File</Button> }
                        </div>
                    </div>

                    {this.state.phase === PHASE_HAS_KEYFILE &&
                        <Form inline={true}>
                            <Input ref={x => this._inputPassword = x} type="password" className="form-control" placeholder="Wallet password" />
                            <Button color="primary" onClick={this.onClickUnlockKeystoreFile}>Open</Button>
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
                        <Input label="Private key" ref={x => this._inputPrivateKey = x} className="form-control" placeholder="0xdeadbeef..." />
                        <div className="button-wrapper">
                            <Button color="primary" onClick={this.onClickUnlock}>Unlock</Button>
                        </div>
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




class IconFile extends Component {
    render() {
        return <svg className="icon-file" xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" viewBox="0 0 100 125"><g transform="translate(0,-952.36218)"><path d="m 19.812482,958.36223 c -0.983171,0.0927 -1.816761,1.01248 -1.812501,2 l 0,83.99997 c 1.1e-4,1.0472 0.95283,1.9999 2.000001,2 l 59.999999,0 c 1.04717,-10e-5 1.9999,-0.9528 2,-2 l 0,-63.99997 c 0.004,-0.53245 -0.21513,-1.06311 -0.59375,-1.4375 l -20,-20 c -0.37215,-0.35999 -0.88849,-0.56653 -1.40625,-0.5625 l -40.187499,0 z m 2.1875,4 35.999999,0 0,18 a 2.0002002,2.0002002 0 0 0 2,2 l 18,0 0,59.99997 -55.999999,0 0,-79.99997 z m 39.999999,2.8125 13.1875,13.1875 -13.1875,0 0,-13.1875 z" fill={this.props.fill} fillOpacity="1" stroke="none" marker="none" visibility="visible" display="inline" overflow="visible"/></g></svg>
    }
}