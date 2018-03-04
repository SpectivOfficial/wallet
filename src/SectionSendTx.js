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

const CURRENCY_ETH = 'ETH'
const CURRENCY_SIG = 'SIG'

class SectionSendTx extends Component
{
    constructor(props) {
        super(props)

        this.onChangeCurrency = this.onChangeCurrency.bind(this)
        this.onChangeGasPrice = this.onChangeGasPrice.bind(this)
        this.sendCoins = this.sendCoins.bind(this)
        this.clearFields = this.clearFields.bind(this)

        this.state = {
            currency: CURRENCY_ETH,
            gasPrice: 5,
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

                    <Select className="currency" label="Send currency" onChange={this.onChangeCurrency} value={this.state.currency}>
                        <Option value={CURRENCY_ETH} label="ETH" />
                        <Option value={CURRENCY_SIG} label="SIG" />
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
                        <Button className="button-send"  onClick={this.sendCoins}>Send {this.state.currency}</Button>
                        <Button className="button-clear" onClick={this.clearFields}>Clear</Button>
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

    onChangeGasPrice() {
        this.setState({ gasPrice: this._inputGasPrice.value })
    }

    onChangeCurrency(evt) {
        this.setState({ currency: evt.target.value })
    }

    async sendCoins() {
        const amount = this._inputAmount.controlEl.value
        const currency = this.state.currency

        let amountWei
        try {
            amountWei = ethers.utils.parseEther(amount)
        } catch (err) {
            window.store.showBadValueModal()
            return
        }

        const gasPrice = ethers.utils.bigNumberify(this._inputGasPrice.value).mul(1000000000)

        let recipient
        try {
            recipient = ethers.utils.getAddress(this._inputAddress.controlEl.value)
        } catch (err) {
            window.store.showBadAddressModal()
            return
        }


        window.store.showSendConfirmationModal(amount, currency, recipient, async () => {
            this.clearFields()

            let resp
            if (this.state.currency === CURRENCY_ETH) {
                resp = await this.props.appState.wallet.send(recipient, amountWei, {
                    gasPrice: gasPrice,
                    gasLimit: 21000,
                })

            } else if (this.state.currency === CURRENCY_SIG) {
                resp = await this.props.appState.tokenContract.transfer(recipient, amountWei, {
                    gasPrice: gasPrice,
                    gasLimit: 65000,
                })

            } else {
                throw new Error(`unknown currency: ${this.state.currency}`)
            }

            window.store.addTxToList(resp.hash, amount, currency, recipient)

            console.log('resp ~>', resp)
        })
    }
}

export default SectionSendTx
