import EventEmitter from 'events'
import { provider, ethers, TOKEN_ADDRESS, TOKEN_ABI } from './eth'
const { app } = window.require('electron').remote
const fs = window.require('fs')
const path = window.require('path')


class Store extends EventEmitter
{
    constructor() {
        super()

        this.state = {
            wallet: null,
            tokenContract: new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider),
            sigBalance: 0,
            ethBalance: 0,
            txlist: {},
            sigPrice: 0.0,
            sigPrice24HChange: 0.0,
            modalDisplayed: null,
            modalParams: {},
        }

        this.getSIGPrice()
        setInterval(() => {
            this.getSIGPrice()
        }, 60000)
    }

    emitState() {
        this.emit('new state', this.state)
    }

    //
    // actions
    //

    setWalletUnlocked(wallet) {
        this.state.wallet = wallet
        this.state.wallet.provider = provider

        this.state.tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet)

        // this.state.txlist[wallet.address] = [
        //     // { timestamp: 1520028166, amount: '12345', currency: 'ETH', txHash: '0xf4894957c3fd0bdd247e08ca35c84966db31144441e7c18848d8957c3b175efc', to: '0x8da766abadd67c838ba31882826f10a30787270a', status: 'pending' },
        //     { timestamp: 1520028166, amount: '12345', currency: 'ETH', txHash: '0xbbe8401a5a04d7b19207ffc6a01284dedfd39a6d2543f7599f519530259bf7ed', to: '0x8da766abadd67c838ba31882826f10a30787270a', status: 'pending' },
        //     { timestamp: 1520028192, amount: '2419', currency: 'ETH', txHash: '0xd2dece8393bcd25f206be857d24ddd228194ed246cac1411edc8bae74e90a525', to: '0xdeadbeef22laksjdfkjxxjdx', status: 'pending' },
        //     { timestamp: 1520028192, amount: '2419', currency: 'ETH', txHash: '0x67496ccd007b561842275defc47708f53d8a6f9ce09a39f30c3670e8759e4758', to: '0xdeadbeef22laksjdfkjxxjdx', status: 'pending' },
        //     { timestamp: 1520028192, amount: '2419', currency: 'ETH', txHash: '0x5d0c488e8e2c7927283d0826e7ec0fea0f840713baf38556f3e7f56a90b465b3', to: '0xdeadbeef22laksjdfkjxxjdx', status: 'pending' },
        //     { timestamp: 1520028192, amount: '2419', currency: 'ETH', txHash: '0xfc3d6d0ecee29e59f796071dc3e0d5a7738012ffbaa68836ec63db28e04d41c8', to: '0xdeadbeef22laksjdfkjxxjdx', status: 'pending' },
        //     { timestamp: 1520028192, amount: '2419', currency: 'ETH', txHash: '0xd46045771872fa78dd09f8aba674ab8c1082362d3784b374976efb0ead89aa8a', to: '0xdeadbeef22laksjdfkjxxjdx', status: 'pending' },
        //     { timestamp: 1520028192, amount: '2419', currency: 'ETH', txHash: '0x76ca9ee96c3eef1f9aa798fee1c654d02c2d4ed4ffb0c3738a2a23f454ed859f', to: '0xdeadbeef22laksjdfkjxxjdx', status: 'pending' },
        // ]

        this.emitState()

        setInterval(() => {
            this.checkPendingTxs()
        }, 5000)

    }

    async updateETHBalance() {
        this.state.ethBalance = await provider.getBalance( this.state.wallet.address )
        this.emitState()
    }

    async updateSIGBalance() {
        this.state.sigBalance = (await this.state.tokenContract.functions.balanceOf( this.state.wallet.address ))[0]
        this.emitState()
    }

    getTxList() {
        let dataPath = app.getPath('userData')
        let txlistPath = path.join(dataPath, 'txs.json')
        console.log('~~>', txlistPath)

        try {
            this.state.txlist = JSON.parse(fs.readFileSync(txlistPath, 'utf8'))
        } catch (err) {
            fs.writeFileSync(txlistPath, JSON.stringify(this.state.txlist))
        }

        this.emitState()
    }

    addTxToList(txHash, amount, currency, to) {
        this.state.txlist[ this.state.wallet.address ] = (this.state.txlist[ this.state.wallet.address ] || []).concat({
            txHash,
            amount: `${amount}`,
            currency,
            to,
            timestamp: Math.floor(new Date().getTime() / 1000),
            status: 'pending',
        })

        this.saveTxList()

        this.emitState()
    }

    saveTxList() {
        let dataPath = app.getPath('userData')
        let txlistPath = path.join(dataPath, 'txs.json')
        try {
            fs.writeFileSync(txlistPath, JSON.stringify(this.state.txlist))
        } catch (err) {
            // @@TODO
        }
    }

    async checkPendingTxs() {
        const txs = this.state.txlist[this.state.wallet.address] || []
        for (let tx of txs) {

            try {
                if (tx.status === 'pending') {
                    let txObj = await provider.getTransaction(tx.txHash); console.log('the tx ~>', txObj)
                    if (txObj === null) {
                        continue
                    }

                    let receipt = await provider.getTransactionReceipt(tx.txHash); console.log('receipt ~>', receipt)
                    if (receipt !== null) {
                        let block = await provider.getBlock(receipt.blockNumber)

                        if (receipt.status === 1) {
                            tx.status = 'succeeded'
                        } else if (receipt.status === 0) {
                            tx.status = 'failed'
                        } else {
                            console.error('unknown tx receipt status.  tx ~>', tx, 'receipt ~>', receipt)
                        }
                        tx.timestamp = block.timestamp
                    }

                    tx.to = txObj.to

                    if (txObj.data === '0x') {
                        tx.currency = 'ETH'
                    } else if (txObj.data.substr(0, 10) === '0xa9059cbb') {
                        tx.currency = 'SIG'
                    } else {
                        throw new Error(`unknown transaction type (tx.data = ${txObj.data})`)
                    }

                    if (tx.currency === 'ETH') {
                        tx.amount = ethers.utils.formatEther(txObj.value)
                    } else {
                        let n = ethers.utils.bigNumberify('0x' + txObj.data.substr(74, 64))
                        tx.amount = ethers.utils.formatEther(n)
                    }
                }
            } catch (err) {
                continue
            }
        }

        this.saveTxList()
        this.emitState()
    }

    async getSIGPrice() {
        let sigResp = await (await fetch('https://api.hitbtc.com/api/2/public/ticker/SIGBTC')).json()
        let btcResp = await (await fetch('https://api.hitbtc.com/api/2/public/ticker/BTCUSD')).json()

        let sigbtcClose = parseFloat(sigResp.last)
        let btcusdClose = parseFloat(btcResp.last)
        let sigPrice = sigbtcClose * btcusdClose

        let sigbtcOpen = parseFloat(sigResp.open)
        let btcusdOpen = parseFloat(btcResp.open)
        let sigPrice24HAgo = sigbtcOpen * btcusdOpen

        this.state.sigPrice24HChange = (sigPrice - sigPrice24HAgo) / sigPrice24HAgo

        this.state.sigPrice = sigPrice

        this.emitState()
    }

    showSendConfirmationModal(amount, currency, recipient, onClickOK) {
        this.state.modalDisplayed = 'send-confirmation'
        this.state.modalParams = { amount, currency, recipient, onClickOK }
        this.emitState()
    }

    showBadAddressModal() {
        this.state.modalDisplayed = 'bad-address'
        this.state.modalParams = {}
        this.emitState()
    }

    showBadValueModal() {
        this.state.modalDisplayed = 'bad-value'
        this.state.modalParams = {}
        this.emitState()
    }

    hideModal() {
        this.state.modalDisplayed = null
        this.emitState()
    }
}

export default Store



