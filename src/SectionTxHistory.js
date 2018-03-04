import React, { Component } from 'react'
import { ethers } from './eth'

import TxList from './TxList'

import './SectionTxHistory.css'

class SectionTxHistory extends Component
{
    render() {
        return (
            <div className="SectionTxHistory">
                <h1>Transaction History (outgoing)</h1>

                <div className="scroll-container">
                    <TxList txs={this.props.appState.txlist[ this.props.appState.wallet.address ]} />
                </div>
            </div>
        )
    }
}

export default SectionTxHistory
