import React, { Component } from 'react'
const { dialog } = window.require('electron').remote
const shell = window.require('electron').shell
const fs = window.require('fs')
import { ethers } from './eth'
import classnames from 'classnames'

import Container from 'muicss/lib/react/container'
import Col from 'muicss/lib/react/col'
import Row from 'muicss/lib/react/row'
import Tabs from 'muicss/lib/react/tabs'
import Tab from 'muicss/lib/react/tab'
import Input from 'muicss/lib/react/input'
import Button from 'muicss/lib/react/button'
import Select from 'muicss/lib/react/select'
import Option from 'muicss/lib/react/option'

import SectionSendTx from './SectionSendTx'
import SectionTxHistory from './SectionTxHistory'

import './PageUnlocked.css'
import textlogo from './images/textlogo-white.png'
import logo from './images/logo.svg'

const SECTION_SEND_TX = 1
const SECTION_TX_HISTORY = 2


class PageUnlocked extends Component
{
    constructor(props) {
        super(props)

        this.state = {
            section: SECTION_SEND_TX,
        }

        this.openSection = this.openSection.bind(this)
        this.onClickAddress = this.onClickAddress.bind(this)
    }

    componentWillMount() {
        window.store.updateETHBalance()
        window.store.updateSIGBalance()

        this._updateInterval = setInterval(() => {
            window.store.updateETHBalance()
            window.store.updateSIGBalance()
        }, 15000)
    }

    componentWillUnmount() {
        clearInterval(this._updateInterval)
        this._updateInterval = null
    }

    formatNum(n) {
        n = parseFloat(ethers.utils.formatEther( n ))

        let floatDigits = 7
        if (n <= 999) {
            floatDigits = 7
        } else if (n <= 9999) {
            floatDigits = 6
        } else if (n <= 99999) {
            floatDigits = 5
        } else if (n <= 999999) {
            floatDigits = 4
        } else if (n <= 9999999) {
            floatDigits = 3
        } else if (n <= 99999999) {
            floatDigits = 2
        } else {
            floatDigits = 1
        }

        return n.toFixed(floatDigits)
    }

    render() {
        const { sigPrice24HChange, errorFetchingSIGPrice } = this.props.appState
        let priceChangeSymbol = sigPrice24HChange > 0 ? '+' : ''

        let amountETH = this.formatNum( this.props.appState.ethBalance )
        let amountSIG = this.formatNum( this.props.appState.sigBalance )

        return (
            <div className="PageUnlocked">
                <nav>
                    <section className="logo-wrapper">
                        <img className="logo" src={logo} />
                    </section>

                    <section className="balances">
                        <label>Balances</label>

                        <div className="currency-name">SIG</div>
                        <div className="large">{amountSIG}</div>

                        <div className="currency-name">ETH</div>
                        <div className="large">{amountETH}</div>
                    </section>

                    <section className="sig-price">
                        <label>SIG Price</label>
                        <div className="large">${this.props.appState.sigPrice.toFixed(3)}</div>

                        <div className={classnames('change', {'positive': sigPrice24HChange > 0, 'negative': sigPrice24HChange < 0})}>
                            {`${priceChangeSymbol}${(this.props.appState.sigPrice24HChange * 100).toFixed(2)}%`}
                        </div>

                        <div className={classnames('error', {'hidden': !errorFetchingSIGPrice})}>Error fetching SIG price</div>
                    </section>

                    <section className={classnames('menu-item', {'active': this.state.section === SECTION_SEND_TX})} onClick={() => this.openSection(SECTION_SEND_TX)}>
                        <IconTransfer className={'icon icon-transfer'} fill={this.state.section === SECTION_SEND_TX ? '#869ff7' : '#2847b5'} />
                        Transfer
                    </section>

                    <section className={classnames('menu-item', {'active': this.state.section === SECTION_TX_HISTORY})} onClick={() => this.openSection(SECTION_TX_HISTORY)}>
                        <IconTxHistory className={'icon icon-tx-history'} fill={this.state.section === SECTION_TX_HISTORY ? '#869ff7' : '#2847b5'} />
                        Transaction history
                    </section>
                </nav>

                <div className="content-area">
                    <div className="address">
                        <h1>Address</h1>
                        <div onClick={this.onClickAddress}>{this.props.appState.wallet.address}</div>
                    </div>

                    {this.state.section === SECTION_SEND_TX &&
                        <SectionSendTx appState={this.props.appState} />
                    }

                    {this.state.section === SECTION_TX_HISTORY &&
                        <SectionTxHistory appState={this.props.appState} />
                    }
                </div>
            </div>
        )
    }

    openSection(section) {
        this.setState({ section })
    }

    onClickAddress() {
        shell.openExternal(`https://etherscan.io/address/${this.props.appState.wallet.address}`)
    }
}

export default PageUnlocked




class IconTransfer extends Component {
    render() {
        return <svg className={this.props.className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 16.95"><defs><style>{`.cls-1{fill: ${this.props.fill};}`}</style></defs><title>transfer</title><g><polygon className="cls-1" points="4.81 7.33 0 12.14 4.81 16.95 4.81 14.41 13.43 14.41 13.43 10.1 4.81 10.1 4.81 7.33"/><polygon className="cls-1" points="23 4.81 18.19 0 18.19 2.66 9.57 2.66 9.57 6.96 18.19 6.96 18.19 9.62 23 4.81"/></g></svg>
    }
}

class IconTxHistory extends Component {
    render() {
        return <svg className={this.props.className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>{`.cls-2{fill: ${this.props.fill};}`}</style></defs><title>tranaction history</title><g><path className="cls-2" d="M19.48,4.93a1,1,0,0,0,.73-.32,1,1,0,1,0-1.41,0A1,1,0,0,0,19.48,4.93Z"/><path className="cls-2" d="M16.57,3.1a1.07,1.07,0,0,0,.46.11,1,1,0,0,0,.46-1.89h0a1,1,0,0,0-.91,1.78Z"/><path className="cls-2" d="M21.62,9.26a1,1,0,0,0,1,.73,1.35,1.35,0,0,0,.28,0A1,1,0,1,0,22.31,8,1,1,0,0,0,21.62,9.26Z"/><path className="cls-2" d="M20.52,6.77h0a1,1,0,0,0,1.37.33,1,1,0,1,0-1.38-.33Z"/><path className="cls-2" d="M14,2.2l.2,0a1,1,0,1,0-.2,0Z"/><path className="cls-2" d="M23,11a1,1,0,0,0-1,1V12A10,10,0,1,1,12,2V1.63A1,1,0,0,0,12.21,1,1,1,0,0,0,12,.44V0c-.27,0-.54,0-.8,0h-.06l-.05,0A12,12,0,0,0,8,.69H8l-.06,0A12.14,12.14,0,0,0,5.12,2.18s0,0-.07,0,0,.06-.07.08A11.87,11.87,0,0,0,2.7,4.43l0,0,0,.06A12.07,12.07,0,0,0,1,7.2l0,0s0,0,0,0a12,12,0,0,0-.84,3.05s0,0,0,.06v.06A13.15,13.15,0,0,0,0,12a11.6,11.6,0,0,0,.12,1.57s0,.06,0,.08a.45.45,0,0,0,0,.11,12.23,12.23,0,0,0,.85,3s0,0,0,0a.43.43,0,0,0,0,.07,11.75,11.75,0,0,0,1.64,2.67s0,0,0,0l0,0A11.78,11.78,0,0,0,5,21.75s0,.05.06.06l.07,0a12.18,12.18,0,0,0,2.78,1.43l.06,0,.07,0a12.32,12.32,0,0,0,3.06.63h.17c.23,0,.46,0,.7,0a12,12,0,0,0,2.41-.24h.07a12,12,0,0,0,2.93-1l.12-.05,0,0a12.14,12.14,0,0,0,2.56-1.82l.06,0,0,0a11.62,11.62,0,0,0,1.94-2.37.4.4,0,0,0,.1-.12.32.32,0,0,0,0-.09,11.82,11.82,0,0,0,1.24-2.84l0-.07s0-.05,0-.08A12,12,0,0,0,24,12h0V12A1,1,0,0,0,23,11Z"/><path className="cls-2" d="M11,7.72v4a.24.24,0,0,0,0,.08,1.08,1.08,0,0,0,0,.19.64.64,0,0,0,.08.19.64.64,0,0,0,0,.07l2.5,4a1,1,0,0,0,.85.47,1,1,0,0,0,.53-.15,1,1,0,0,0,.32-1.38L13,11.44V7.72a1,1,0,1,0-2,0Z"/></g></svg>
    }
}

