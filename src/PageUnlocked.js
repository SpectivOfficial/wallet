import React, { Component } from 'react'
const { dialog } = window.require('electron').remote
const { clipboard, shell } = window.require('electron')
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
            showCopiedMessage: false,
            isRefreshingSIGPrice: false,
        }

        this.openSection = this.openSection.bind(this)
        this.onClickAddress = this.onClickAddress.bind(this)
        this.onClickCopyAddress = this.onClickCopyAddress.bind(this)
        this.onClickSpectivLink = this.onClickSpectivLink.bind(this)
        this.onClickRefreshSIGPrice = this.onClickRefreshSIGPrice.bind(this)
        this.onClickChangeWallet = this.onClickChangeWallet.bind(this)
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

                        <div className="token-name">SIG</div>
                        <div className="large">{amountSIG}</div>

                        <div className="token-name">ETH</div>
                        <div className="large">{amountETH}</div>
                    </section>

                    <section className="sig-price">
                        <header>
                            <label>SIG Price</label>
                            <div onClick={this.onClickRefreshSIGPrice}><IconRefresh className={classnames('icon-refresh', {'spinning': this.state.isRefreshingSIGPrice})} /></div>
                        </header>

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

                    <section className="spacer">
                    </section>

                    <section className="bottom-link">
                        <a onClick={this.onClickSpectivLink}>spectivvr.com</a>
                    </section>
                </nav>

                <div className="content-area">
                    <div className="address-section">
                        <h1>Address</h1>
                        <div className="address-and-copy">
                            <div onClick={this.onClickAddress}>{this.props.appState.wallet.address}</div>
                            <div onClick={this.onClickCopyAddress}>
                                <IconCopy />
                            </div>
                            <div className={classnames('copied-message', {'visible': this.state.showCopiedMessage})}>Copied to clipboard!</div>
                        </div>
                        <a onClick={this.onClickChangeWallet}>Change wallet</a>
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

    onClickCopyAddress() {
        clipboard.writeText(this.props.appState.wallet.address)
        this.setState({ showCopiedMessage: true })
        setTimeout(() => {
            this.setState({ showCopiedMessage: false })
        }, 2500)
    }

    onClickSpectivLink() {
        shell.openExternal(`https://spectivvr.com`)
    }

    async onClickRefreshSIGPrice() {
        this.setState({ isRefreshingSIGPrice: true })
        await window.store.getSIGPrice()
        this.setState({ isRefreshingSIGPrice: false })
    }

    onClickChangeWallet() {
        window.store.changeWallet()
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

class IconCopy extends Component {
    render() {
        return <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" viewBox="20 20 60 60" enableBackground="new 0 0 100 100"><path fill="#ffffff" d="M68.5,28.5h-31c-1.654,0-3,1.346-3,3v4h-4c-1.654,0-3,1.346-3,3v31c0,1.654,1.346,3,3,3h31c1.654,0,3-1.346,3-3v-4h4  c1.654,0,3-1.346,3-3v-31C71.5,29.846,70.154,28.5,68.5,28.5z M62.5,69.5c0,0.552-0.449,1-1,1h-31c-0.551,0-1-0.448-1-1v-31  c0-0.552,0.449-1,1-1h4v25c0,1.654,1.346,3,3,3h25V69.5z M69.5,62.5c0,0.552-0.449,1-1,1h-31c-0.551,0-1-0.448-1-1v-31  c0-0.552,0.449-1,1-1h31c0.551,0,1,0.448,1,1V62.5z"/></svg>
    }
}

class IconRefresh extends Component {
    render() {
        return <svg className={this.props.className} xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" viewBox="0 0 100 100"><g display="none"><polyline display="inline" fillRule="evenodd" clipRule="evenodd" fill="#ffffff" stroke="#ffffff" strokeWidth="10" strokeMiterlimit="10" points="   85.091,11.092 83,35 59.091,32.908  "/><polyline display="inline" fill="#ffffff" stroke="#ffffff" strokeWidth="10" strokeMiterlimit="10" points="40.909,67.092 17,65    14.909,88.908  "/><path display="inline" fill="#ffffff" stroke="#ffffff" strokeWidth="10" strokeMiterlimit="10" d="M15.221,40.681   c3.229-12.003,12.592-22.006,25.462-25.454c16.696-4.474,33.797,3.557,41.361,18.35"/><path display="inline" fill="#ffffff" stroke="#ffffff" strokeWidth="10" strokeMiterlimit="10" d="M84.778,59.32   c-3.228,12.003-12.591,22.005-25.461,25.453c-16.696,4.474-33.797-3.557-41.361-18.35"/></g><g><path d="M20.049,41.979l-9.657-2.598c3.793-14.103,14.904-25.209,28.997-28.985c14.446-3.869,29.647,0.601,39.797,10.827   l0.663-7.579c0.144-1.644,1.606-2.871,3.25-2.727l3.984,0.348c1.644,0.145,2.871,1.606,2.728,3.25l-2.179,24.905   c-0.048,0.548-0.535,0.957-1.083,0.909l-24.905-2.179c-1.644-0.144-2.871-1.606-2.728-3.25l0.349-3.986   c0.144-1.644,1.606-2.87,3.25-2.727l10.369,0.907c-7.658-8.335-19.589-12.073-30.908-9.039   C31.321,22.911,22.918,31.312,20.049,41.979z M58.023,79.943c-11.319,3.035-23.25-0.704-30.908-9.039l10.369,0.907   c1.644,0.144,3.106-1.083,3.25-2.727l0.349-3.986c0.144-1.644-1.083-3.106-2.728-3.25L13.451,59.67   c-0.548-0.048-1.035,0.361-1.083,0.909l-2.179,24.905c-0.144,1.644,1.083,3.105,2.728,3.25l3.984,0.348   c1.644,0.145,3.106-1.083,3.25-2.727l0.666-7.604c7.704,7.768,18.307,12.232,29.296,12.232c3.489,0,7.017-0.448,10.499-1.381   c14.093-3.776,25.204-14.883,28.996-28.984l-9.657-2.598C77.082,68.688,68.68,77.089,58.023,79.943z"/></g><g display="none"><polyline display="inline" fill="#ffffff" stroke="#ffffff" strokeWidth="4" strokeMiterlimit="10" points="84.83,13.08 83,34    62.08,32.17  "/><polyline display="inline" fill="#ffffff" stroke="#ffffff" strokeWidth="4" strokeMiterlimit="10" points="37.92,67.83 17,66    15.17,86.92  "/><path display="inline" fill="#ffffff" stroke="#ffffff" strokeWidth="4" strokeMiterlimit="10" d="M15.221,40.681   c3.229-12.003,12.592-22.006,25.462-25.454c16.696-4.474,33.797,3.557,41.361,18.35"/><path display="inline" fill="#ffffff" stroke="#ffffff" strokeWidth="4" strokeMiterlimit="10" d="M84.778,59.32   c-3.228,12.003-12.591,22.005-25.461,25.453c-16.696,4.474-33.797-3.557-41.361-18.35"/></g><g display="none"><path display="inline" d="M17.152,41.201l-3.862-1.039c3.515-13.07,13.813-23.367,26.875-26.867   c15.69-4.207,32.343,2.209,41.293,15.385l1.38-15.773l3.984,0.348l-2.004,22.914l-22.912-2.006l0.348-3.984l16.345,1.43   C70.712,19.359,55.512,13.326,41.2,17.158C29.513,20.291,20.299,29.504,17.152,41.201z M58.8,82.842   C44.49,86.676,29.289,80.645,21.4,68.393l16.346,1.43l0.348-3.984l-22.912-2.004l-2.004,22.912l3.984,0.348l1.382-15.795   c7.107,10.475,19.067,16.688,31.559,16.688c3.235,0,6.504-0.416,9.732-1.281c13.062-3.498,23.359-13.793,26.874-26.865   l-3.861-1.039C79.701,70.5,70.486,79.711,58.8,82.842z"/></g></svg>
    }
}

