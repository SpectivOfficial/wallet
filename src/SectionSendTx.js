import * as _ from 'lodash'
import React, { Component } from 'react'
import classnames from 'classnames'
import { ethers } from './eth'

import TxList from './TxList'

import Container from 'muicss/lib/react/container'
import Input from 'muicss/lib/react/input'
import Button from 'muicss/lib/react/button'
import Select from 'muicss/lib/react/select'
import Option from 'muicss/lib/react/option'

import './SectionSendTx.css'

const TOKEN_ETH = 'ETH'
const TOKEN_SIG = 'SIG'

class SectionSendTx extends Component
{
    constructor(props) {
        super(props)

        this.onChangeToken = this.onChangeToken.bind(this)
        this.onChangeGasPrice = this.onChangeGasPrice.bind(this)
        this.sendCoins = this.sendCoins.bind(this)
        this.clearFields = this.clearFields.bind(this)
        this.getSelectedGasPrice = this.getSelectedGasPrice.bind(this)
        this.onClickSendMax = this.onClickSendMax.bind(this)

        this.state = {
            token: TOKEN_ETH,
            gasPrice: 50,
            expandedTx: null,
        }
    }

    render() {
        return (
            <div className="SectionSendTx">
                <h1>Transfer</h1>
                <div className="subheading">Move funds to another account.</div>

                <Input ref={x => this._inputAddress = x} onChange={this.onChangeAddress} label="Send to address" />

                <div className="row amount">
                    <Input className="input" ref={x => this._inputAmount = x} label="Amount" />
                    <a className="send-max" onClick={this.onClickSendMax}>Send max</a>

                    <Select className="token" label="Send token" onChange={this.onChangeToken} value={this.state.token}>
                        <Option value={TOKEN_ETH} label="ETH" />
                        <Option value={TOKEN_SIG} label="SIG" />
                    </Select>
                </div>

                <div className="row">
                    <div className="gas-price slider">
                        <label>Gas price:</label>

                        <input
                            type="range"
                            min="1" max="200"
                            value={this.state.gasPrice}
                            ref={x => this._inputGasPrice = x}
                            onChange={this.onChangeGasPrice} />

                        <span className="gwei">{this.state.gasPrice} gwei</span>
                    </div>

                    <div>
                        <Button color="primary"   onClick={this.sendCoins}>Send {this.state.token}</Button>
                        <Button color="secondary" onClick={this.clearFields}>Clear</Button>
                    </div>
                </div>

                <div className="row recent-txs">
                    <div className="header">Recent</div>

                    <TxList txs={this.props.appState.txlist[ this.props.appState.wallet.address ]} limit={3} />
                </div>
            </div>
        )
    }

    clearFields() {
        this._inputAmount.controlEl.value = ''
        this._inputAddress.controlEl.value = ''
        this.setState({ gasPrice: 5 })
    }

    getSelectedGasPrice() {
        return ethers.utils.bigNumberify(this._inputGasPrice.value).mul(1000000000)
    }

    onClickSendMax() {
        let amount
        if (this.state.token === TOKEN_ETH) {
            let gasCost = ethers.utils.bigNumberify(21000).mul( this.getSelectedGasPrice() )
            amount = this.props.appState.ethBalance.sub( gasCost )
        } else if (this.state.token === TOKEN_SIG) {
            amount = this.props.appState.sigBalance
        }
        this._inputAmount.controlEl.value = ethers.utils.formatEther(amount)
    }

    onChangeGasPrice() {
        this.setState({ gasPrice: this._inputGasPrice.value })
    }

    onChangeToken(evt) {
        this.setState({ token: evt.target.value })
    }

    async sendCoins() {
        const amount = this._inputAmount.controlEl.value
        const token = this.state.token

        // validate the amount to send
        let amountWei
        try {
            amountWei = ethers.utils.parseEther(amount)
        } catch (err) {
            window.store.showBadValueModal()
            return
        }

        // get the gas price
        const gasPrice = this.getSelectedGasPrice()

        // validate the recipient address
        let recipient
        try {
            recipient = ethers.utils.getAddress(this._inputAddress.controlEl.value)
        } catch (err) {
            window.store.showBadAddressModal()
            return
        }

        // make sure the user has enough tokens for the tx they're attempting
        if (this.state.token === TOKEN_ETH) {
            if (gasPrice.mul(21000).add(amountWei).gt(this.props.appState.ethBalance)) {
                window.store.showInsufficientTokensModal('ETH')
                return
            }

        } else if (this.state.token === TOKEN_SIG) {
            if (amountWei.gt( this.props.appState.sigBalance )) {
                window.store.showInsufficientTokensModal('SIGs')
                return
            }

            if (gasPrice.mul(65000).gt(this.props.appState.ethBalance)) {
                window.store.showInsufficientTokensModal('ETH (for gas)')
                return
            }

        } else {
            throw new Error(`unknown token: ${this.state.token}`)
        }

        window.store.showSendConfirmationModal(amount, token, recipient, async () => {
            this.clearFields()

            let resp
            if (this.state.token === TOKEN_ETH) {
                resp = await this.props.appState.wallet.send(recipient, amountWei, {
                    gasPrice: gasPrice,
                    gasLimit: 21000,
                })

            } else if (this.state.token === TOKEN_SIG) {
                resp = await this.props.appState.tokenContract.transfer(recipient, amountWei, {
                    gasPrice: gasPrice,
                    gasLimit: 65000,
                })

            } else {
                throw new Error(`unknown token: ${this.state.token}`)
            }

            window.store.addTxToList(resp.hash, amount, token, recipient)

            console.log('resp ~>', resp)
        })
    }
}

export default SectionSendTx
