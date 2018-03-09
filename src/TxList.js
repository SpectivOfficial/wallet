import * as _ from 'lodash'
import React, { Component } from 'react'
import classnames from 'classnames'
import * as moment from 'moment'
const shell = window.require('electron').shell

import { ethers } from './eth'
import {
    TX_STATUS_PENDING,
    TX_STATUS_SUCCEEDED,
    TX_STATUS_FAILED,
} from './constants'

import './TxList.css'

class TxList extends Component
{
    constructor(props) {
        super(props)

        this.expandTx = this.expandTx.bind(this)
        this.onClickViewOnEtherscan = this.onClickViewOnEtherscan.bind(this)

        this.state = {
            expandedTx: null,
        }
    }

    render() {
        let txs = _.reverse( _.sortBy(this.props.txs, 'timestamp') )

        if (this.props.limit !== undefined) {
            txs = _.take(txs, this.props.limit)
        }

        return (
            <ul className="tx-list">
                {txs.map((tx, i) => {
                    let date = moment.unix(tx.timestamp)

                    return (
                        <li key={tx.txHash} onClick={() => this.expandTx(i)} className={classnames({ 'expanded': this.state.expandedTx === i })}>
                            <div className="summary">
                                <div className="date">{date.format('ll')}</div>
                                <div className="spacer"></div>
                                <div className="status">
                                    {tx.status === TX_STATUS_FAILED  && <span className="failed">(failed)</span>}
                                    {tx.status === TX_STATUS_PENDING && <span className="pending">(pending)</span>}
                                </div>
                                <div className="amount">{tx.amount} {tx.token}</div>
                                <div className="expander">
                                    {this.state.expandedTx === i && <Minus />}
                                    {this.state.expandedTx !== i && <Plus />}
                                </div>
                            </div>

                            <div className="full">
                                <div className="field tx-hash">
                                    <label>Transaction ID</label>
                                    <a onClick={(evt) => this.onClickViewOnEtherscan(evt, tx.txHash)}>{tx.txHash}</a>
                                </div>
                                <div className="field recipient">
                                    <label>Recipient</label>
                                    <div>{tx.to}</div>
                                </div>
                                <div className="field date">
                                    <label>Date</label>
                                    <div>{date.format('LLL')}</div>
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        )
    }

    onClickViewOnEtherscan(evt, txHash) {
        evt.preventDefault()
        evt.stopPropagation()

        shell.openExternal(`https://etherscan.io/tx/${txHash}`)
    }

    expandTx(expandedTx) {
        if (this.state.expandedTx === expandedTx) {
            this.setState({ expandedTx: null })
        } else {
            this.setState({ expandedTx })
        }
    }
}

export default TxList




class Plus extends Component {
    render() {
        return <svg style={{width: 14}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" version="1.1" x="0px" y="0px"><g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"><g transform="translate(-1264.000000, -548.000000)" fill="#ffffff"><path d="M1373.9997,560.580089 C1387.15701,560.580089 1399.91386,563.154215 1411.91649,568.23088 C1423.51567,573.136815 1433.9353,580.162795 1442.88636,589.113528 C1451.83712,598.064561 1458.86342,608.48447 1463.76936,620.083611 C1468.84604,632.085915 1471.41988,644.843024 1471.41988,658.0003 C1471.41988,671.157276 1468.84604,683.914085 1463.76966,695.916389 C1458.86342,707.51553 1451.83712,717.935439 1442.88636,726.886472 C1433.9353,735.837504 1423.51567,742.863484 1411.91649,747.769419 C1399.91416,752.846384 1387.15761,755.42021 1374,755.419911 C1360.84389,755.419911 1348.08764,752.846085 1336.0856,747.76882 C1324.48643,742.862586 1314.0662,735.836306 1305.11514,726.884974 C1296.16348,717.933641 1289.13718,707.513733 1284.23094,695.914292 C1279.15396,683.912288 1276.57982,671.156078 1276.58012,657.999401 C1276.58012,644.842425 1279.15396,632.085615 1284.23064,620.083312 C1289.13658,608.48417 1296.16258,598.064262 1305.11364,589.113528 C1314.0647,580.162795 1324.48433,573.136516 1336.08351,568.230581 C1348.08584,563.153915 1360.84239,560.580089 1373.9997,560.580089 Z M1367,665 L1367,708.721173 C1367,712.18888 1369.91014,715 1373.5,715 C1377.08986,715 1380,712.18888 1380,708.721173 L1380,665 L1424.72119,665 C1428.18859,665 1431,662.089548 1431,658.5 C1431,654.909833 1428.18859,652 1424.72119,652 L1380,652 L1380,606.278827 C1380,602.81112 1377.08986,600 1373.5,600 C1369.91014,600 1367,602.81112 1367,606.278827 L1367,652 L1322.27881,652 C1318.81111,652 1316,654.909833 1316,658.5 C1316,662.089548 1318.81111,665 1322.27881,665 L1367,665 Z M1373.9997,548 C1313.24879,548 1263.9997,597.248653 1264,657.999401 C1263.9997,718.748052 1313.25298,768 1374,768 C1374.00359,768 1373.997,768 1374.0006,768 C1434.75091,768.0003 1484.0006,718.751048 1484,658.0003 C1484.0003,597.248653 1434.75151,548 1373.9997,548"></path></g></g></svg>
    }
}

class Minus extends Component {
    render() {
        return <svg style={{width: 14}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" version="1.1" x="0px" y="0px"><g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd"><g transform="translate(-903.000000, -548.000000)" fill="#ffffff"><path d="M1123,658.00015 C1123,597.24842 1073.75158,548 1012.99955,548 C952.24872,547.9997 902.9997,597.24842 903,657.999551 C902.999401,718.747985 952.252614,768 1012.99985,768 C1013.00344,768 1012.99685,768 1013.00045,768 C1073.75068,768.000599 1123.0003,718.750981 1123,658.00015 Z M1073.71832,652 L953.281684,652 C949.8124,652 947,654.910452 947,658.5 C947,662.089857 949.8124,665 953.281684,665 L1073.71832,665 C1077.1876,665 1080,662.089857 1080,658.5 C1080,654.910452 1077.1876,652 1073.71832,652 Z M1050.91629,747.769392 C1038.91427,752.846064 1026.15744,755.420193 1012.99985,755.419894 C999.843755,755.419894 987.087527,752.846064 975.085207,747.769092 C963.486349,742.862551 953.066127,735.836263 944.115082,726.884918 C935.163737,717.933573 928.137149,707.51395 923.230908,695.914493 C918.153936,683.912173 915.579807,671.155946 915.580106,657.999551 C915.580106,644.842257 918.153936,632.08573 923.230608,620.08311 C928.13655,608.484252 935.162539,598.06433 944.113584,589.113285 C953.06463,580.16224 963.484252,573.13625 975.08341,568.230608 C987.08573,563.153936 999.842557,560.580106 1012.99955,560.580106 C1026.15684,560.580106 1038.91367,563.153936 1050.91629,568.230608 C1062.51545,573.13655 1072.93537,580.162539 1081.88612,589.113584 C1090.83716,598.06463 1097.86315,608.484552 1102.76939,620.08341 C1107.84576,632.086029 1110.41989,644.842856 1110.41989,658.00015 C1110.41989,671.157144 1107.84576,683.913971 1102.76939,695.916291 C1097.86315,707.515748 1090.83716,717.93567 1081.88612,726.886416 C1072.93537,735.837461 1062.51545,742.86345 1050.91629,747.769392 L1050.91629,747.769392 Z"></path></g></g></svg>
    }
}